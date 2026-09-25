"""
ByteTrack-Lite Multi-Object Tracker
Fast, low-latency tracking tailored for Raspberry Pi 5 CPU
"""

import time
from typing import List, Dict, Optional
import numpy as np

from roadguard.types import Detection, TrackedObject, BoundingBox
from roadguard.config import TrackingConfig


def compute_iou(boxA: BoundingBox, boxB: BoundingBox) -> float:
    """Computes Intersection over Union between two BoundingBoxes."""
    xA = max(boxA.xmin, boxB.xmin)
    yA = max(boxA.ymin, boxB.ymin)
    xB = min(boxA.xmax, boxB.xmax)
    yB = min(boxA.ymax, boxB.ymax)

    inter_w = max(0.0, xB - xA)
    inter_h = max(0.0, yB - yA)
    inter_area = inter_w * inter_h

    areaA = boxA.area
    areaB = boxB.area
    union_area = areaA + areaB - inter_area

    if union_area <= 0.0:
        return 0.0
    return inter_area / union_area


class ObjectTracker:
    """Pi-friendly IoU and spatial velocity multi-object tracker."""

    def __init__(self, config: TrackingConfig):
        self.config = config
        self.next_id = 1
        self.tracks: Dict[int, TrackedObject] = {}
        self.last_update_time = time.time()

    def update(self, detections: List[Detection]) -> List[Detection]:
        """Matches incoming detections to active tracks and assigns track IDs."""
        now = time.time()
        matched_det_indices = set()
        matched_track_ids = set()

        # Build association matrix
        active_ids = list(self.tracks.keys())
        updated_detections: List[Detection] = []

        if active_ids and detections:
            iou_matrix = np.zeros((len(active_ids), len(detections)), dtype=np.float32)
            for i, tid in enumerate(active_ids):
                track = self.tracks[tid]
                for j, det in enumerate(detections):
                    # Same label match preferred
                    iou = compute_iou(track.bbox, det.bbox)
                    if track.label == det.label:
                        iou_matrix[i, j] = iou
                    else:
                        iou_matrix[i, j] = iou * 0.5  # Soft penalty for label swap

            # Greedy IoU matching
            while True:
                max_val = np.max(iou_matrix) if iou_matrix.size > 0 else 0
                if max_val < self.config.match_thresh:
                    break
                i, j = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                tid = active_ids[i]

                # Update track state
                track = self.tracks[tid]
                det = detections[j]

                # Velocity approximation (pixels or meters per sec)
                dt = max(0.001, now - track.last_seen)
                prev_dist = track.approx_distance_m or 0.0
                curr_dist = det.approx_distance_m or prev_dist
                track.velocity_mps = (curr_dist - prev_dist) / dt if prev_dist > 0 and curr_dist > 0 else 0.0

                track.bbox = det.bbox
                track.confidence = det.confidence
                track.last_seen = now
                track.frames_tracked += 1
                track.approx_distance_m = det.approx_distance_m
                if track.frames_tracked >= 2:
                    track.confirmed = True

                det.track_id = tid
                matched_det_indices.add(j)
                matched_track_ids.add(tid)

                iou_matrix[i, :] = -1
                iou_matrix[:, j] = -1

        # Spawn new tracks for unmatched detections
        for j, det in enumerate(detections):
            if j not in matched_det_indices:
                tid = self.next_id
                self.next_id += 1
                det.track_id = tid
                self.tracks[tid] = TrackedObject(
                    track_id=tid,
                    label=det.label,
                    bbox=det.bbox,
                    confidence=det.confidence,
                    first_seen=now,
                    last_seen=now,
                    frames_tracked=1,
                    approx_distance_m=det.approx_distance_m,
                    confirmed=False
                )

        # Prune expired tracks
        expired_ids = []
        max_age_seconds = self.config.track_buffer / 10.0  # e.g. 30 frames at 10fps = 3.0s
        for tid, track in self.tracks.items():
            if now - track.last_seen > max_age_seconds:
                expired_ids.append(tid)

        for tid in expired_ids:
            del self.tracks[tid]

        self.last_update_time = now
        return detections

    def get_track(self, track_id: int) -> Optional[TrackedObject]:
        return self.tracks.get(track_id)


def create_tracker(config: TrackingConfig) -> ObjectTracker:
    return ObjectTracker(config)

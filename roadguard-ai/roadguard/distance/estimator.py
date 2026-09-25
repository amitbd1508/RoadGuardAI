"""
Monocular Perspective Geometry Distance Estimator
Calibrated for 2024 Toyota RAV4 XSE Windshield Mount Geometry
"""

import math
from typing import Optional, List
from roadguard.types import Detection, BoundingBox
from roadguard.config import CalibrationConfig, DistanceConfig

# Real-world physical reference heights/widths (meters) for known classes
OBJECT_PRIOR_HEIGHTS = {
    "car": 1.45,
    "suv": 1.70,
    "truck": 3.20,
    "bus": 3.40,
    "motorcycle": 1.30,
    "bicycle": 1.20,
    "pedestrian": 1.72,
    "deer": 1.30,
    "elk": 1.65,
    "moose": 2.10,
    "bear": 1.20,
    "cone": 0.75,
    "barrier": 0.85,
    "traffic_sign": 0.75,
    "pothole": 0.15,
    "speed_bump": 0.10,
    "rock": 0.35,
    "debris": 0.30
}


class DistanceEstimator:
    """Estimates distance using camera mounting height, pitch, and pinhole optics."""

    def __init__(self, calib: CalibrationConfig, config: DistanceConfig):
        self.calib = calib
        self.config = config
        self.h_cam = calib.camera_height_meters  # ~1.35m in RAV4 windshield
        self.pitch_rad = math.radians(calib.camera_pitch_degrees)  # e.g. -2.5 deg tilt
        self.focal_px = calib.focal_length_px

    def estimate_distance(self, bbox: BoundingBox, label: str, frame_h: int = 720) -> float:
        """Computes approximate distance in meters using ground-plane pinhole geometry."""
        # 1. Road-plane intersection via bottom edge of bounding box (contact point with road)
        y_bottom = bbox.ymax
        y_center = frame_h / 2.0
        delta_y = y_bottom - y_center

        # Angle below horizon: theta = pitch + arctan(delta_y / focal_px)
        if delta_y > 10.0:
            alpha = math.atan2(delta_y, self.focal_px)
            effective_angle = alpha + self.pitch_rad
            if effective_angle > 0.02:
                dist_ground = self.h_cam / math.tan(effective_angle)
            else:
                dist_ground = 120.0
        else:
            dist_ground = 120.0

        # 2. Prior object size projection
        prior_h = OBJECT_PRIOR_HEIGHTS.get(label.lower(), 1.5)
        box_h_px = max(1.0, bbox.height)
        dist_size = (prior_h * self.focal_px) / box_h_px

        # Fuse ground plane (best for near objects) with size prior (best for distant objects)
        if dist_ground < 35.0:
            dist = (dist_ground * 0.7) + (dist_size * 0.3)
        else:
            dist = (dist_ground * 0.3) + (dist_size * 0.7)

        # Clamp to realistic automotive perception envelope (3m to 150m)
        clamped_dist = max(3.0, min(150.0, dist))
        return round(clamped_dist, 1)

    def process_detections(self, detections: List[Detection], frame_h: int = 720):
        """Attaches approximate distance in-place to all detections."""
        for det in detections:
            det.approx_distance_m = self.estimate_distance(det.bbox, det.label, frame_h)


def create_distance_estimator(calib: CalibrationConfig, config: DistanceConfig) -> DistanceEstimator:
    return DistanceEstimator(calib, config)

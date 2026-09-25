"""
YOLO / ONNX Runtime Multi-Class Object Detector
Optimized for Raspberry Pi 5 Quad-Core ARM Cortex-A76 with ARM NEON Acceleration
"""

import time
import os
import logging
from typing import List, Optional, Tuple, Dict, Any
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import onnxruntime as ort
except ImportError:
    ort = None

from roadguard.types import Detection, BoundingBox, HazardCategory
from roadguard.config import AppConfig

logger = logging.getLogger("roadguard.detector")

# Comprehensive RoadGuard Class Map
ROADGUARD_CLASSES = [
    "car", "suv", "truck", "bus", "motorcycle", "bicycle", "pedestrian",
    "deer", "elk", "moose", "bear", "dog", "cattle",
    "pothole", "speed_bump", "debris", "rock", "cone", "barrier",
    "traffic_sign"
]

CATEGORY_MAPPING = {
    "car": HazardCategory.VEHICLE,
    "suv": HazardCategory.VEHICLE,
    "truck": HazardCategory.VEHICLE,
    "bus": HazardCategory.VEHICLE,
    "motorcycle": HazardCategory.VEHICLE,
    "bicycle": HazardCategory.VEHICLE,
    "pedestrian": HazardCategory.VEHICLE,
    "deer": HazardCategory.WILDLIFE,
    "elk": HazardCategory.WILDLIFE,
    "moose": HazardCategory.WILDLIFE,
    "bear": HazardCategory.WILDLIFE,
    "dog": HazardCategory.WILDLIFE,
    "cattle": HazardCategory.WILDLIFE,
    "pothole": HazardCategory.ROAD_HAZARD,
    "speed_bump": HazardCategory.ROAD_HAZARD,
    "debris": HazardCategory.ROAD_HAZARD,
    "rock": HazardCategory.ROAD_HAZARD,
    "cone": HazardCategory.ROAD_HAZARD,
    "barrier": HazardCategory.ROAD_HAZARD,
    "traffic_sign": HazardCategory.TRAFFIC_SIGN
}


class ObjectDetector:
    """ONNX-powered multi-class detector with performance/accuracy modes."""

    def __init__(self, config: AppConfig):
        self.config = config
        self.model_path = config.models.detection_model_path
        self.conf_threshold = config.detection.confidence_threshold
        self.iou_threshold = config.detection.iou_threshold
        self.classes = ROADGUARD_CLASSES
        self.session = None
        self.input_name = None
        self.output_names = []
        self.input_shape = (640, 640)
        self.is_synthetic_mode = False
        self._load_model()

    def _load_model(self):
        """Loads ONNX Runtime session with ARM NEON CPU provider."""
        if ort is None or not os.path.exists(self.model_path) or os.path.getsize(self.model_path) < 20000:
            logger.warning(f"Detection model at {self.model_path} unavailable or placeholder. Initializing synthetic detector for testing.")
            self.is_synthetic_mode = True
            return

        try:
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = self.config.inference.num_threads
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

            providers = ["CPUExecutionProvider"]
            self.session = ort.InferenceSession(self.model_path, opts, providers=providers)
            self.input_name = self.session.get_inputs()[0].name
            self.output_names = [out.name for out in self.session.get_outputs()]
            logger.info(f"Loaded ONNX model {self.model_path} with CPU ARM NEON execution.")
        except Exception as e:
            logger.error(f"Failed to load ONNX model: {e}. Defaulting to synthetic engine.")
            self.is_synthetic_mode = True

    def detect(self, frame: np.ndarray) -> List[Detection]:
        """Runs inference on a single BGR frame."""
        if self.is_synthetic_mode:
            return self._run_synthetic_detection(frame)

        if frame is None or self.session is None or cv2 is None:
            return []

        h_orig, w_orig = frame.shape[:2]

        # 1. Letterbox resize
        img_prep, ratio, (pad_w, pad_h) = self._preprocess_letterbox(frame, self.input_shape)

        # 2. Format to (1, 3, 640, 640) float32 [0.0, 1.0]
        blob = img_prep[:, :, ::-1].transpose(2, 0, 1)  # BGR to RGB, HWC to CHW
        blob = np.ascontiguousarray(blob, dtype=np.float32) / 255.0
        blob = np.expand_dims(blob, axis=0)

        # 3. ONNX inference
        outputs = self.session.run(self.output_names, {self.input_name: blob})
        raw_preds = outputs[0]  # Shape: (1, num_classes + 4, num_boxes) or (1, num_boxes, num_classes + 4)

        if raw_preds.ndim == 3 and raw_preds.shape[1] > raw_preds.shape[2]:
            raw_preds = np.transpose(raw_preds, (0, 2, 1))

        # 4. Parse detections & NMS
        detections = self._postprocess(raw_preds[0], ratio, (pad_w, pad_h), (w_orig, h_orig))
        return detections

    def _preprocess_letterbox(self, img: np.ndarray, target_size=(640, 640)):
        """Scales image keeping aspect ratio with padding."""
        h, w = img.shape[:2]
        target_w, target_h = target_size
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        pad_w = (target_w - new_w) / 2.0
        pad_h = (target_h - new_h) / 2.0

        top = int(round(pad_h - 0.1))
        bottom = int(round(pad_h + 0.1))
        left = int(round(pad_w - 0.1))
        right = int(round(pad_w + 0.1))

        padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
        return padded, scale, (pad_w, pad_h)

    def _postprocess(self, preds: np.ndarray, scale: float, pad: Tuple[float, float], orig_dims: Tuple[int, int]) -> List[Detection]:
        """Extracts boxes, scores, and performs Non-Maximum Suppression."""
        boxes = []
        confidences = []
        class_ids = []

        w_orig, h_orig = orig_dims
        pad_w, pad_h = pad

        # YOLOv8 format: each row is [cx, cy, w, h, score0, score1, ...]
        for row in preds:
            cx, cy, bw, bh = row[0:4]
            scores = row[4:]
            max_idx = np.argmax(scores)
            max_score = float(scores[max_idx])

            if max_score >= self.conf_threshold:
                # Convert center xy to corner xy and undo letterbox
                x1 = ((cx - bw / 2.0) - pad_w) / scale
                y1 = ((cy - bh / 2.0) - pad_h) / scale
                x2 = ((cx + bw / 2.0) - pad_w) / scale
                y2 = ((cy + bh / 2.0) - pad_h) / scale

                # Clamp to frame boundary
                x1 = max(0.0, min(float(w_orig), x1))
                y1 = max(0.0, min(float(h_orig), y1))
                x2 = max(0.0, min(float(w_orig), x2))
                y2 = max(0.0, min(float(h_orig), y2))

                boxes.append([int(x1), int(y1), int(x2 - x1), int(y2 - y1)])
                confidences.append(max_score)
                class_ids.append(int(max_idx))

        if not boxes or cv2 is None:
            return []

        indices = cv2.dnn.NMSBoxes(boxes, confidences, self.conf_threshold, self.iou_threshold)
        detections: List[Detection] = []

        if len(indices) > 0:
            for idx in indices.flatten():
                x, y, w, h = boxes[idx]
                score = confidences[idx]
                cid = class_ids[idx]
                label = self.classes[cid] if cid < len(self.classes) else "hazard"
                cat = CATEGORY_MAPPING.get(label, HazardCategory.ROAD_HAZARD)

                det = Detection(
                    label=label,
                    confidence=score,
                    bbox=BoundingBox(xmin=float(x), ymin=float(y), xmax=float(x + w), ymax=float(y + h)),
                    hazard_category=cat,
                    timestamp=time.time()
                )
                detections.append(det)

        return detections

    def _run_synthetic_detection(self, frame: np.ndarray) -> List[Detection]:
        """Realistic time-modulated simulated detections for desk testing and Colorado demo."""
        if frame is None:
            return []
        h, w = frame.shape[:2]
        now = time.time()
        dets = []

        # Cyclic scenario timeline (every 24 seconds repeats)
        t = int(now) % 24

        # Scenario 1: Preceding vehicle ahead on Colorado highway
        car_y1 = int(h * 0.50)
        car_y2 = int(h * 0.68)
        car_x1 = int(w * 0.44)
        car_x2 = int(w * 0.58)
        dets.append(Detection(
            label="suv",
            confidence=0.91,
            bbox=BoundingBox(xmin=car_x1, ymin=car_y1, xmax=car_x2, ymax=car_y2),
            hazard_category=HazardCategory.VEHICLE,
            approx_distance_m=28.0,
            timestamp=now
        ))

        # Scenario 2: Seconds 4-10: Speed limit 45 sign
        if 4 <= t <= 12:
            sign_y1 = int(h * 0.28)
            sign_y2 = int(h * 0.42)
            sign_x1 = int(w * 0.78)
            sign_x2 = int(w * 0.88)
            dets.append(Detection(
                label="traffic_sign",
                confidence=0.94,
                bbox=BoundingBox(xmin=sign_x1, ymin=sign_y1, xmax=sign_x2, ymax=sign_y2),
                hazard_category=HazardCategory.SPEED_LIMIT,
                approx_distance_m=35.0,
                timestamp=now,
                metadata={"sign_type": "speed_limit", "speed_value": 45}
            ))

        # Scenario 3: Seconds 11-18: Wildlife (Mule Deer / Elk) near roadside
        if 11 <= t <= 19:
            deer_y1 = int(h * 0.48)
            deer_y2 = int(h * 0.65)
            deer_x1 = int(w * 0.18)
            deer_x2 = int(w * 0.32)
            dets.append(Detection(
                label="deer",
                confidence=0.88,
                bbox=BoundingBox(xmin=deer_x1, ymin=deer_y1, xmax=deer_x2, ymax=deer_y2),
                hazard_category=HazardCategory.WILDLIFE,
                approx_distance_m=38.0,
                timestamp=now
            ))

        # Scenario 4: Seconds 17-23: Road pothole / frost heave in right track
        if 17 <= t <= 23:
            pot_y1 = int(h * 0.72)
            pot_y2 = int(h * 0.82)
            pot_x1 = int(w * 0.46)
            pot_x2 = int(w * 0.58)
            dets.append(Detection(
                label="pothole",
                confidence=0.82,
                bbox=BoundingBox(xmin=pot_y1, ymin=pot_y1, xmax=pot_x2, ymax=pot_y2),
                hazard_category=HazardCategory.ROAD_HAZARD,
                approx_distance_m=18.0,
                timestamp=now
            ))

        return dets


def create_detector(config: AppConfig) -> ObjectDetector:
    return ObjectDetector(config)

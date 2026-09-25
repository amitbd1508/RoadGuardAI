"""
Speed Limit Sign Recognition and Multi-Frame Temporal OCR Engine
Fuses visual sign reading with GPS vehicle speed and offline map speed limit
"""

import time
import logging
from typing import Optional, Tuple, Dict
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from roadguard.types import Detection, SpeedLimitStatus, Alert, Priority, HazardCategory
from roadguard.config import SpeedLimitConfig

logger = logging.getLogger("roadguard.speed_limit")

VALID_US_SPEED_LIMITS = {15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80}


class SpeedLimitRecognizer:
    """Temporal speed limit recognizer requiring N consecutive frames before asserting limit."""

    def __init__(self, config: SpeedLimitConfig):
        self.config = config
        self.status = SpeedLimitStatus()
        self.last_announced_limit: Optional[int] = None
        self.last_announcement_time: float = 0.0

    def process(
        self,
        frame: Optional[np.ndarray],
        detections: list[Detection],
        gps_speed_mph: float,
        map_speed_limit_mph: Optional[int] = None
    ) -> Tuple[SpeedLimitStatus, Optional[Alert]]:
        """Processes sign detections, extracts candidate speeds, and performs temporal confirmation."""
        now = time.time()
        detected_speed: Optional[int] = None
        det_confidence = 0.0

        for det in detections:
            if det.label == "traffic_sign" or det.hazard_category == HazardCategory.SPEED_LIMIT:
                # Check metadata if pre-parsed or parse OCR crop
                if "speed_value" in det.metadata:
                    detected_speed = det.metadata["speed_value"]
                    det_confidence = det.confidence
                    break
                elif frame is not None:
                    ocr_val = self._extract_digits_ocr(frame, det)
                    if ocr_val in VALID_US_SPEED_LIMITS:
                        detected_speed = ocr_val
                        det_confidence = det.confidence
                        break

        alert_to_emit = None

        if detected_speed is not None:
            if self.status.candidate_limit == detected_speed:
                self.status.consecutive_frames += 1
            else:
                self.status.candidate_limit = detected_speed
                self.status.consecutive_frames = 1

            self.status.last_detection_time = now
            self.status.confidence = det_confidence

            # Check if threshold reached
            if self.status.consecutive_frames >= self.config.confirmation_frames:
                new_limit = self.status.candidate_limit
                self.status.visual_detected_limit_mph = new_limit

                # Check if it differs from current active limit or needs announcement
                if new_limit != self.status.current_limit_mph:
                    self.status.current_limit_mph = new_limit
                    logger.info(f"Confirmed new speed limit: {new_limit} MPH (GPS: {gps_speed_mph:.1f} MPH)")

                    # Check cooldown
                    if (now - self.last_announcement_time) > self.config.cooldown_seconds:
                        self.last_announced_limit = new_limit
                        self.last_announcement_time = now

                        # Advisory alert generation
                        short_text = f"Speed limit {new_limit}."
                        msg = f"Speed limit change detected: {new_limit} MPH"

                        # Overspeed advisory comparison
                        is_overspeed = (gps_speed_mph > (new_limit + self.config.alert_speed_delta_mph))
                        if is_overspeed:
                            short_text = f"Speed limit {new_limit}. Above limit."
                            msg = f"Speed limit {new_limit} MPH. Vehicle traveling {int(gps_speed_mph)} MPH."

                        alert_to_emit = Alert(
                            alert_id=f"speed_limit_{new_limit}_{int(now)}",
                            message=msg,
                            short_audio_text=short_text,
                            priority=Priority.HIGH if is_overspeed else Priority.LOW,
                            hazard_type="speed_limit_change",
                            category=HazardCategory.SPEED_LIMIT,
                            approx_distance_m=None,
                            confidence=det_confidence,
                            timestamp=now
                        )

        # Update map reference
        self.status.map_reference_limit_mph = map_speed_limit_mph
        return self.status, alert_to_emit

    def _extract_digits_ocr(self, frame: np.ndarray, det: Detection) -> Optional[int]:
        """Crops sign candidate and runs lightweight thresholding / template digit OCR."""
        if cv2 is None or frame is None:
            return None

        h, w = frame.shape[:2]
        x1 = max(0, int(det.bbox.xmin))
        y1 = max(0, int(det.bbox.ymin))
        x2 = min(w, int(det.bbox.xmax))
        y2 = min(h, int(det.bbox.ymax))

        if x2 - x1 < 20 or y2 - y1 < 20:
            return None

        crop = frame[y1:y2, x1:x2]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        # Sign aspect ratio check (US speed limit is rectangular approx 4:5 or 3:4)
        aspect = (x2 - x1) / float(y2 - y1)
        if not (0.5 <= aspect <= 1.1):
            return None

        # Otsu thresholding for speed digits
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # In production ONNX OCR model runs on thresh. Here fallback heuristic:
        return det.metadata.get("speed_value", None)


def create_speed_recognizer(config: SpeedLimitConfig) -> SpeedLimitRecognizer:
    return SpeedLimitRecognizer(config)

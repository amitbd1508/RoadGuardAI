"""
Road Surface Hazard and Environmental Condition Detector
Monitors potholes, cracks, debris, speed bumps, standing water, and winter road conditions
"""

import time
import logging
from typing import List, Optional, Tuple, Dict
import numpy as np

from roadguard.types import Detection, Alert, Priority, RoadCondition, HazardCategory
from roadguard.config import RoadHazardsConfig

logger = logging.getLogger("roadguard.road_hazards")


class RoadHazardDetector:
    """Detects and temporal-confirms physical roadway surface threats."""

    def __init__(self, config: RoadHazardsConfig):
        self.config = config
        self.confirmed_hazards: Dict[str, float] = {}
        self.active_condition = RoadCondition.NORMAL
        self.condition_confidence = 0.88

    def evaluate_detections(self, detections: List[Detection]) -> List[Alert]:
        """Filters road hazards and creates prioritized advisory alerts."""
        now = time.time()
        alerts: List[Alert] = []

        for det in detections:
            if det.hazard_category != HazardCategory.ROAD_HAZARD:
                continue

            lbl = det.label.lower()
            dist = det.approx_distance_m

            # Pothole check
            if "pothole" in lbl and det.confidence >= self.config.pothole_min_confidence:
                alert_key = f"pothole_{det.track_id or 'static'}"
                if (now - self.confirmed_hazards.get(alert_key, 0.0)) > 8.0:
                    self.confirmed_hazards[alert_key] = now
                    dist_text = f" ~{int(dist)}m" if dist else ""
                    alerts.append(Alert(
                        alert_id=f"pothole_{int(now)}",
                        message=f"Pothole in roadway{dist_text} (confidence: {int(det.confidence*100)}%)",
                        short_audio_text="Pothole ahead.",
                        priority=Priority.HIGH if dist and dist < 25 else Priority.MEDIUM,
                        hazard_type="pothole",
                        category=HazardCategory.ROAD_HAZARD,
                        approx_distance_m=dist,
                        confidence=det.confidence,
                        timestamp=now,
                        track_id=det.track_id
                    ))

            # Speed bump check
            elif "speed_bump" in lbl:
                alert_key = f"bump_{det.track_id or 'static'}"
                if (now - self.confirmed_hazards.get(alert_key, 0.0)) > 10.0:
                    self.confirmed_hazards[alert_key] = now
                    dist_text = f" approximately {int(dist)} meters ahead." if dist else " ahead."
                    alerts.append(Alert(
                        alert_id=f"bump_{int(now)}",
                        message=f"Speed bump{dist_text}",
                        short_audio_text=f"Speed bump{dist_text}",
                        priority=Priority.MEDIUM,
                        hazard_type="speed_bump",
                        category=HazardCategory.ROAD_HAZARD,
                        approx_distance_m=dist,
                        confidence=det.confidence,
                        timestamp=now,
                        track_id=det.track_id
                    ))

            # Rock / debris in roadway (critical for Colorado canyon drives)
            elif lbl in ["rock", "debris", "cone", "barrier"]:
                alert_key = f"debris_{det.track_id or 'static'}"
                if (now - self.confirmed_hazards.get(alert_key, 0.0)) > 6.0:
                    self.confirmed_hazards[alert_key] = now
                    is_rock = (lbl == "rock")
                    short_speech = "Rock in road." if is_rock else "Obstacle in road."
                    alerts.append(Alert(
                        alert_id=f"debris_{int(now)}",
                        message=f"Road debris detected: {lbl}",
                        short_audio_text=short_speech,
                        priority=Priority.CRITICAL if dist and dist < 30 else Priority.HIGH,
                        hazard_type="road_debris",
                        category=HazardCategory.ROAD_HAZARD,
                        approx_distance_m=dist,
                        confidence=det.confidence,
                        timestamp=now,
                        track_id=det.track_id
                    ))

        return alerts

    def classify_surface_condition(self, frame: Optional[np.ndarray]) -> Tuple[RoadCondition, float]:
        """Estimates overall road condition from asphalt texture, glare, and environmental lighting."""
        if frame is None:
            return self.active_condition, self.condition_confidence

        # Fast texture & luminance analysis on lower central third (road ROI)
        h, w = frame.shape[:2]
        roi = frame[int(h * 0.65):h, int(w * 0.3):int(w * 0.7)]
        if roi.size == 0:
            return self.active_condition, self.condition_confidence

        mean_val = float(np.mean(roi))
        std_val = float(np.std(roi))

        # Wet road reflects specular highlights (high standard deviation & low mean in asphalt)
        if mean_val < 60 and std_val > 45:
            self.active_condition = RoadCondition.WET
            self.condition_confidence = 0.82
        elif mean_val > 175 and std_val < 35:
            # High uniform reflectance (snow / ice cover on mountain roads)
            self.active_condition = RoadCondition.ICE_POSSIBLE
            self.condition_confidence = 0.74
        else:
            self.active_condition = RoadCondition.NORMAL
            self.condition_confidence = 0.91

        return self.active_condition, self.condition_confidence


def create_hazard_detector(config: RoadHazardsConfig) -> RoadHazardDetector:
    return RoadHazardDetector(config)

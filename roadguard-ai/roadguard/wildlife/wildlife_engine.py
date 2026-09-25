"""
High-Altitude Wildlife Awareness Engine
Specialized for Colorado mountain passes: Mule Deer, Rocky Mountain Elk, Shiras Moose, and Black Bear
"""

import time
import logging
from typing import List, Optional, Dict
from roadguard.types import Detection, Alert, Priority, HazardCategory
from roadguard.config import WildlifeConfig

logger = logging.getLogger("roadguard.wildlife")

WILDLIFE_SPECIES = {"deer", "elk", "moose", "bear", "cattle", "dog"}


class WildlifeEngine:
    """Monitors animal presence, zone trajectory (roadside vs in-lane), and triggers warnings."""

    def __init__(self, config: WildlifeConfig):
        self.config = config
        self.history: Dict[int, Dict] = {}  # track_id -> metadata
        self.last_alert_time: float = 0.0
        self.cooldown_seconds = 7.0

    def evaluate(self, detections: List[Detection], frame_width: int = 1280) -> List[Alert]:
        """Classifies wildlife position and issues high-priority advisory warnings."""
        now = time.time()
        alerts: List[Alert] = []

        for det in detections:
            if det.label.lower() not in WILDLIFE_SPECIES:
                continue

            species = det.label.capitalize()
            dist = det.approx_distance_m or 40.0
            cx, cy = det.bbox.center

            # Lateral position check
            # Central corridor (35% to 65% of screen width) is directly in-lane
            in_roadway = (0.35 * frame_width <= cx <= 0.65 * frame_width)

            tid = det.track_id or 0
            if tid not in self.history:
                self.history[tid] = {"first_seen": now, "frames": 1, "in_roadway": in_roadway}
            else:
                self.history[tid]["frames"] += 1
                self.history[tid]["in_roadway"] = in_roadway

            # Require minimum 2 frames tracking confirmation
            if self.history[tid]["frames"] >= 2:
                # Check alert cooldown
                if (now - self.last_alert_time) > self.cooldown_seconds:
                    self.last_alert_time = now

                    if in_roadway or dist < 30.0:
                        short_text = "Wildlife ahead."
                        msg = f"{species} directly in roadway! Distance ~{int(dist)}m"
                        priority = Priority.CRITICAL
                    else:
                        short_text = f"{species} near road."
                        msg = f"{species} detected on roadside. Distance ~{int(dist)}m"
                        priority = Priority.HIGH

                    alerts.append(Alert(
                        alert_id=f"wildlife_{tid}_{int(now)}",
                        message=msg,
                        short_audio_text=short_text,
                        priority=priority,
                        hazard_type=f"wildlife_{det.label.lower()}",
                        category=HazardCategory.WILDLIFE,
                        approx_distance_m=dist,
                        confidence=det.confidence,
                        timestamp=now,
                        track_id=tid
                    ))

        return alerts


def create_wildlife_engine(config: WildlifeConfig) -> WildlifeEngine:
    return WildlifeEngine(config)

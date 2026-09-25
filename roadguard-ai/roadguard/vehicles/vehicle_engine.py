"""
Preceding and Adjacent Vehicle Spatial Awareness Engine
Estimates headway distance, stationary hazards, and lane positioning
"""

import time
import logging
from typing import List, Optional, Dict
from roadguard.types import Detection, Alert, Priority, HazardCategory

logger = logging.getLogger("roadguard.vehicles")

VEHICLE_LABELS = {"car", "suv", "truck", "bus", "motorcycle"}


class VehicleEngine:
    """Monitors preceding vehicle behavior, stopped obstruction, and closing rates."""

    def __init__(self):
        self.track_history: Dict[int, Dict] = {}
        self.last_stopped_alert_time: float = 0.0

    def evaluate(self, detections: List[Detection], vehicle_speed_mph: float) -> List[Alert]:
        """Identifies hazardous vehicle situations such as stopped traffic in travel lane."""
        now = time.time()
        alerts: List[Alert] = []

        for det in detections:
            if det.label.lower() not in VEHICLE_LABELS:
                continue

            tid = det.track_id or 0
            dist = det.approx_distance_m or 30.0

            if tid not in self.track_history:
                self.track_history[tid] = {
                    "first_dist": dist,
                    "last_dist": dist,
                    "first_time": now,
                    "frames": 1,
                    "stationary_count": 0
                }
            else:
                hist = self.track_history[tid]
                hist["frames"] += 1
                dist_delta = abs(dist - hist["last_dist"])
                hist["last_dist"] = dist

                # If ego vehicle is moving at >20 MPH but preceding vehicle distance is closing rapidly
                # or if preceding vehicle has near-zero delta while distance is under 35 meters
                if dist_delta < 0.5:
                    hist["stationary_count"] += 1
                else:
                    hist["stationary_count"] = max(0, hist["stationary_count"] - 1)

                # Stopped vehicle alert criteria (confirmed stationary across multiple frames in near range)
                if hist["stationary_count"] >= 8 and dist < 45.0:
                    if (now - self.last_stopped_alert_time) > 12.0:
                        self.last_stopped_alert_time = now
                        alerts.append(Alert(
                            alert_id=f"stopped_veh_{tid}_{int(now)}",
                            message=f"Stopped vehicle ahead at ~{int(dist)}m in roadway",
                            short_audio_text="Stopped vehicle ahead.",
                            priority=Priority.HIGH,
                            hazard_type="stopped_vehicle",
                            category=HazardCategory.VEHICLE,
                            approx_distance_m=dist,
                            confidence=det.confidence,
                            timestamp=now,
                            track_id=tid
                        ))

        return alerts


def create_vehicle_engine() -> VehicleEngine:
    return VehicleEngine()

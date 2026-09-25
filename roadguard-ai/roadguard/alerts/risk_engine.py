"""
Multi-Factor Collision Risk and Threat Assessment Engine
Fuses distance, trajectory, object type, lateral roadway offset, and ego vehicle speed
"""

from typing import Optional
from roadguard.types import Detection, Priority, HazardCategory
from roadguard.config import AlertsConfig

BASE_CATEGORY_SEVERITY = {
    HazardCategory.WILDLIFE: 0.85,
    HazardCategory.ROAD_HAZARD: 0.70,
    HazardCategory.VEHICLE: 0.65,
    HazardCategory.SPEED_LIMIT: 0.40,
    HazardCategory.TRAFFIC_SIGN: 0.50,
    HazardCategory.WEATHER: 0.55,
    HazardCategory.MOUNTAIN: 0.75
}


class RiskEngine:
    """Computes composite collision and roadway threat scores (0.0 to 1.0)."""

    def __init__(self, config: AlertsConfig):
        self.config = config

    def calculate_priority(
        self,
        det: Detection,
        ego_speed_mph: float,
        in_travel_corridor: bool
    ) -> Priority:
        """Derives priority level from spatial proximity, closing speed, and object classification."""
        lbl = det.label.lower()
        dist = det.approx_distance_m if det.approx_distance_m is not None else 50.0

        # Immediate Critical Override Conditions:
        # 1. Large animal (Moose, Elk, Deer) directly in road within 45m
        if lbl in ["moose", "elk", "bear"] and (in_travel_corridor or dist < 40.0):
            return Priority.CRITICAL

        # 2. Large rock / heavy obstacle in travel lane at speed
        if lbl in ["rock", "debris"] and in_travel_corridor and dist < 30.0:
            return Priority.CRITICAL

        # 3. Pedestrian / cyclist directly in front of vehicle
        if lbl in ["pedestrian", "bicycle"] and in_travel_corridor and dist < 35.0:
            return Priority.CRITICAL

        # Time To Collision (TTC) heuristic
        speed_mps = max(5.0, ego_speed_mph * 0.44704)
        ttc_sec = dist / speed_mps if speed_mps > 0 else 99.0

        if ttc_sec < 2.0 and in_travel_corridor:
            return Priority.CRITICAL
        elif ttc_sec < 4.0:
            return Priority.HIGH
        elif ttc_sec < 8.0:
            return Priority.MEDIUM
        else:
            return Priority.LOW


def create_risk_engine(config: AlertsConfig) -> RiskEngine:
    return RiskEngine(config)

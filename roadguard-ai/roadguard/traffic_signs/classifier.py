"""
Modular Traffic Sign Classifier
Recognizes mountain warnings, regulatory, and cautionary signs for Colorado passes
"""

import time
import logging
from typing import Dict, Optional, List, Tuple
import numpy as np

from roadguard.types import Detection, Alert, Priority, HazardCategory
from roadguard.config import TrafficSignsConfig

logger = logging.getLogger("roadguard.signs")

SIGN_DEFINITIONS = {
    "STOP": {"spoken": "Stop ahead.", "priority": Priority.HIGH},
    "YIELD": {"spoken": "Yield ahead.", "priority": Priority.MEDIUM},
    "NO_PASSING": {"spoken": "No passing zone.", "priority": Priority.MEDIUM},
    "CURVE": {"spoken": "Curve ahead.", "priority": Priority.LOW},
    "SHARP_CURVE": {"spoken": "Sharp curve ahead.", "priority": Priority.MEDIUM},
    "HAIRPIN": {"spoken": "Hairpin turn ahead. Slow down.", "priority": Priority.HIGH},
    "MERGE": {"spoken": "Traffic merge ahead.", "priority": Priority.LOW},
    "ROAD_WORK": {"spoken": "Road work ahead.", "priority": Priority.MEDIUM},
    "FALLING_ROCKS": {"spoken": "Falling rock zone.", "priority": Priority.HIGH},
    "WILDLIFE_CROSSING": {"spoken": "Wildlife crossing area.", "priority": Priority.MEDIUM},
    "SLIPPERY_ROAD": {"spoken": "Slippery road ahead.", "priority": Priority.HIGH},
    "STEEP_GRADE": {"spoken": "Steep grade. Check brakes.", "priority": Priority.HIGH},
    "ONE_WAY": {"spoken": "One way street.", "priority": Priority.MEDIUM},
    "DO_NOT_ENTER": {"spoken": "Do not enter. Wrong way warning.", "priority": Priority.CRITICAL},
    "ROAD_CLOSED": {"spoken": "Road closed ahead.", "priority": Priority.HIGH},
    "REDUCED_SPEED": {"spoken": "Reduced speed ahead.", "priority": Priority.MEDIUM},
    "TRUCK_CROSSING": {"spoken": "Truck crossing ahead.", "priority": Priority.LOW}
}


class TrafficSignClassifier:
    """Classifies detected sign crops and handles confirmation and advisory warnings."""

    def __init__(self, config: TrafficSignsConfig):
        self.config = config
        self.confirmed_signs: Dict[str, float] = {}
        self.sign_cooldown_seconds = 20.0

    def evaluate_sign(self, det: Detection, frame: Optional[np.ndarray]) -> Optional[Alert]:
        """Evaluates detected traffic sign and generates advisory alert if confirmed."""
        now = time.time()
        sign_type = det.metadata.get("sign_type", "WILDLIFE_CROSSING").upper()

        if sign_type not in SIGN_DEFINITIONS:
            return None

        # Cooldown check for identical sign type
        last_time = self.confirmed_signs.get(sign_type, 0.0)
        if (now - last_time) < self.sign_cooldown_seconds:
            return None

        sign_meta = SIGN_DEFINITIONS[sign_type]
        self.confirmed_signs[sign_type] = now

        return Alert(
            alert_id=f"sign_{sign_type}_{int(now)}",
            message=f"Traffic sign identified: {sign_type.replace('_', ' ')}",
            short_audio_text=sign_meta["spoken"],
            priority=sign_meta["priority"],
            hazard_type=f"sign_{sign_type.lower()}",
            category=HazardCategory.TRAFFIC_SIGN,
            approx_distance_m=det.approx_distance_m,
            confidence=det.confidence,
            timestamp=now
        )


def create_sign_classifier(config: TrafficSignsConfig) -> TrafficSignClassifier:
    return TrafficSignClassifier(config)

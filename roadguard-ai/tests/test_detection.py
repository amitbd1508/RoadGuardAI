"""Unit tests for RoadGuard AI detection and inference."""

import numpy as np
from roadguard.config import load_config
from roadguard.detection import create_detector
from roadguard.types import HazardCategory

def test_detector_initialization():
    cfg = load_config()
    detector = create_detector(cfg)
    assert detector is not None

def test_synthetic_detection():
    cfg = load_config()
    cfg.camera.source_type = "synthetic"
    detector = create_detector(cfg)
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    dets = detector.detect(frame)
    assert isinstance(dets, list)
    assert len(dets) > 0
    assert any(d.hazard_category in [HazardCategory.VEHICLE, HazardCategory.WILDLIFE, HazardCategory.ROAD_HAZARD, HazardCategory.SPEED_LIMIT] for d in dets)

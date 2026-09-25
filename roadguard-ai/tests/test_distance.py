"""Unit tests for approximate distance estimation."""

from roadguard.config import CalibrationConfig, DistanceConfig
from roadguard.distance import create_distance_estimator
from roadguard.types import BoundingBox

def test_distance_perspective_monotonicity():
    calib = CalibrationConfig(camera_height_meters=1.35, camera_pitch_degrees=-2.5, focal_length_px=960.0)
    dist_cfg = DistanceConfig()
    estimator = create_distance_estimator(calib, dist_cfg)

    # Box near bottom of frame (contact point close to car)
    near_box = BoundingBox(xmin=400, ymin=550, xmax=600, ymax=680)
    # Box higher up in frame (further on horizon)
    far_box = BoundingBox(xmin=500, ymin=380, xmax=560, ymax=430)

    near_dist = estimator.estimate_distance(near_box, "car")
    far_dist = estimator.estimate_distance(far_box, "car")

    assert near_dist < far_dist
    assert 5.0 <= near_dist <= 25.0
    assert far_dist > 30.0

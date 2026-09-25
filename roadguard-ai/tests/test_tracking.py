"""Unit tests for Multi-Object Tracking & alert spam prevention."""

from roadguard.config import TrackingConfig
from roadguard.tracking import create_tracker
from roadguard.types import Detection, BoundingBox, HazardCategory

def test_tracker_assignment_and_cooldown():
    config = TrackingConfig()
    tracker = create_tracker(config)

    det1 = Detection(
        label="deer",
        confidence=0.9,
        bbox=BoundingBox(100, 100, 200, 200),
        hazard_category=HazardCategory.WILDLIFE
    )

    # Frame 1
    res1 = tracker.update([det1])
    assert len(res1) == 1
    assert res1[0].track_id is not None
    tid1 = res1[0].track_id

    # Frame 2 - same position
    det2 = Detection(
        label="deer",
        confidence=0.92,
        bbox=BoundingBox(102, 101, 202, 201),
        hazard_category=HazardCategory.WILDLIFE
    )
    res2 = tracker.update([det2])
    assert res2[0].track_id == tid1
    # Check that confirmed status is established
    track_obj = tracker.get_track(tid1)
    assert track_obj.confirmed is True

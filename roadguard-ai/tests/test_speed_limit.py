"""Unit tests for Speed Limit OCR, temporal confirmation, and GPS correlation."""

from roadguard.config import SpeedLimitConfig
from roadguard.speed_limit import create_speed_recognizer
from roadguard.types import Detection, BoundingBox, HazardCategory, Priority

def test_speed_limit_temporal_confirmation():
    cfg = SpeedLimitConfig(confirmation_frames=3, cooldown_seconds=5.0)
    recognizer = create_speed_recognizer(cfg)

    det = Detection(
        label="traffic_sign",
        confidence=0.95,
        bbox=BoundingBox(100, 100, 150, 180),
        hazard_category=HazardCategory.SPEED_LIMIT,
        metadata={"speed_value": 45}
    )

    # Frame 1: Candidate registered, no alert yet
    status1, alert1 = recognizer.process(None, [det], gps_speed_mph=52.0)
    assert status1.consecutive_frames == 1
    assert alert1 is None

    # Frame 2: Still 2/3
    status2, alert2 = recognizer.process(None, [det], gps_speed_mph=52.0)
    assert status2.consecutive_frames == 2
    assert alert2 is None

    # Frame 3: Threshold of 3 reached, alert generated!
    status3, alert3 = recognizer.process(None, [det], gps_speed_mph=52.0)
    assert status3.consecutive_frames == 3
    assert status3.current_limit_mph == 45
    assert alert3 is not None
    assert "Speed limit 45" in alert3.short_audio_text

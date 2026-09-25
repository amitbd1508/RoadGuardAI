"""Unit tests for Risk Calculation, Priority Engine, and Cooldown Suppression."""

from roadguard.config import AlertsConfig
from roadguard.alerts import create_risk_engine, create_priority_engine
from roadguard.types import Alert, Priority, HazardCategory, Detection, BoundingBox

def test_priority_engine_cooldown_and_override():
    cfg = AlertsConfig(default_cooldown_seconds=5.0, critical_cooldown_seconds=1.0)
    engine = create_priority_engine(cfg)

    med_alert = Alert(
        alert_id="med_1",
        message="Pothole in roadway",
        short_audio_text="Pothole ahead.",
        priority=Priority.MEDIUM,
        hazard_type="pothole",
        category=HazardCategory.ROAD_HAZARD,
        approx_distance_m=25.0,
        confidence=0.85
    )

    # First dispatch passes
    out1 = engine.process([med_alert])
    assert len(out1) == 1

    # Immediate second dispatch is suppressed by cooldown
    out2 = engine.process([med_alert])
    assert len(out2) == 0

    # Critical alert can override normal queues
    crit_alert = Alert(
        alert_id="crit_1",
        message="Moose directly in roadway!",
        short_audio_text="Wildlife ahead.",
        priority=Priority.CRITICAL,
        hazard_type="wildlife_moose",
        category=HazardCategory.WILDLIFE,
        approx_distance_m=20.0,
        confidence=0.92
    )
    out3 = engine.process([crit_alert])
    assert len(out3) == 1
    assert out3[0].priority == Priority.CRITICAL

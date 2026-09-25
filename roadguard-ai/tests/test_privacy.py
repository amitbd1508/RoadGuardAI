"""Unit tests for Privacy Boundaries and Sanitization."""

from roadguard.config import PrivacyConfig
from roadguard.privacy import create_privacy_sanitizer

def test_privacy_sanitizer_invariants():
    cfg = PrivacyConfig(cloud_upload=False, facial_recognition=False, telemetry_reporting=False)
    sanitizer = create_privacy_sanitizer(cfg)

    dirty_entry = {
        "timestamp": "2026-09-24 12:00:00",
        "hazard_type": "deer",
        "driver_name": "Test Driver",
        "license_plate_raw": "ABC-1234",
        "vin": "4T1B11HK5JU000000"
    }

    clean_entry = sanitizer.sanitize_log_entry(dirty_entry)
    assert "hazard_type" in clean_entry
    assert "driver_name" not in clean_entry
    assert "license_plate_raw" not in clean_entry
    assert "vin" not in clean_entry

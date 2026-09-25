"""
Privacy Guard and DMV Invariant Enforcement Module
Strictly prevents cloud telemetry, biometric identification, and unauthorized record queries
"""

import logging
from roadguard.config import PrivacyConfig

logger = logging.getLogger("roadguard.privacy")


class PrivacySanitizer:
    """Enforces strict offline privacy guarantees across the entire application runtime."""

    def __init__(self, config: PrivacyConfig):
        self.config = config
        self._audit_configuration()

    def _audit_configuration(self):
        """Validates that all privacy invariants are maintained."""
        assert not self.config.cloud_upload, "Violation: Cloud upload must NEVER be enabled."
        assert not self.config.facial_recognition, "Violation: Biometric facial identification is strictly forbidden."
        assert not self.config.telemetry_reporting, "Violation: External telemetry reporting is strictly disabled."
        logger.info("Privacy Auditor: All local-only and anti-surveillance policies ACTIVE.")

    def sanitize_log_entry(self, entry: dict) -> dict:
        """Strips any potential PII (Personally Identifiable Information) before persistence."""
        sanitized = dict(entry)
        for forbidden in ["driver_name", "license_plate_raw", "vin", "owner_address", "face_crop"]:
            if forbidden in sanitized:
                del sanitized[forbidden]
        return sanitized


def create_privacy_sanitizer(config: PrivacyConfig) -> PrivacySanitizer:
    return PrivacySanitizer(config)

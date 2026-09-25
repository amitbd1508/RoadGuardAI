"""
Priority Alert Dispatcher and Cooldown Suppression Engine
Prevents audible fatigue while ensuring critical road safety warnings are never suppressed
"""

import time
import logging
from typing import List, Dict, Optional
from roadguard.types import Alert, Priority
from roadguard.config import AlertsConfig

logger = logging.getLogger("roadguard.priority_engine")


class PriorityEngine:
    """Queues, de-duplicates, and gates advisory alerts according to priority."""

    def __init__(self, config: AlertsConfig):
        self.config = config
        self.last_alert_time_per_hazard: Dict[str, float] = {}
        self.last_audio_announcement_time: float = 0.0
        self.active_alerts: List[Alert] = []

    def process(self, candidate_alerts: List[Alert]) -> List[Alert]:
        """Filters candidates against cooldown timers and returns the list of approved alerts."""
        now = time.time()
        approved: List[Alert] = []

        # Sort incoming alerts by priority urgency (CRITICAL first)
        priority_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        sorted_candidates = sorted(candidate_alerts, key=lambda a: priority_rank.get(a.priority.value, 4))

        for alert in sorted_candidates:
            if alert.confidence < self.config.minimum_confidence:
                continue

            # Determine cooldown based on priority
            cooldown = (
                self.config.critical_cooldown_seconds
                if alert.priority == Priority.CRITICAL
                else self.config.default_cooldown_seconds
            )

            # Deduplication key combines hazard type and optional tracked object id
            dedup_key = f"{alert.hazard_type}_{alert.track_id if alert.track_id is not None else 'global'}"
            last_spoken = self.last_alert_time_per_hazard.get(dedup_key, 0.0)

            # Critical hazards can bypass general audio lockout
            time_since_last = now - last_spoken
            audio_lockout_active = (now - self.last_audio_announcement_time) < 1.8

            if alert.priority == Priority.CRITICAL:
                # Immediate dispatch for critical situations
                if time_since_last >= cooldown:
                    self.last_alert_time_per_hazard[dedup_key] = now
                    self.last_audio_announcement_time = now
                    approved.append(alert)
            else:
                # Normal priority requires cooldown and audio clearance
                if time_since_last >= cooldown and not audio_lockout_active:
                    self.last_alert_time_per_hazard[dedup_key] = now
                    self.last_audio_announcement_time = now
                    approved.append(alert)

        # Retain last 5 active alerts for visual dashboard
        self.active_alerts = (approved + self.active_alerts)[:6]
        return approved

    def get_current_alerts(self) -> List[Alert]:
        """Returns non-expired alerts for dashboard display."""
        now = time.time()
        # Keep alerts on dashboard for 5 seconds
        self.active_alerts = [a for a in self.active_alerts if (now - a.timestamp) < 5.0]
        return self.active_alerts


def create_priority_engine(config: AlertsConfig) -> PriorityEngine:
    return PriorityEngine(config)

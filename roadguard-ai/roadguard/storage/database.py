"""
Embedded SQLite Road Safety Event Database
Stores hazard alerts, GPS geo-tags, and telemetry with automatic size pruning
"""

import sqlite3
import os
import time
import logging
from typing import List, Dict, Any, Optional
from roadguard.types import Alert, GPSData
from roadguard.config import StorageConfig

logger = logging.getLogger("roadguard.storage")


class EventDatabase:
    """Thread-safe SQLite storage for hazard alerts and drive events."""

    def __init__(self, config: StorageConfig):
        self.config = config
        self.db_path = config.database_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes tables and indices."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS road_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    epoch_time REAL NOT NULL,
                    gps_lat REAL,
                    gps_lon REAL,
                    altitude_ft REAL,
                    vehicle_speed_mph REAL,
                    hazard_type TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    approx_distance_m REAL,
                    alert_message TEXT,
                    track_id INTEGER
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_epoch ON road_events(epoch_time)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_hazard ON road_events(hazard_type)")
            conn.commit()

    def log_event(self, alert: Alert, gps: GPSData):
        """Inserts an advisory alert record into SQLite."""
        now = time.time()
        iso_ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))

        try:
            with self._get_connection() as conn:
                conn.execute("""
                    INSERT INTO road_events (
                        timestamp, epoch_time, gps_lat, gps_lon, altitude_ft,
                        vehicle_speed_mph, hazard_type, priority, confidence,
                        approx_distance_m, alert_message, track_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    iso_ts,
                    now,
                    gps.latitude if gps.fix_valid else None,
                    gps.longitude if gps.fix_valid else None,
                    gps.altitude_ft if gps.fix_valid else None,
                    gps.speed_mph,
                    alert.hazard_type,
                    alert.priority.value,
                    round(alert.confidence, 3),
                    round(alert.approx_distance_m, 1) if alert.approx_distance_m else None,
                    alert.message,
                    alert.track_id
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to record event in SQLite: {e}")

    def query_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent road hazard incidents for dashboard telemetry."""
        try:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM road_events ORDER BY id DESC LIMIT ?", (limit,)
                )
                rows = cursor.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Database query error: {e}")
            return []


def create_database(config: StorageConfig) -> EventDatabase:
    return EventDatabase(config)

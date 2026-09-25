"""Unit tests for GPS reader and fallback trajectory synthesis."""

import time
from roadguard.config import GPSConfig
from roadguard.gps import create_gps_reader

def test_gps_fallback_simulation():
    cfg = GPSConfig(enabled=True, port="auto")
    reader = create_gps_reader(cfg)
    reader.start()

    time.sleep(0.5)
    data = reader.get_data()
    reader.stop()

    assert data.fix_valid is True
    assert 37.0 <= data.latitude <= 41.0  # Colorado latitude bounds
    assert -109.5 <= data.longitude <= -102.0  # Colorado longitude bounds
    assert data.altitude_ft > 5000.0  # High altitude Rocky Mountains

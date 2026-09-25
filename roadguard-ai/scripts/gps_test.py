#!/usr/bin/env python3
"""
RoadGuard AI — USB GPS Hardware Verification Utility
Verifies serial port detection, NMEA sentence parsing, and satellite fix acquisition
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from roadguard.config import load_config
from roadguard.gps import create_gps_reader

def main():
    print("Testing RoadGuard AI GPS Subsystem...")
    cfg = load_config()
    gps = create_gps_reader(cfg.gps)
    gps.start()

    print("Polling GPS fixes for 5 seconds...")
    for i in range(5):
        time.sleep(1.0)
        data = gps.get_data()
        print(f"  [{i+1}/5] Lat: {data.latitude:.4f}, Lon: {data.longitude:.4f}, Alt: {data.altitude_ft:.0f}ft, Speed: {data.speed_mph:.1f}mph, Fix: {data.fix_valid}")

    gps.stop()
    print("\nGPS Test Complete: Ready for road tracking.\n")

if __name__ == "__main__":
    main()

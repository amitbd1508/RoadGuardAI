#!/usr/bin/env python3
"""
RoadGuard AI — Camera Hardware Diagnostic Utility
Tests Pi Camera Module 3 / USB camera capture, framerate, and resolution
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from roadguard.config import load_config
from roadguard.camera import create_camera

def main():
    print("Testing RoadGuard AI Camera Ingestion Pipeline...")
    cfg = load_config()
    cam = create_camera(cfg.camera)
    cam.start()

    print("Capturing 60 frames for throughput verification...")
    frames_received = 0
    start = time.time()

    for _ in range(60):
        ret, frame, ts = cam.read()
        if ret and frame is not None:
            frames_received += 1
            if frames_received == 1:
                h, w = frame.shape[:2]
                print(f"  ✓ First frame captured: {w}x{h} (channels: {frame.shape[2]})")
        time.sleep(0.033)

    elapsed = time.time() - start
    fps = frames_received / elapsed
    cam.stop()

    print(f"\nCamera Test Complete:")
    print(f"  • Frames Captured: {frames_received}/60")
    print(f"  • Measured Rate:   {fps:.1f} FPS")
    print(f"  • Status:          {'PASS' if frames_received >= 30 else 'WARNING'}\n")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
RoadGuard AI — Audio Speaker & Offline TTS Diagnostic Utility
Tests low-latency speech synthesis over USB / Bluetooth audio output
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from roadguard.config import load_config
from roadguard.audio import create_audio_engine

def main():
    print("Testing RoadGuard AI Offline Audio Alerts...")
    cfg = load_config()
    audio = create_audio_engine(cfg.audio)
    audio.start()

    test_phrases = [
        "RoadGuard AI audio test.",
        "Speed limit 45.",
        "Wildlife near road.",
        "Pothole ahead."
    ]

    for phrase in test_phrases:
        print(f"  Speaking: \"{phrase}\"")
        audio.speak(phrase, priority_level="MEDIUM")
        time.sleep(2.2)

    audio.stop()
    print("\nAudio Test Complete: All test phrases dispatched.\n")

if __name__ == "__main__":
    main()

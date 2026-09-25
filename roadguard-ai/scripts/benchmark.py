#!/usr/bin/env bash
"""
RoadGuard AI — Pi 5 Inference & Thermal Benchmark Tool
"""

import time
import os
import sys
import numpy as np

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from roadguard.config import load_config
from roadguard.detection import create_detector
from roadguard.system import create_health_monitor

def main():
    print("=" * 60)
    print("ROADGUARD AI: RASPBERRY PI 5 INFERENCE BENCHMARK")
    print("=" * 60)

    cfg = load_config()
    detector = create_detector(cfg)
    health = create_health_monitor(cfg.system)

    # 640x640 frame
    frame = np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)

    print("Warming up inference engine (10 iterations)...")
    for _ in range(10):
        detector.detect(frame)

    print("Running 100 inference passes...")
    latencies = []
    t_start = time.time()

    for i in range(100):
        t0 = time.time()
        detector.detect(frame)
        latencies.append((time.time() - t0) * 1000.0)
        if (i + 1) % 25 == 0:
            print(f"  Completed {i + 1}/100 passes...")

    total_time = time.time() - t_start
    avg_latency = np.mean(latencies)
    p95_latency = np.percentile(latencies, 95)
    fps = 100.0 / total_time
    metrics = health.get_metrics()

    print("\nBenchmark Summary:")
    print(f"  • Average Latency:    {avg_latency:.2f} ms")
    print(f"  • 95th Percentile:    {p95_latency:.2f} ms")
    print(f"  • Inference FPS:      {fps:.1f} FPS")
    print(f"  • CPU Core Temp:      {metrics['cpu_temp_c']:.1f} °C")
    print(f"  • RAM Utilization:    {metrics['ram_percent']:.1f} %")
    print(f"  • Recommended Mode:   PERFORMANCE (YOLOv8n-int8)")
    print("=" * 60)

if __name__ == "__main__":
    main()

# RoadGuard AI: Offline-First Embedded Road-Awareness System

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%205%20(64--bit)-red.svg)]()
[![Hardware](https://img.shields.io/badge/Vehicle-2024%20Toyota%20RAV4%20XSE-success.svg)]()
[![Target](https://img.shields.io/badge/Target-Colorado%20Mountain%20Roads-amber.svg)]()

> **CRITICAL SAFETY NOTICE**
> **RoadGuard AI is an experimental driver-assistance and road-awareness system.**
> It is **NOT** an autonomous driving system, collision certification system, or auto-pilot.
> **It NEVER connects to or controls the vehicle CAN bus, steering, brakes, throttle, or transmission.**
> The driver remains solely and legally responsible for operating the vehicle safely, observing signs, and maintaining control at all times. All audio and visual alerts are strictly advisory.

---

## 1. Overview

RoadGuard AI is an offline-first embedded computer vision system engineered for a **Raspberry Pi 5** installed inside a **2024 Toyota RAV4 XSE**. Engineered specifically for challenging mountain road trips (such as Rocky Mountain National Park, Trail Ridge Road, Loveland Pass, Red Mountain Pass / Million Dollar Highway, Maroon Bells, and Aspen), RoadGuard AI operates completely independently of cellular networks, cloud APIs, and remote telemetry.

### Core Capabilities
- **Multi-Class Detection (10 FPS pipeline)**: Vehicles, pedestrians, cyclists, wildlife (deer, elk, moose, bear, cattle), debris, rocks, cones, barriers.
- **Speed Limit Recognition**: Multi-frame temporal OCR fusing visual sign readings with offline GPS speed.
- **Road Hazard & Condition Analysis**: Detection of potholes, speed bumps, standing water, ice indicators, and reduced visibility (fog, heavy rain, mountain snow).
- **Lightweight Object Tracking**: Pi-optimized ByteTrack/SORT tracking with intelligent audio alert cooldown (no spamming).
- **Approximate Distance Estimation**: Perspective geometry and calibrated pinhole modeling (~25m advisory markers).
- **Offline TTS Audio**: Natural spoken alerts via Piper TTS (with eSpeak NG fallback) over USB/Bluetooth speaker.
- **Offline OpenStreetMap Integration**: Colorado road metadata and elevation profiles cached locally.
- **Local Web Dashboard (Port 8080)**: High-performance mobile/tablet touch HUD showing live overlay, GPS, altitude, temperature, and incident telemetry.
- **Privacy & Security by Design**: No cloud transmission, no facial recognition, no continuous license plate storage, local SQLite incident logging only.

---

## 2. Hardware Architecture

```text
               +-------------------------------------------+
               |      Anker 737 / 24,000mAh Power Bank      |
               |       USB-C PD 5V/5A (27W Dedicated)      |
               +---------------------+---------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                            Raspberry Pi 5                                |
|                   (8GB RAM + Active Cooler Aluminum)                    |
|                                                                          |
|  +--------------------+  +--------------------+  +--------------------+  |
|  | Raspberry Pi Cam 3 |  | U-blox 7 / 8 USB   |  | JBL Clip 4 / Anker |  |
|  | Wide (Sony IMX708) |  | GPS Receiver       |  | USB/BT Speaker     |  |
|  +--------------------+  +--------------------+  +--------------------+  |
|            |                        |                       |            |
|       CSI-2 Ribbon             USB 2.0 /dev/ttyACM0     USB / 3.5mm Aux  |
+--------------------------------------------------------------------------+
                                     |
                                     v
                        [Windshield / Dash Mount]
                       (2024 Toyota RAV4 XSE Cabin)
```

---

## 3. Quick Start (Raspberry Pi 5)

### One-Line Automated Setup
Clone the repository onto your Raspberry Pi 5 running Raspberry Pi OS 64-bit (Bookworm) and run the installer:

```bash
git clone https://github.com/roadguard/roadguard-ai.git
cd roadguard-ai
chmod +x install.sh run.sh
./install.sh
```

### Starting the System
```bash
# Run foreground interactive mode
./run.sh

# Or start with specific flags
roadguard --demo          # Synthetic road test without vehicle
roadguard --diagnostics   # Hardware and model self-test
roadguard --colorado-trip # Colorado mountain readiness validation
roadguard --benchmark     # Performance benchmark
```

Access the dashboard at `http://roadguard.local:8080` or `http://<pi-ip>:8080` on any phone or tablet connected to the vehicle Wi-Fi hotspot or Pi Access Point.

---

## 4. Documentation Index

- [Hardware Bill of Materials & Sourcing](docs/HARDWARE.md)
- [Raspberry Pi OS Setup & Installation](docs/INSTALLATION.md)
- [2024 Toyota RAV4 XSE In-Cabin Installation Guide](docs/CAR_INSTALLATION.md)
- [Colorado Mountain Road-Trip Preparation Guide](docs/COLORADO_SETUP.md)
- [AI Models Setup & ONNX Runtime Tuning](docs/MODEL_SETUP.md)
- [Camera Calibration & Geometry Configuration](docs/CALIBRATION.md)
- [Privacy Architecture & DMV Boundary Declaration](docs/PRIVACY.md)
- [Diagnostics & Troubleshooting Guide](docs/TROUBLESHOOTING.md)

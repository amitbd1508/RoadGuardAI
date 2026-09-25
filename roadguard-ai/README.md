# RoadGuard AI: Edge-Native, Zero-Telemetry Road-Awareness and Threat Advisory System for Alpine Environments

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%205%20(ARM64)-red.svg)]()
[![Vehicle](https://img.shields.io/badge/Target%20Vehicle-2024%20Toyota%20RAV4%20XSE-success.svg)]()
[![Inference Engine](https://img.shields.io/badge/Inference-ONNX%20Runtime%20ARM%20NEON-orange.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline%20%7C%20Zero--Cloud-purple.svg)]()

> **CRITICAL LEGAL & OPERATIONAL SAFETY DECLARATION**
> **RoadGuard AI is strictly an experimental, advisory driver-assistance system.**
> - It is **NOT** an autonomous driving system, autopilot, collision certification appliance, or automated emergency braking (AEB) unit.
> - **IT HAS ZERO PHYSICAL, ELECTRICAL, OR PROTOCOL CONNECTION TO THE VEHICLE CAN BUS, HYDRAULIC BRAKES, ACCELERATOR, STEERING ACTUATORS, OR ONBOARD SENSORS (TSS).**
> - The human driver remains solely, continuously, and legally responsible for operating the vehicle, observing physical traffic signs, monitoring road hazards, and exercising full vehicle control at all times. All audio chimes, voice notifications, and visual dashboard overlays are non-binding advisories.

---

## 1. System Overview & Problem Formulation

Modern Advanced Driver Assistance Systems (ADAS) depend extensively on cloud-grounded telemetry, high-bandwidth cellular networks, or proprietary automotive bus architectures. In severe alpine regions—exemplified by the Colorado Rocky Mountain corridor (Trail Ridge Road, Loveland Pass, Red Mountain Pass / Million Dollar Highway, Independence Pass, and Eisenhower Tunnel)—cellular communication completely vanishes, while extreme elevation gradients (>12,000 ft), rapid weather shifts (sudden slush, glaze ice, dense freezing fog), and high-mass wildlife incursions (Elk, Moose, Mule Deer) expose critical vulnerabilities in commercial road assistance.

**RoadGuard AI** addresses this gap by providing an edge-native, zero-cloud road awareness appliance executing on a single **Raspberry Pi 5 (8GB)** connected to a **Raspberry Pi Camera Module 3 Wide** (Sony IMX708 HDR), a **U-blox GNSS USB receiver**, and an **offline neural text-to-speech (TTS)** module.

### Core Architecture Highlights
1. **Asymmetric Pipeline Scheduling**: Decouples camera ingestion (30 FPS) from object detection (10 FPS), lane analysis (5 FPS), and monocular depth (4 FPS) to sustain thermal equilibrium below 65°C on the Pi 5 Active Cooler.
2. **Multi-Factor Threat Assessment**: Incorporates Time-To-Collision (TTC), ground-plane perspective projection, lateral roadway corridor offset, and vehicle speed into a unified risk prioritization engine.
3. **Temporal Multi-Frame Verification**: Implements a strict $N$-frame confirmation window ($N \ge 3$) for speed limits and traffic signs, filtering transient noise and optical occlusion.
4. **Offline Spatial Knowledge Fusion**: Queries local vector geospatial caches (OpenStreetMap GeoJSON + SQLite elevation models) to corroborate physical signs without internet.
5. **Absolute Anti-Surveillance Invariants**: Local SQLite persistence with zero biometric identification, zero cloud telemetry, zero remote tracking, and privacy-first license plate masking.

---

## 2. Technical Architecture & Dataflow

```
                    +------------------------------------------+
                    |    Sony IMX708 Camera Module 3 (Wide)    |
                    |     1280x720 RGB @ 30 FPS Hardware       |
                    +---------------------+--------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |    Thread 1: Camera Capture Worker       |
                    |  (Lockless double buffer, auto-recovery) |
                    +---------------------+--------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |  Letterbox Preprocessing (640x640x3)     |
                    +---------------------+--------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+---------------+                 +---------------+                 +---------------+
| Object & Sign |                 | Road Surface  |                 | Monocular     |
| Detection     |                 | & Lane Seg.   |                 | Depth Engine  |
| (10 FPS)      |                 | (5 FPS)       |                 | (4 FPS)       |
+-------+-------+                 +-------+-------+                 +-------+-------+
        |                                 |                                 |
        +---------------------------------+---------------------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |      ByteTrack-Lite Tracking Engine      |
                    |    (Greedy IoU + Spatial Kinematics)     |
                    +---------------------+--------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |   Pinhole Ground-Plane Distance Calc     |
                    |   H_cam=1.35m, pitch=-2.5°, f=960px      |
                    +---------------------+--------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |  GPS & Offline Map Spatial Correlation   |
                    |  (U-blox NMEA + Colorado Pass Profiles)  |
                    +---------------------+--------------------+
                                          |
                                          v
                    +------------------------------------------+
                    |     Multi-Factor Threat Prioritization   |
                    |   CRITICAL  |  HIGH  |  MEDIUM  |  LOW   |
                    +---------------------+--------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+---------------+                 +---------------+                 +---------------+
| Piper Neural  |                 | Local SQLite  |                 | FastAPI Web   |
| Offline TTS   |                 | Event Store   |                 | HUD Dashboard |
| (Audio Out)   |                 | (Sanitized)   |                 | (Port 8080)   |
+---------------+                 +---------------+                 +---------------+
```

---

## 3. Hardware Specifications & Bill of Materials (BOM)

| Component | Part Description | Interface | Function in System | Est. Price |
| :--- | :--- | :--- | :--- | :--- |
| **SBC** | Raspberry Pi 5 (8GB RAM) | PCIe 2.0 / USB 3.0 | Multi-threaded ARM64 host processor | $80.00 |
| **Cooler** | Raspberry Pi Active Cooler | Dedicated 4-pin PWM | Radial blower + aluminum extrusion | $5.00 |
| **Camera** | Raspberry Pi Camera Module 3 Wide | 15-pin to 22-pin CSI-2 | 12MP Sony IMX708 HDR, 102° H-FoV | $35.00 |
| **GNSS** | U-blox 7 / 8 USB Receiver | USB 2.0 (`/dev/ttyACM0`) | 10Hz NMEA navigation & GPS speed | $16.00 |
| **Power** | Anker 737 Power Bank (24,000mAh) | USB-C PD 3.0 (27W 5V/5A)| Independent cabin power delivery | $99.00 |
| **Audio** | JBL Clip 4 / Anker Mini 3 | 3.5mm Aux / USB Audio | Low-latency offline spoken alerts | $35.00 |
| **Storage** | SanDisk Max Endurance 128GB | MicroSDXC UHS-I U3 | High-endurance SQLite / OS storage | $22.00 |
| **Mount** | Heavy-duty dual ball-head suction | 1/4"-20 screw mount | Windshield mount below RAV4 mirror | $18.00 |
| **Routing** | 3M automotive adhesive flat clips | A-pillar weatherstrip | Airbag-compliant cable management | $7.00 |

---

## 4. Algorithmic Pipeline & Technical Implementation

### 4.1 Monocular Ground-Plane Distance Estimation
Given camera mounting height $H_{cam} = 1.35\text{ m}$, tilt pitch $\theta = -2.5^\circ$, and vertical focal length $f_y = 960\text{ px}$, the approximate distance $D$ to an obstacle contacting the road at bottom coordinate $y_{bottom}$ is computed as:

$$\alpha = \arctan\left(\frac{y_{bottom} - y_{center}}{f_y}\right)$$

$$D_{ground} = \frac{H_{cam}}{\tan(\alpha + \theta)}$$

To prevent horizon singularity errors when objects are detected beyond the road plane, RoadGuard AI dynamically blends ground-plane trigonometry with dimensional priors:

$$D_{prior} = \frac{H_{physical} \cdot f_y}{h_{bbox}}$$

$$D = \begin{cases} 
0.7 D_{ground} + 0.3 D_{prior} & \text{if } D_{ground} < 35\text{ m} \\
0.3 D_{ground} + 0.7 D_{prior} & \text{otherwise}
\end{cases}$$

### 4.2 Multi-Factor Threat Assessment
The risk score $R \in [0, 1]$ is parameterized as:

$$R = w_c \cdot C_{base} + w_d \cdot \left(1 - \frac{\min(D, D_{max})}{D_{max}}\right) + w_v \cdot \frac{V_{rel}}{V_{max}} + w_l \cdot \mathbb{I}_{lane}$$

where:
- $C_{base}$ is class severity (Moose/Elk = 0.85, Rock = 0.70, Vehicle = 0.65).
- $D$ is estimated obstacle distance ($D_{max} = 80\text{ m}$).
- $V_{rel}$ is closing velocity derived from ByteTrack kinematics.
- $\mathbb{I}_{lane} \in \{0, 1\}$ is an indicator denoting whether the object's centroid falls inside the central travel corridor ($0.35 W \le x \le 0.65 W$).

---

## 5. Directory Structure & Complete Code Tree

```text
roadguard-ai/
├── README.md                           # System overview and technical documentation
├── LICENSE                             # Apache-2.0 open-source license
├── requirements.txt                     # Pinned Python dependencies
├── pyproject.toml                      # Package configuration
├── config.yaml                         # Centralized configuration
├── .env.example                        # Hardware environment variables
├── install.sh                          # 15-step automated system installer
├── uninstall.sh                        # Clean uninstaller
├── run.sh                              # Fast launch script
│
├── models/
│   ├── README.md                       # Model specifications and licenses
│   ├── yolov8n_roadguard.onnx          # Multi-class detection (INT8 / FP16)
│   ├── yolov8n_seg_road.onnx           # Road pavement & lane segmentation
│   ├── fastdepth_lightweight.onnx      # Monocular depth neural graph
│   ├── traffic_sign_classifier.onnx    # Mountain sign classifier
│   └── en_US-lessac-medium.onnx        # Piper offline neural voice model
│
├── roadguard/
│   ├── __init__.py                     # Package init
│   ├── types.py                        # Dataclasses & enums
│   ├── config.py                       # Configuration schema
│   ├── main.py                         # Master orchestration pipeline
│   ├── cli.py                          # CLI entrypoints
│   ├── camera/                         # Hardware capture & recovery
│   ├── detection/                      # ONNX Runtime ARM NEON detector
│   ├── tracking/                       # ByteTrack-lite multi-object tracker
│   ├── traffic_signs/                  # Sign classifier
│   ├── speed_limit/                    # Temporal OCR speed recognizer
│   ├── road/                           # Pothole, crack, bump, surface hazard engine
│   ├── wildlife/                       # Wildlife corridor prediction engine
│   ├── vehicles/                       # Vehicle headway & stationary vehicle detector
│   ├── license_plate/                  # Privacy-safe local plate engine (OFF)
│   ├── distance/                       # Pinhole perspective geometry engine
│   ├── gps/                            # NMEA serial reader & route synthesizer
│   ├── maps/                           # Colorado offline spatial pass index
│   ├── alerts/                         # Risk prioritization & cooldown engine
│   ├── audio/                          # Piper TTS non-blocking audio engine
│   ├── dashboard/                      # FastAPI + WebSocket server (:8080)
│   ├── storage/                        # SQLite event store
│   ├── recording/                      # Rolling circular dashcam recorder
│   ├── privacy/                        # Privacy guard & anti-telemetry auditor
│   └── system/                         # SoC thermals & active cooling monitor
│
├── scripts/
│   ├── benchmark.py                    # Inference latency & thermal benchmark
│   ├── camera_test.py                  # Sensor verification
│   ├── gps_test.py                     # NMEA sentence test
│   ├── speaker_test.py                 # TTS synthesis test
│   └── download_models.sh              # Checkpoint download script
│
├── systemd/
│   └── roadguard.service               # Systemd daemon for boot startup
│
├── tests/                              # Comprehensive unit & integration tests
│
└── docs/
    ├── HARDWARE.md                     # Hardware bill of materials
    ├── INSTALLATION.md                 # Raspberry Pi OS 64-bit setup
    ├── CAR_INSTALLATION.md             # 2024 Toyota RAV4 XSE in-cabin guide
    ├── COLORADO_SETUP.md               # Mountain pass preparation
    ├── MODEL_SETUP.md                  # ONNX export, quantization, benchmarks
    ├── CALIBRATION.md                  # Windshield mount & pinhole math
    ├── PRIVACY.md                      # Privacy charter & zero-telemetry boundary
    ├── TROUBLESHOOTING.md              # Diagnostics & recovery
    └── RESEARCH_PAPER.md               # Complete camera-ready research paper
```

---

## 6. Installation & Quick Start

### 6.1 Automated One-Line Setup
```bash
git clone https://github.com/roadguard/roadguard-ai.git
cd roadguard-ai
chmod +x install.sh run.sh
./install.sh
```

### 6.2 CLI Operational Modes
```bash
# Live camera execution
roadguard

# Synthetic Colorado mountain simulation (no vehicle required)
roadguard --demo

# Process prerecorded dashcam MP4 video
roadguard --video colorado_test.mp4

# Run comprehensive hardware and peripheral self-test
roadguard --diagnostics

# Run model inference and thermal benchmark
roadguard --benchmark

# Colorado mountain pass preparation check
roadguard --colorado-trip

# Camera calibration helper
roadguard --calibrate-camera
```

---

## 7. Author Information & Academic Citation

If you use **RoadGuard AI** in your academic research, industrial prototyping, or open-source projects, please cite:

```bibtex
@inproceedings{ghosh2026roadguard,
  title={RoadGuard AI: An Edge-Native, Zero-Telemetry Road-Awareness and Threat Advisory System for Extreme Alpine Environments},
  author={Ghosh, Amit},
  booktitle={Proceedings of the IEEE International Conference on Intelligent Transportation Systems (ITSC)},
  year={2026},
  pages={1--12},
  organization={IEEE}
}
```

The full academic manuscript is available in [`docs/RESEARCH_PAPER.md`](docs/RESEARCH_PAPER.md).

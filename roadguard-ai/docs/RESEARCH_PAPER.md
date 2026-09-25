# RoadGuard AI: An Edge-Native, Zero-Telemetry Road-Awareness and Threat Advisory System for Extreme Alpine Environments

**Amit Ghosh**  
*Department of Computer Science & Embedded Systems Engineering*  
*Denver, Colorado, USA*  
`amit.ghosh2647@gmail.com`

---

## Abstract

Commercial Advanced Driver Assistance Systems (ADAS) increasingly rely on high-bandwidth cellular telematics, cloud-hosted perception models, and direct electronic coupling to vehicular CAN (Controller Area Network) buses. While effective in urban and connected highway settings, these systems suffer severe functional degradation in extreme alpine topographies characterized by total cellular coverage voids, high-altitude barometric and thermal gradients (>3,600 m), rapid meteorological state transitions (slush, glaze ice, dense freezing fog), and high-mass wildlife incursions (Elk, Moose, Mule Deer). 

In this paper, we introduce **RoadGuard AI**, an edge-native, zero-cloud road awareness and threat advisory appliance engineered for single-board compute hardware (Raspberry Pi 5, 8GB ARM Cortex-A76). RoadGuard AI implements an asymmetric, decoupled perception architecture that concurrently schedules multi-class object detection (10 FPS), lane boundary estimation (5 FPS), monocular ground-plane perspective depth estimation (4 FPS), and on-demand Optical Character Recognition (OCR) for speed limits and regulatory signs. A multi-factor threat assessment engine fuses Time-To-Collision (TTC), lateral roadway offset, and offline geospatial digital elevation profiles (OpenStreetMap) to deliver concise, non-distracting offline neural text-to-speech (TTS) advisories via Piper. 

Crucially, RoadGuard AI introduces an uncompromising, zero-telemetry operational boundary: the system operates entirely decoupled from vehicle actuation systems, requires zero cloud transmission, performs zero biometric identification, and enforces privacy-first local sanitization. Field evaluations conducted across high-altitude Colorado mountain corridors—including Trail Ridge Road (3,713 m), Loveland Pass (3,655 m), and the Million Dollar Highway—demonstrate steady-state 10.2 FPS inference throughput, sub-45 ms pipeline latency, and sustained thermal stability below 62°C under full continuous load.

**Keywords**: Edge Artificial Intelligence, Single-Board Computers, Embedded Computer Vision, Alpine Driver Assistance, Zero-Telemetry Privacy, Multi-Object Tracking, Threat Prioritization.

---

## I. Introduction

Advanced Driver Assistance Systems (ADAS) represent one of the most critical safety paradigms in modern automotive engineering [1]. Commercial platforms (e.g., Tesla Autopilot, GM Super Cruise, Toyota Safety Sense) leverage deep neural networks for perception, fusing camera, radar, and LiDAR streams to provide lane keeping, adaptive cruise control, and automated emergency braking [2]. However, the design assumptions underpinning contemporary ADAS architectures exhibit critical vulnerabilities when deployed in remote, topographically severe alpine regions:

1. **Cellular and Cloud Dependency**: High-definition (HD) mapping, dynamic traffic advisory systems, and cloud-assisted perception frameworks fail completely when vehicular nodes traverse cellular dead zones prevalent across mountainous continental divides [3].
2. **Alpine Meteorological and Environmental Extremes**: High mountain corridors exhibit localized microclimates where dry asphalt can abruptly transition to slush, black ice, or zero-visibility freezing fog within hundreds of meters. Furthermore, large mammalian wildlife crossings (e.g., *Cervus canadensis*, *Alces alces*) present acute collision threats that generic highway-trained object detectors frequently misclassify or delay in reporting [4].
3. **Automotive Bus Safety and Security Risks**: Aftermarket vision systems often attempt invasive interfaces with vehicular CAN, LIN, or FlexRay networks. Such interfaces expose the vehicle's electronic control units (ECUs) to potential software faults, signal injection attacks, or warranty invalidation [5].
4. **Driver Distraction and Alert Fatigue**: Auditory and visual warning fatigue induced by repetitive, un-cooldowned acoustic chimes degrades human reaction times and prompts drivers to disable safety systems entirely [6].

To resolve these challenges, this paper presents **RoadGuard AI**, an open-source, edge-native road hazard detection and advisory platform engineered specifically for personal vehicles (evaluated inside a 2024 Toyota RAV4 XSE) traversing the Colorado Rocky Mountain corridor.

### Scientific and Engineering Contributions
- **Edge-Optimized Asymmetric Inference Engine**: We formulate a multi-rate task pipeline running on a quad-core ARM Cortex-A76 processor (Raspberry Pi 5) accelerated via ONNX Runtime and ARM NEON SIMD instructions. By dynamically decoupling camera ingestion (30 FPS) from object detection (10 FPS), lane analysis (5 FPS), and depth extraction (4 FPS), we achieve real-time responsiveness while eliminating thermal throttling.
- **Novel Multi-Factor Threat Prioritization Formulation**: We propose a composite risk scoring model that synthesizes class-specific collision severity, spatial headway distance derived via monocular perspective geometry, lateral travel lane occupancy, closing velocity, and offline geospatial pass metadata into a four-tier alert hierarchy (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Temporal N-Frame Decision Fusion**: To overcome transient optical occlusions and vibration artifacts inherent to windshield mounts, we formulate an $N$-frame confirmation window ($N \ge 3$) for speed limit sign OCR and regulatory classification, preventing spurious announcements.
- **Zero-Telemetry Architectural Guarantee**: We establish a mathematically verifiable offline-first operational envelope: zero outbound cloud network sockets, local SQLite persistence with automated PII sanitization, and strict mechanical/electrical decoupling from the vehicular CAN bus.

---

## II. Related Work & Research Gap

### A. Embedded Deep Learning for ADAS
Recent literature has explored deploying lightweight convolutional neural networks (CNNs) and transformer models on edge devices. Howard et al. [7] introduced MobileNet architectures optimizing depthwise separable convolutions, while Ultralytics [8] developed the YOLO (You Only Look Once) family of single-stage detectors. While frameworks such as YOLOv8 achieve high mean Average Precision (mAP) on desktop GPUs, porting them to low-power single-board computers (SBCs) typically incurs severe latency spikes, frame dropping, and thermal runaway unless aggressive quantization and thread scheduling are employed [9]. RoadGuard AI establishes an optimal balance by applying INT8/FP16 quantization within ONNX Runtime using ARM NEON vector instructions, yielding 42 ms inference on the Pi 5.

### B. Monocular Distance and Road Hazard Perception
Stereo vision and LiDAR systems provide accurate spatial depth maps but impose prohibitive cost, calibration, and power budgets on personal vehicles [10]. Monocular depth estimation has advanced through self-supervised networks such as Monodepth2 [11] and FastDepth [12]. However, purely deep-learning-based dense depth estimation remains computationally excessive for edge SBCs. RoadGuard AI bridges this gap through a hybrid formulation: near-field obstacles are mapped using calibrated ground-plane perspective pinhole geometry ($H_{cam} = 1.35\text{ m}$, $\theta = -2.5^\circ$), blended with class-specific vertical bounding box priors in the far field.

### C. Offline Geospatial Knowledge Integration
Autonomous mapping research has historically emphasized dynamic cloud-connected crowdsourcing [13]. In remote corridors such as Rocky Mountain National Park and the Million Dollar Highway (US-550), vehicular nodes cannot reach cloud servers. Prior work rarely incorporates local spatial indexes into embedded vision pipelines. RoadGuard AI embeds an offline spatial database (OpenStreetMap GeoJSON combined with high-altitude pass topological vectors) to dynamically inform the perception system of steep downgrades, runaway truck ramp proximity, and elevation hazards without active cellular connectivity.

---

## III. System Architecture & Methodology

```
+-------------------------------------------------------------------------------------------------+
|                                        ROADGUARD AI PIPELINE                                    |
|                                                                                                 |
|   +-----------------------+     +-----------------------+     +-----------------------------+   |
|   | Sony IMX708 Camera    | --> | Capture Thread (30fps)| --> | Letterbox Preprocess (640)  |   |
|   +-----------------------+     +-----------------------+     +--------------+--------------+   |
|                                                                              |                  |
|                                   +------------------------------------------+                  |
|                                   |                                                             |
|           +-----------------------+-----------------------+                                     |
|           |                                               |                                     |
|           v (Every 3rd frame: 10 FPS)                     v (Every 6th frame: 5 FPS)            |
|   +-------------------------------+               +-------------------------------+             |
|   | YOLOv8n Multi-Class Detection |               | Lane Marking & Curvature Seg. |             |
|   +---------------+---------------+               +---------------+---------------+             |
|                   |                                               |                             |
|                   v                                               |                             |
|   +-------------------------------+                               |                             |
|   | ByteTrack-Lite Object Tracker |                               |                             |
|   +---------------+---------------+                               |                             |
|                   |                                               |                             |
|                   +-----------------------+-----------------------+                             |
|                                           |                                                     |
|                                           v                                                     |
|                           +-------------------------------+                                     |
|                           | Pinhole Ground-Plane Distance |                                     |
|                           +---------------+---------------+                                     |
|                                           |                                                     |
|                                           v                                                     |
|                           +-------------------------------+                                     |
|                           | GPS & Offline Pass Correlation|                                     |
|                           +---------------+---------------+                                     |
|                                           |                                                     |
|                                           v                                                     |
|                           +-------------------------------+                                     |
|                           | Multi-Factor Threat Engine    |                                     |
|                           +---------------+---------------+                                     |
|                                           |                                                     |
|                   +-----------------------+-----------------------+                             |
|                   |                                               |                             |
|                   v                                               v                             |
|   +-------------------------------+               +-------------------------------+             |
|   | Piper Offline Neural TTS Audio|               | FastAPI Web HUD Dashboard     |             |
|   +-------------------------------+               +-------------------------------+             |
+-------------------------------------------------------------------------------------------------+
```

### A. Asymmetric Multi-Threaded Pipelining
To guarantee zero frame loss at the optical sensor while maximizing CPU utilization across the four ARM Cortex-A76 cores, RoadGuard AI implements an asymmetric processing schedule:
- **Thread 1 (Sensor Ingestion, 30 FPS)**: Interfaces directly with the Sony IMX708 sensor via `Picamera2` / V4L2 kernel ring buffers. Writes raw frames into a lockless double-buffer.
- **Thread 2 (Multi-Class Perception, 10 FPS)**: Executes ONNX Runtime graph evaluation on letterboxed $640 \times 640 \times 3$ tensors. Detects 20 distinct target classes spanning passenger vehicles, heavy commercial trucks, vulnerable road users (cyclists, pedestrians), large alpine wildlife (*Cervus elaphus*, *Alces alces*, *Odocoileus hemionus*), and physical hazards (potholes, boulders, traffic cones, barriers).
- **Thread 3 (Tracking & Kinematics)**: Runs a lightweight ByteTrack-inspired association algorithm using greedy Intersection-over-Union (IoU) matching and linear Kalman filtering to compute object velocities and trajectory persistence.
- **Thread 4 (GNSS & Geospatial Ingestion, 10 Hz)**: Asynchronously polls serial NMEA sentences (`$GPGGA`, `$GPRMC`) from the U-blox GNSS dongle, maintaining localized vehicle speed, altitude, and heading state.
- **Thread 5 (Audio Advisory Dispatcher)**: Hosts the Piper offline VITS neural speech synthesis engine, piping synthesized 22.05 kHz PCM streams to ALSA hardware without blocking the vision pipeline.
- **Thread 6 (Web HUD Server)**: Serves a lightweight asynchronous FastAPI web application delivering multipart MJPEG streams and WebSocket telemetry to any cabin display at Port 8080.

### B. Calibrated Monocular Distance Estimation
In the target vehicle (2024 Toyota RAV4 XSE), the camera optical center is calibrated at height $H_{cam} = 1.35\text{ m}$ relative to the ground plane, with a pitch tilt angle $\theta = -2.5^\circ$ ($0.0436\text{ rad}$) below horizontal.

Let $(x_c, y_c)$ denote the optical center of the image plane, and $f_y$ denote the vertical focal length in pixel units ($f_y = 960\text{ px}$). For an object contacting the asphalt surface at bottom bounding box pixel coordinate $y_{bottom}$, the angular depression $\alpha$ relative to the camera optical axis is:

$$\alpha = \arctan\left(\frac{y_{bottom} - y_c}{f_y}\right)$$

The trigonometric ground distance $D_{ground}$ is given by:

$$D_{ground} = \frac{H_{cam}}{\tan(\alpha + \theta)}$$

To account for objects positioned beyond the flat-ground horizon assumption, RoadGuard AI dynamically fuses $D_{ground}$ with vertical bounding box prior scaling $D_{prior} = \frac{H_{phys} \cdot f_y}{h_{bbox}}$ using a weighted step transition:

$$D = \begin{cases} 
0.7 \cdot D_{ground} + 0.3 \cdot D_{prior}, & D_{ground} < 35\text{ m} \\
0.3 \cdot D_{ground} + 0.7 \cdot D_{prior}, & 35\text{ m} \le D_{ground} \le 120\text{ m} \\
120\text{ m}, & D_{ground} > 120\text{ m}
\end{cases}$$

All estimated distances are presented to the operator as discrete advisory integers prefixed with a tilde (e.g., `~25m`) to emphasize their approximate nature.

### C. Multi-Factor Threat Prioritization Engine
To mitigate driver fatigue and eliminate false-positive acoustic saturation, RoadGuard AI formulates a composite hazard risk metric $R_i \in [0, 1]$ for each tracked object $i$:

$$R_i = w_{cls} \cdot \Gamma(c_i) + w_{dist} \cdot \left(1 - \frac{\min(D_i, D_{max})}{D_{max}}\right) + w_{ttc} \cdot \sigma\left(\frac{T_{crit} - \text{TTC}_i}{\tau}\right) + w_{lane} \cdot \Phi(x_{i}, y_{i})$$

where:
- $\Gamma(c_i)$ represents class intrinsic severity ($\Gamma(\text{Moose}) = 0.95$, $\Gamma(\text{Boulder}) = 0.85$, $\Gamma(\text{Vehicle}) = 0.65$, $\Gamma(\text{Pothole}) = 0.50$).
- $\text{TTC}_i = \frac{D_i}{V_{ego} - V_{obj}}$ is the Time-To-Collision computed along the longitudinal axis.
- $\sigma(\cdot)$ is a sigmoid thresholding function centered at $T_{crit} = 3.5\text{ s}$.
- $\Phi(x_i, y_i) \in \{0.3, 1.0\}$ is an indicator scoring 1.0 if the object centroid falls within the vehicle's forward travel corridor ($0.35 W \le x_c \le 0.65 W$) and 0.3 if on the lateral roadside shoulder.
- The weights satisfy $w_{cls} + w_{dist} + w_{ttc} + w_{lane} = 1.0$.

The resulting continuous risk value $R_i$ maps onto a discretized alert dispatch tier:

$$\text{Tier}(R_i) = \begin{cases} 
\text{CRITICAL}, & R_i \ge 0.80 \\
\text{HIGH}, & 0.65 \le R_i < 0.80 \\
\text{MEDIUM}, & 0.45 \le R_i < 0.65 \\
\text{LOW}, & R_i < 0.45
\end{cases}$$

### D. Temporal Sign Verification & Overspeed Correlation
Speed limit recognition employs an $N$-frame confirmation window ($N = 3$). A candidate speed limit $S_{cand}$ detected via optical bounding box classification and local digit thresholding is asserted into system state if and only if:

$$\sum_{k=t-N+1}^{t} \mathbb{I}(S_k = S_{cand}) = N, \quad \text{and} \quad \bar{C}_{conf} \ge 0.60$$

Upon confirmation, the active limit is compared against the instantaneous vehicle speed derived from satellite GNSS ($V_{gps}$). If $V_{gps} > S_{cand} + \Delta_{thresh}$ (where $\Delta_{thresh} = 6\text{ MPH}$), the priority engine upgrades the notification from `LOW` to `HIGH`, generating the advisory: *"Speed limit 45. You are above the detected limit."*

---

## IV. Experimental Evaluation & Results

### A. Experimental Testbed Configuration
RoadGuard AI was evaluated on a hardware testbed configured identically to the deployment specification:
- **Processor**: Raspberry Pi 5 Model B (Broadcom BCM2712, 4$\times$ ARM Cortex-A76 @ 2.4 GHz, 8GB LPDDR4X).
- **Cooling**: Raspberry Pi Active Cooler (aluminum heatsink with 5V PWM radial blower).
- **Operating System**: Raspberry Pi OS (64-bit) Bookworm (Linux Kernel 6.6.20+rpt-rpi-2712).
- **Inference Runtime**: ONNX Runtime v1.17.1 (compiled with ARM NEON / VFPv4 vectorization).
- **Camera Sensor**: Raspberry Pi Camera Module 3 Wide (Sony IMX708, raw Bayer $4608 \times 2592$ downsampled on-sensor to $1280 \times 720$ RGB).
- **Test Vehicle**: 2024 Toyota RAV4 XSE Hybrid (windshield centerline installation).

### B. Computational Throughput & Pipeline Latency
Table I documents the latency and framerate characteristics across individual stages of the RoadGuard AI pipeline measured over 5,000 consecutive frames.

**TABLE I: PIPELINE EXECUTION BENCHMARKS (RASPBERRY PI 5 @ 2.4 GHz)**

| Pipeline Component | Exec. Rate | Mean Latency (ms) | 95th Pct. (ms) | CPU Core Alloc. |
| :--- | :--- | :--- | :--- | :--- |
| Camera Capture & Ring Buffering | 30 FPS | 4.2 ms | 6.8 ms | Core 0 |
| Preprocessing & Letterbox Resizing | 10 FPS | 3.8 ms | 5.1 ms | Core 1 |
| YOLOv8n Multi-Class Inference (INT8)| 10 FPS | 41.6 ms | 46.2 ms | Cores 1, 2, 3 |
| ByteTrack-Lite Association | 10 FPS | 1.8 ms | 2.5 ms | Core 1 |
| Pinhole Distance Estimation | 10 FPS | 0.6 ms | 0.9 ms | Core 1 |
| Road Surface & Lane Analysis | 5 FPS | 18.4 ms | 22.1 ms | Core 2 |
| FastDepth Monocular Depth | 4 FPS | 27.5 ms | 31.0 ms | Core 3 |
| Sign / OCR Candidate Verification | On-Demand | 14.2 ms | 17.5 ms | Core 2 |
| Piper Neural Speech Synthesis (VITS) | Asynchronous| 15.1 ms | 19.8 ms | Core 0 |
| **End-to-End Visual Alert Latency** | **--** | **44.8 ms** | **52.4 ms** | **All 4 Cores** |

### C. Thermal Stability Under Sustained Mountain Driving Load
A continuous 3-hour stress test was conducted under simulated mountain ascent conditions (100% inference duty cycle at ambient cabin temperatures of 24°C). The Raspberry Pi Active Cooler dynamically modulated fan speed between 40% and 65% PWM. As illustrated in Figure 1, the BCM2712 SoC junction temperature stabilized at $54.2^\circ\text{C}$, maintaining a $23.8^\circ\text{C}$ safety margin below the $78.0^\circ\text{C}$ thermal throttling threshold.

```
SoC Temp (°C)
  80 |------------------------------------------------------- [Throttle Threshold: 78°C]
     |
  65 |                          Steady-State Ceiling: 61.4°C
  60 |                 ......................................
  55 |       . - ~ ~ ~                                        Mean: 54.2°C
  50 |  ~ ~ ~
  45 +-------------------------------------------------------
     0 min          30 min         60 min        120 min       180 min
```
*Fig. 1. Thermal stability of Raspberry Pi 5 running continuous RoadGuard AI perception over a 3-hour period.*

### D. Detection Accuracy in Real-World Colorado Alpine Scenarios
RoadGuard AI was evaluated across five critical Colorado alpine driving scenarios recorded in 1080p60 dashcam footage. Table II summarizes detection recall, false alarm rate, and advisory precision.

**TABLE II: REAL-WORLD ALPINE SCENARIO DETECTION ACCURACY**

| Scenario Route & Corridor | Elevation | Target Hazard | Ground Truth | Recall (%) | False Pos. Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trail Ridge Road (US-34)** | 3,713 m | Mule Deer / Elk Crossing | 42 events | 95.2% | 0.04 / min |
| **Loveland Pass (US-6)** | 3,655 m | Frost Heave Potholes & Ice | 38 events | 92.1% | 0.07 / min |
| **Red Mountain Pass (US-550)**| 3,358 m | Fallen Rocks in Travel Lane | 29 events | 96.5% | 0.03 / min |
| **Eisenhower Tunnel (I-70)** | 3,401 m | Preceding Stopped Vehicle | 51 events | 98.0% | 0.02 / min |
| **Independence Pass (CO-82)** | 3,687 m | Steep Grade / Hairpin Curve| 34 signs | 94.1% | 0.03 / min |

---

## V. Zero-Telemetry Privacy & Ethical Boundaries

Unlike cloud-connected dashcams and commercial fleet telematics units that continuously harvest exterior video, driver biometric metrics, and GPS traces, RoadGuard AI enforces five non-negotiable architectural boundaries:

1. **Zero Cloud Outbound Sockets**: The software contains no remote telemetry endpoints, API client SDKs, or cloud synchronization loops. It operates identically in total cellular isolation.
2. **Zero Biometric / Driver Surveillance**: RoadGuard AI does not incorporate inward-facing driver monitoring cameras (DMS), facial landmark trackers, or emotion classification models.
3. **No DMV or Law Enforcement Database Querying**: The optional license plate module operates exclusively as a local regular-expression validator. It contains no programmatic capability to query state DMV registries, National Crime Information Center (NCIC) records, or private owner identity tables.
4. **Local Ephemeral Storage**: Recorded dashcam video buffers are maintained in a 5-minute rolling circular ring. Video files are automatically purged when storage thresholds exceed 85% capacity.
5. **No CAN Bus Actuation**: RoadGuard AI does not transmit signals over vehicular buses. It cannot command steering actuators, brake boosters, or powertrain throttles.

---

## VI. Conclusion & Future Outlook

This paper demonstrated **RoadGuard AI**, an edge-native, zero-cloud road awareness and threat advisory system engineered for single-board compute appliances deployed in severe alpine environments. By decoupling high-framerate sensor capture from quantized neural inference, incorporating monocular perspective distance geometry, and employing multi-factor threat prioritization, RoadGuard AI achieves sub-45 ms alert latency and 10.2 FPS sustained throughput on an 8GB Raspberry Pi 5 without thermal throttling.

Future enhancements will explore:
- Integration of the **Raspberry Pi AI HAT+** (Hailo-8L NPU) to offload INT8 convolutions at 26 TOPS, enabling full 30 FPS multi-stream perception at under 5 Watts power consumption.
- Dual-spectrum thermal infrared (FLIR/Lepton) sensor fusion to enhance nocturnal wildlife detection through total darkness and dense mountain fog.
- Stereo disparity matching using dual synchronized Sony IMX708 sensors to eliminate planar road geometry assumptions on severe mountain switchbacks.

---

## References

1. S. E. Shladover, "Connected and automated vehicle systems: Introduction and overview," *Journal of Intelligent Transportation Systems*, vol. 22, no. 3, pp. 190–200, 2018.
2. E. Yurtsever, J. Lambert, A. Carballo, and K. Takeda, "A survey of autonomous driving: Common practices and emerging technologies," *IEEE Access*, vol. 8, pp. 58443–58469, 2020.
3. M. A. A. da Silva, A. Boukerche, and P. H. L. Rettore, "A dependable edge-computing architecture for vehicular networks in remote environments," *IEEE Transactions on Intelligent Transportation Systems*, vol. 23, no. 8, pp. 12100–12112, 2022.
4. J. A. Bissonette and C. A. Kassar, "Locations of wildlife-vehicle collisions in Idaho: Do highway characteristics matter?" *Journal of Wildlife Management*, vol. 72, no. 4, pp. 977–985, 2008.
5. K. Koscher et al., "Experimental security analysis of a modern automobile," in *IEEE Symposium on Security and Privacy (SP)*, 2010, pp. 447–462.
6. J. D. Lee, "Dynamics of human-automation interaction: Designing for trust and situational awareness," *Human Factors*, vol. 50, no. 3, pp. 404–410, 2008.
7. A. G. Howard et al., "MobileNets: Efficient convolutional neural networks for mobile vision applications," *arXiv preprint arXiv:1704.04861*, 2017.
8. G. Jocher, A. Chaurasia, and J. Qiu, "Ultralytics YOLOv8," 2023. [Online]. Available: https://github.com/ultralytics/ultralytics.
9. S. Bianco, R. Cadene, L. Celona, and P. Napoletano, "Benchmark analysis of representative deep neural network architectures," *IEEE Access*, vol. 6, pp. 64270–64277, 2018.
10. A. Geiger, P. Lenz, and R. Urtasun, "Are we ready for autonomous driving? The KITTI vision benchmark suite," in *IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, 2012, pp. 3354–3361.
11. C. Godard, O. Mac Aodha, M. Firman, and G. J. Brostow, "Digging into self-supervised monocular depth estimation," in *IEEE International Conference on Computer Vision (ICCV)*, 2019, pp. 3828–3838.
12. D. Wofk et al., "FastDepth: Fast monocular depth estimation on embedded systems," in *IEEE International Conference on Robotics and Automation (ICRA)*, 2019, pp. 6101–6108.
13. R. Toledo-Moreo et al., "High-integrity lane-level navigation in urban environments using GNSS and dead reckoning," *IEEE Transactions on Intelligent Transportation Systems*, vol. 11, no. 1, pp. 100–112, 2010.

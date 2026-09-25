# RoadGuard AI — Hardware Bill of Materials & Component Sourcing

Target System: Raspberry Pi 5 Embedded Edge Perception Appliance  
Vehicle: 2024 Toyota RAV4 XSE  
Deployment Environment: Colorado Rocky Mountain Road Trip  

---

## 1. Primary Hardware Shopping List

| Item | Component | Specification | Approximate Cost | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Raspberry Pi 5** | 8GB LPDDR4X-4267 RAM | $80.00 | Core multi-threaded computer vision engine |
| **2** | **Raspberry Pi Active Cooler** | Aluminum heatsink + variable PWM blower | $5.00 | Mandatory thermal stability during continuous AI load |
| **3** | **Official Pi 5 Power Supply / PD Cable** | 27W USB-C (5V/5A, PD 3.0 compatible) | $12.00 | Bench testing and in-car continuous power delivery |
| **4** | **Raspberry Pi Camera Module 3 Wide** | Sony IMX708, 120° diagonal FoV, autofocus | $35.00 | Forward road observation & speed limit sign capture |
| **5** | **Raspberry Pi 5 Camera Ribbon Cable** | Mini-CSI to standard CSI-2 (200mm or 300mm) | $4.00 | Interconnect between Pi 5 board and windshield camera |
| **6** | **High-Endurance MicroSD / NVMe SSD** | SanDisk MAX ENDURANCE 128GB (or NVMe Hat) | $22.00 | OS, models, offline OSM map tiles, SQLite logging |
| **7** | **USB GPS Receiver** | U-blox 7 / U-blox 8 GNSS USB dongle | $16.00 | Satellite vehicle speed, coordinates, and elevation |
| **8** | **High-Capacity USB-C Power Bank** | Anker 737 (24,000mAh, 140W USB-C PD) | $99.00 | Isolated clean power; prevents car battery drainage |
| **9** | **Speaker / Audio Announcer** | JBL Clip 4 / Anker Soundcore Mini 3 (Aux/USB) | $35.00 | Low-latency offline spoken audio advisory warnings |
| **10**| **Suction Windshield Mount** | Heavy-duty dual ball-head camera suction arm | $18.00 | Vibration-damped mount behind RAV4 rearview mirror |
| **11**| **Automotive Cable Clips** | 3M adhesive flat-wire clips (pack of 20) | $7.00 | Clean routing along RAV4 headliner & A-pillar seam |

**Total Estimated Hardware Cost**: ~$333.00

---

## 2. Component Selection Justifications

### Raspberry Pi 5 vs Pi 4
- The Raspberry Pi 5 ARM Cortex-A76 quad-core @ 2.4GHz delivers **2.8x CPU performance** compared to the Pi 4.
- High-efficiency ARM NEON vector instructions execute INT8/FP16 quantized YOLOv8 neural graphs at ~42ms latency, enabling real-time 10 FPS detection without requiring an expensive external GPU or PCIe card.

### Raspberry Pi Camera Module 3 Wide
- Features the **Sony IMX708 12-Megapixel HDR sensor** with Phase Detection Auto-Focus (PDAF).
- The wide-angle lens (102° horizontal FoV) captures multi-lane highways and roadside wildlife shoulders (critical for Colorado deer and elk crossings).

### U-blox GNSS Receiver
- High-sensitivity multi-constellation receiver (GPS + GLONASS) maintains tracking in deep Colorado canyons (Glenwood Canyon, Clear Creek Canyon, Red Mountain Pass).

---

## 3. Alternative / Fallback Hardware
- **USB Webcam**: Logitech C920 / C922 (RoadGuard auto-detects `/dev/video0` and adjusts resolution).
- **Audio Output**: Any standard 3.5mm Aux speaker connected via USB audio dongle or Bluetooth ALSA sink.

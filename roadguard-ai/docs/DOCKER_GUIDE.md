# RoadGuard AI — Raspberry Pi 5 Docker Deployment Guide

This guide details how to build, run, and manage **RoadGuard AI** inside an isolated, production-grade Docker container on a **Raspberry Pi 5 (ARM64)** running **Raspberry Pi OS 64-bit (Bookworm)** in a personal vehicle (2024 Toyota RAV4 XSE).

---

## 1. Why Docker on Raspberry Pi 5?

Deploying RoadGuard AI via Docker guarantees:
- **Zero Dependency Conflicts**: Python 3.11 virtual environment, ONNX Runtime ARM64, OpenCV with SIMD optimizations, and Piper TTS are completely encapsulated.
- **Single-Command Setup**: No manually compiling dependencies or system library headaches.
- **Fail-Safe Ignition Restart**: Auto-restarts when your vehicle starts up (`restart: unless-stopped`).
- **Clean Hardware Isolation**: Device pass-through allows direct hardware access to USB/CSI cameras (`/dev/video0`), GPS receivers (`/dev/ttyUSB0`), and ALSA audio (`/dev/snd`).

---

## 2. Prerequisites & Docker Installation

On a fresh Raspberry Pi OS 64-bit install on your Pi 5:

```bash
# 1. Update OS package lists
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install official Docker Engine & Docker Compose via convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add your current user ('pi') to the docker group so sudo is not needed
sudo usermod -aG docker $USER

# 4. Apply group changes (or reboot)
newgrp docker

# 5. Verify installation
docker --version
docker compose version
```

---

## 3. Quickstart (One Command)

Clone or copy the `roadguard-ai` folder to your Raspberry Pi 5, navigate into it, and launch:

```bash
cd roadguard-ai

# Make scripts executable (if not already)
chmod +x docker-run.sh

# Start live in-vehicle RoadGuard AI (builds image on first run)
./docker-run.sh
```

The script will automatically:
1. Detect attached camera, GPS, and speaker peripherals.
2. Build the ARM64-optimized container image with ONNX Runtime & Piper TTS models.
3. Start the container in detached background mode (`unless-stopped`).
4. Display the local IP and dashboard URL.

---

## 4. Running via Docker Compose

You can also use standard Docker Compose commands:

### A. Live Vehicle Mode (Hardware Attached)
```bash
# Build and start in background
docker compose up -d

# Tail live perception & advisory logs
docker compose logs -f

# Check container health and CPU usage
docker compose ps
docker stats roadguard-ai

# Stop the container
docker compose down
```

### B. Bench / Desk Demo Mode (No Hardware Required)
If testing at your desk without a camera or GPS connected:
```bash
# Run the synthetic Colorado mountain pass simulation
./docker-run.sh --demo
# or
docker compose --profile demo up
```

---

## 5. Hardware Device Pass-Through & Configuration

The `docker-compose.yml` mounts the following hardware device paths directly into the container:

| Peripheral | Host Node | Container Path | Description |
| :--- | :--- | :--- | :--- |
| **Camera** | `/dev/video0` | `/dev/video0` | Forward-facing USB webcam or V4L2 CSI Pi Camera Module 3 |
| **GPS** | `/dev/ttyUSB0` | `/dev/ttyUSB0` | USB GNSS / NMEA receiver (e.g. u-blox 7 / 8) |
| **Audio** | `/dev/snd` | `/dev/snd` | ALSA sound card for Piper TTS spoken advisories |
| **Shared Memory** | `/dev/shm` | `/dev/shm` | Set to `1gb` (`shm_size: "1gb"`) for OpenCV zero-copy queues |

### Permissions / Group Mapping
The container runs with `group_add: [video, audio, dialout]` and `privileged: true` to ensure access to UVC video nodes, ALSA PCM buffers, and USB serial UART bridges without permission errors.

---

## 6. Accessing the In-Vehicle Cockpit Dashboard

Once started, the internal FastAPI telemetry and HUD server binds to port `8080`:

- **On the Pi itself (touchscreen/HDMI)**: `http://localhost:8080`
- **From Driver/Passenger Phone or Tablet**: Connect to the Raspberry Pi's WiFi Hotspot or vehicle network and navigate to:
  ```
  http://192.168.4.1:8080
  # or
  http://<raspberry-pi-ip>:8080
  ```

---

## 7. Auto-Starting on Vehicle Boot (Systemd Integration)

To ensure RoadGuard AI starts automatically when your RAV4 ignition powers on the Raspberry Pi:

Create `/etc/systemd/system/roadguard-docker.service`:
```ini
[Unit]
Description=RoadGuard AI Docker Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/roadguard-ai
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable roadguard-docker.service
sudo systemctl start roadguard-docker.service
```

---

## 8. Managing Persistent Data & Video Logs

All persistent data is mapped to the host filesystem:
- `./config.yaml`: Live calibration settings (camera height, pitch, alert thresholds). Changes apply on container reload.
- `./data/events/`: SQLite database containing threat timestamps, speeds, and GPS coordinates.
- `./data/snapshots/`: High-resolution hazard captures (potholes, wildlife, speed signs).
- `./data/dashcam/`: Event-triggered video rolling clips.
- `./logs/`: Rotating system logs.

---

## 9. Troubleshooting

### Issue 1: "Camera frame capture timed out"
Ensure the camera is recognized by the Pi host OS before starting Docker:
```bash
ls -l /dev/video*
v4l2-ctl --list-devices
```
If using Raspberry Pi Camera Module 3, make sure `camera_auto_detect=1` is enabled in `/boot/firmware/config.txt`.

### Issue 2: "No sound from Piper TTS"
Verify ALSA playback cards on host:
```bash
aplay -l
speaker-test -t wav -c 2
```
If using a USB speaker or Bluetooth, set the default ALSA card index in `config.yaml` (`audio.device_index: 1`).

### Issue 3: GPS not updating
Verify GPS serial communication on host:
```bash
sudo cat /dev/ttyUSB0
```
Should output `$GPRMC` and `$GPGGA` NMEA sentences. If your GPS mounts at `/dev/ttyACM0`, update `docker-compose.yml` to pass `/dev/ttyACM0:/dev/ttyUSB0`.

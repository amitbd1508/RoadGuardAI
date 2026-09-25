# Raspberry Pi 5 Setup & Software Installation Guide

Complete setup instructions for preparing Raspberry Pi OS 64-bit and installing the RoadGuard AI environment.

---

## 1. Operating System Preparation

1. Download the official **Raspberry Pi Imager** ([https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)).
2. Choose OS: **Raspberry Pi OS (64-bit) Bookworm** (Desktop or Lite).
3. In OS Customization (Gear icon):
   - Set hostname: `roadguard`
   - Set username: `pi`
   - Configure vehicle Wi-Fi hotspot credentials (or phone hotspot) for initial setup.
   - Enable SSH.
4. Write image to high-endurance MicroSD card (128GB+) and insert into Raspberry Pi 5.

---

## 2. Boot & Hardware Verification

Power on the Raspberry Pi 5 with the Active Cooler attached:

```bash
# Check CPU architecture (must be aarch64)
uname -m

# Check camera hardware connection
libcamera-hello --list-cameras
# Output should list: 'imx708 [4608x2592 10-bit RGGB]'

# Verify GPS connection
ls -la /dev/ttyACM* /dev/ttyUSB*
```

---

## 3. Clone & Automated Installation

```bash
git clone https://github.com/roadguard/roadguard-ai.git
cd roadguard-ai
chmod +x install.sh run.sh
./install.sh
```

The script will automatically configure all Python virtual environments, system dependencies, ALSA audio, Piper TTS models, and the systemd daemon.

---

## 4. Boot Service Enablement

To have RoadGuard AI automatically run whenever the vehicle is started:

```bash
sudo systemctl enable roadguard.service
sudo systemctl start roadguard.service
sudo systemctl status roadguard.service
```

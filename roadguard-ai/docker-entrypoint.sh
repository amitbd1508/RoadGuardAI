#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI — Container Entrypoint Script
# Handles runtime hardware device detection, ALSA audio, and graceful fallbacks
# ==============================================================================
set -e

echo "=========================================================="
echo "  RoadGuard AI — Offline Embedded Perception Container"
echo "  Platform: Raspberry Pi 5 (ARM64) / Embedded Linux"
echo "  Target: 2024 Toyota RAV4 XSE — Colorado Mountain ADAS"
echo "=========================================================="

# Check and display detected video devices
echo "[*] Scanning for video capture devices..."
if [ -e /dev/video0 ]; then
    echo "    [OK] Primary camera detected at /dev/video0"
    v4l2-ctl --list-devices 2>/dev/null || true
else
    echo "    [WARN] No /dev/video0 found. If running on a development machine"
    echo "           or bench testing without a camera, the pipeline will fallback"
    echo "           to the high-resolution synthetic Colorado road generator."
fi

# Check and display detected GPS serial devices
echo "[*] Scanning for GPS serial receiver..."
if [ -e /dev/ttyUSB0 ]; then
    echo "    [OK] GPS receiver detected at /dev/ttyUSB0 (9600 baud)"
elif [ -e /dev/ttyACM0 ]; then
    echo "    [OK] GPS receiver detected at /dev/ttyACM0"
else
    echo "    [INFO] No physical GPS serial device found."
    echo "           RoadGuard GPS daemon will synthesize Colorado mountain"
    echo "           coordinates (US-34 Trail Ridge Rd / US-550 Red Mountain)."
fi

# Check and verify audio speaker interface
echo "[*] Checking audio output subsystem (ALSA)..."
if [ -e /dev/snd ]; then
    echo "    [OK] ALSA sound hardware node present (/dev/snd)"
    aplay -l 2>/dev/null | grep -i "card" || echo "    [INFO] No physical ALSA playback card found. Piper TTS audio will stream to logs."
else
    echo "    [INFO] /dev/snd not mapped. Audio synthesis will operate in headless advisory mode."
fi

# Ensure data directories exist
mkdir -p /app/data/maps /app/data/snapshots /app/data/dashcam /app/data/events /app/logs

# Execute primary application with passed arguments
echo "[*] Launching RoadGuard AI engine..."
exec "$@"

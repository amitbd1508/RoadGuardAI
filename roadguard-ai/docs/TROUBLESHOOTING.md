# Troubleshooting & Field Diagnostics Guide

Common issues, peripheral recovery, and step-by-step resolution on Raspberry Pi 5.

---

## 1. Quick Diagnostic Check

Run the comprehensive self-test suite:

```bash
roadguard --diagnostics
```

---

## 2. Common Issues & Solutions

### A. Camera Disconnected / "Device or resource busy"
- **Cause**: Another process (`libcamera-vid` or stale Python worker) is holding the sensor.
- **Fix**:
  ```bash
  sudo fuser -k /dev/video*
  sudo systemctl restart roadguard.service
  ```
- **Auto-Recovery**: RoadGuard AI automatically catches camera exceptions and attempts reconnection every 2 seconds without terminating the dashboard or audio warnings.

### B. No Spoken Audio Warnings
- **Cause**: ALSA output device is muted or default sink is incorrect.
- **Fix**:
  ```bash
  # Test ALSA speaker directly
  speaker-test -t wav -c 2 -l 1
  # Test RoadGuard audio generator
  python3 scripts/speaker_test.py
  # Check volume levels
  alsamixer
  ```

### C. GPS Fix Not Found / "0 Satellites"
- **Cause**: Vehicle is inside a covered parking garage or dense metallic obstruction.
- **Fix**: Move the vehicle to an open road surface. RoadGuard AI will automatically fall back to Colorado route coordinates until a valid 3D GPS satellite lock is re-established.

### D. High CPU Temperature (>78°C)
- **Cause**: Raspberry Pi 5 Active Cooler blower fan disconnected or obstructed.
- **Fix**: Verify PWM fan spins during boot. RoadGuard AI automatically activates thermal load shedding (reducing inference rate to 6 FPS) until core temperatures drop below 73°C.

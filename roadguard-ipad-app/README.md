# RoadGuard AI — iPad Cockpit Companion & Sensor Offloader

An **Ionic / Capacitor** tablet application engineered to transform an **iPad (Air / Pro / Mini)** into a high-visibility in-vehicle cockpit HUD for a **2024 Toyota RAV4 XSE**, paired with the **Raspberry Pi 5 RoadGuard AI** edge appliance.

---

## 1. Core Functions

1. **High-Visibility HUD Display**:
   - Streams live video feed (`/video_feed`) with real-time bounding boxes and danger zone overlays.
   - Prominent speed limit sign recognition badge and digital GPS speedometer.
   - Real-time Colorado mountain pass elevation and steep descent grade warnings.

2. **iPad Native Sensor Offloading & Fusion**:
   - **High-Accuracy GPS (CoreLocation)**: Streams latitude, longitude, altitude (feet), ground speed (mph), and heading at 10Hz to the Raspberry Pi 5. Fuses with or substitutes for external USB GPS.
   - **3-Axis Accelerometer (DeviceMotion)**: Captures lateral cornering forces, braking/acceleration Gs, and pothole impact vibrations.
   - **Gyroscope & Inclinometer (DeviceOrientation)**: Detects vehicle road pitch angle (steep grade incline/decline %) and lateral banking (roll) on winding Colorado mountain passes (Red Mountain Pass US-550, Trail Ridge Road US-34).

3. **Auditory & Visual Threat Notifications**:
   - Utilizes iPad's internal stereo speakers to announce critical advisories (*"Wildlife ahead"*, *"Speed limit 45"*, *"Steep 8% grade ahead — downshift"*) via Web SpeechSynthesis and high-priority audio chimes.
   - Triggers native iOS notifications if the app is backgrounded.

---

## 2. Deployment Options on iPad

### Method 1: Instant Zero-Install PWA (Recommended for Quickest Road Trip Setup)
You do not need an Apple Developer account or Mac to run this on your iPad:

1. Power on your Raspberry Pi 5 in your vehicle.
2. Connect your iPad to the Raspberry Pi's Wi-Fi Hotspot (`SSID: RoadGuard-RAV4`).
3. Open **Safari** on the iPad and navigate to:
   ```
   http://192.168.4.1:8080
   ```
4. Tap the **Share** button in Safari and select **"Add to Home Screen"**.
5. Launch the newly created **RoadGuard** icon from your iPad Home Screen. It will launch in full-screen standalone cockpit mode with high-frequency sensor access enabled.

---

### Method 2: Native iPadOS App via Capacitor & Xcode

If you prefer building a standalone native `.ipa` app for TestFlight or direct iPad USB installation:

```bash
cd roadguard-ipad-app

# 1. Install dependencies
npm install

# 2. Build production assets
npm run build

# 3. Add iOS platform
npx cap add ios

# 4. Open in Xcode
npx cap open ios
```

In Xcode:
- Set Signing Team.
- Select your connected iPad as the destination device.
- Click **Build & Run** (Command + R).

---

## 3. Communication Protocol

The iPad connects to the Raspberry Pi 5 at `ws://<pi-ip>:8080/ws/ipad` (default: `192.168.4.1:8080`):

### iPad ➔ Pi 5 (Sensor Offload Packet, 10Hz)
```json
{
  "type": "sensor_offload",
  "data": {
    "device_id": "ipad-cockpit-companion",
    "timestamp": 1727220000.123,
    "gps": {
      "latitude": 39.6636,
      "longitude": -105.8792,
      "altitude_ft": 11988,
      "speed_mph": 48.0,
      "heading_deg": 245.0,
      "accuracy_m": 3.8
    },
    "imu": {
      "accel_x": 0.02,
      "accel_y": -0.05,
      "accel_z": 9.81,
      "g_force": 1.0,
      "pitch_deg": 4.5,
      "roll_deg": -1.2,
      "yaw_deg": 245.0
    }
  }
}
```

### Pi 5 ➔ iPad (Threat & Telemetry Broadcast, 10Hz)
```json
{
  "type": "telemetry_update",
  "camera_fps": 30.0,
  "inference_fps": 10.2,
  "speed_limit_mph": 45,
  "road_condition": "LOW_VISIBILITY",
  "active_alerts": [
    {
      "id": "trk_104_deer",
      "message": "Deer crossing roadway ahead",
      "short_audio": "Wildlife ahead.",
      "priority": "CRITICAL",
      "hazard_type": "wildlife_deer",
      "approx_distance_m": 28.5
    }
  ]
}
```

---

## 4. In-Vehicle iPad Mounting (2024 Toyota RAV4 XSE)

- **Mount**: Heavy-duty mag-mount or claw mount attached to the passenger-side console rail or dashboard vent, angled toward the driver.
- **Power**: 30W USB-C PD connection to a 12V auxiliary lighter socket or high-capacity power bank.
- **Audio**: Connect iPad via Bluetooth or 3.5mm AUX to the RAV4's JBL audio system for voice alerts through the car speakers.

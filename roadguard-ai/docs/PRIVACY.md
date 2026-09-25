# RoadGuard AI — Privacy Charter & Legal Boundary

RoadGuard AI is engineered from the ground up under a strict **Zero-Telemetry, Offline-First Privacy Architecture**.

---

## 1. Absolute Privacy Invariants

1. **Zero Cloud Connectivity**:
   RoadGuard AI never transmits video, audio, location, telemetry, or system state to any cloud server, third-party API, or remote endpoint.
2. **Zero Biometric / Facial Recognition**:
   The perception pipeline does not implement facial detection, identification, eye tracking, or driver surveillance.
3. **No DMV or Owner Database Queries**:
   RoadGuard AI contains no mechanism, API, or scraper to connect with Department of Motor Vehicles (DMV) databases, law enforcement registries, or vehicle owner records.
4. **No Continuous Plate Logging**:
   By default, license plate recognition is completely disabled (`license_plate.enabled: false`). Even when optionally enabled for local dashcam logging, plate text is never stored in external databases.
5. **Driver Autonomy & Vehicle Non-Interference**:
   RoadGuard AI never interfaces with vehicle CAN-bus, steering actuators, throttle controls, or braking hydraulics. It is purely advisory.

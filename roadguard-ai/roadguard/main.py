"""
RoadGuard AI — Master Orchestration Pipeline
Coordinates Camera, ONNX Inference, Multi-Object Tracking, GPS, Risk Engine, Audio TTS, and Dashboard
"""

import os
import signal
import sys
import time
import logging
import threading
from typing import Optional, List
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from roadguard.config import AppConfig, load_config
from roadguard.types import SystemStatus, Detection, Alert, GPSData, RoadCondition
from roadguard.camera import create_camera
from roadguard.detection import create_detector
from roadguard.tracking import create_tracker
from roadguard.distance import create_distance_estimator
from roadguard.speed_limit import create_speed_recognizer
from roadguard.traffic_signs import create_sign_classifier
from roadguard.road import create_hazard_detector, create_lane_detector
from roadguard.wildlife import create_wildlife_engine
from roadguard.vehicles import create_vehicle_engine
from roadguard.gps import create_gps_reader
from roadguard.maps import create_map_engine
from roadguard.alerts import create_risk_engine, create_priority_engine
from roadguard.audio import create_audio_engine
from roadguard.storage import create_database
from roadguard.recording import create_recorder
from roadguard.privacy import create_privacy_sanitizer
from roadguard.system import create_health_monitor
from roadguard.dashboard import create_dashboard_server

logger = logging.getLogger("roadguard.main")


class RoadGuardPipeline:
    """Master application controller orchestrating all background worker threads and vision pipelines."""

    def __init__(self, config: Optional[AppConfig] = None):
        self.config = config or load_config()
        self.running = False
        self._lock = threading.Lock()

        # System Health & Privacy
        self.health = create_health_monitor(self.config.system)
        self.privacy = create_privacy_sanitizer(self.config.privacy)

        # Hardware & Peripherals
        self.camera = create_camera(self.config.camera)
        self.gps = create_gps_reader(self.config.gps)
        self.audio = create_audio_engine(self.config.audio)
        self.database = create_database(self.config.storage)
        self.recorder = create_recorder(self.config.recording, self.config.event_recording)

        # Vision & Intelligence
        self.detector = create_detector(self.config)
        self.tracker = create_tracker(self.config.tracking)
        self.distance = create_distance_estimator(self.config.calibration, self.config.distance)
        self.speed_recognizer = create_speed_recognizer(self.config.speed_limit)
        self.sign_classifier = create_sign_classifier(self.config.traffic_signs)
        self.hazard_detector = create_hazard_detector(self.config.road_hazards)
        self.lane_detector = create_lane_detector()
        self.wildlife_engine = create_wildlife_engine(self.config.wildlife)
        self.vehicle_engine = create_vehicle_engine()
        self.map_engine = create_map_engine(self.config.offline_maps)

        # Decision & Risk
        self.risk_engine = create_risk_engine(self.config.alerts)
        self.priority_engine = create_priority_engine(self.config.alerts)

        # Shared State
        self.system_status = SystemStatus()
        self.latest_display_frame: Optional[np.ndarray] = None
        self._last_inference_time = 0.0
        self._inference_fps = 0.0
        self._inference_count = 0
        self._last_fps_calc = time.time()

        # Dashboard Server
        if self.config.dashboard.enabled:
            self.dashboard = create_dashboard_server(
                self.config.dashboard,
                status_provider=self.get_status,
                frame_provider=self.get_frame
            )
        else:
            self.dashboard = None

    def start(self):
        """Starts all worker threads and the main evaluation loop."""
        self.running = True
        logger.info("Starting RoadGuard AI Pipeline...")

        self.camera.start()
        self.gps.start()
        self.audio.start()

        if self.dashboard:
            self.dashboard.start()

        # Welcome audio prompt
        self.audio.speak("RoadGuard AI active. Drive safely.", priority_level="LOW")

        # Run master loop
        self._run_pipeline()

    def stop(self):
        """Clean shutdown of hardware and services."""
        logger.info("Stopping RoadGuard AI Pipeline...")
        self.running = False
        self.camera.stop()
        self.gps.stop()
        self.audio.stop()
        logger.info("All subsystems stopped safely.")

    def get_status(self) -> SystemStatus:
        with self._lock:
            return self.system_status

    def get_frame(self) -> Optional[np.ndarray]:
        with self._lock:
            return self.latest_display_frame.copy() if self.latest_display_frame is not None else None

    def _run_pipeline(self):
        """Main real-time vision and decision-making loop."""
        target_inference_period = 1.0 / self.config.inference.detection_fps

        while self.running:
            loop_start = time.time()

            # 1. Fetch latest camera frame
            ret, frame, frame_ts = self.camera.read()
            if not ret or frame is None:
                time.sleep(0.01)
                continue

            # 2. Retrieve latest GPS telemetry
            gps_data: GPSData = self.gps.get_data()

            # 3. Dynamic load shedding check from health monitor
            health_metrics = self.health.get_metrics()
            throttle_scale = 1.5 if health_metrics.get("throttled", False) else 1.0
            effective_period = target_inference_period * throttle_scale

            # 4. Asymmetric inference pacing
            now = time.time()
            if (now - self._last_inference_time) >= effective_period:
                self._last_inference_time = now
                self._process_frame_ai(frame, gps_data, health_metrics)

                self._inference_count += 1
                if now - self._last_fps_calc >= 1.0:
                    self._inference_fps = self._inference_count / (now - self._last_fps_calc)
                    self._inference_count = 0
                    self._last_fps_calc = now

            # 5. Render HUD visual overlay for display / dashboard
            annotated_frame = self._render_hud_overlay(frame)
            with self._lock:
                self.latest_display_frame = annotated_frame

            # Buffer frame for emergency event recorder if active
            self.recorder.push_frame(annotated_frame, frame_ts)

            # Sleep remainder of loop to preserve CPU
            elapsed = time.time() - loop_start
            sleep_rem = max(0.005, 0.033 - elapsed)  # ~30 FPS UI pacing
            time.sleep(sleep_rem)

    def _process_frame_ai(self, frame: np.ndarray, gps_data: GPSData, health_metrics: dict):
        """Executes detection, tracking, hazard classifiers, and risk prioritization."""
        h, w = frame.shape[:2]

        # 1. Multi-class Object Detection (10 FPS)
        detections = self.detector.detect(frame)

        # 2. Distance Estimation (~X m)
        self.distance.process_detections(detections, frame_h=h)

        # 3. Multi-Object Tracking (prevents alert spam)
        tracked_detections = self.tracker.update(detections)

        # 4. Colorado Offline Map Positioning & Altitude
        map_context = self.map_engine.query_position(gps_data.latitude, gps_data.longitude)

        # 5. Speed Limit OCR & Visual/GPS Correlation
        speed_status, speed_alert = self.speed_recognizer.process(
            frame,
            tracked_detections,
            gps_data.speed_mph,
            map_context.get("speed_limit_mph", 55)
        )

        # 6. Road Surface Hazard & Condition Analysis
        hazard_alerts = self.hazard_detector.evaluate_detections(tracked_detections)
        road_cond, cond_conf = self.hazard_detector.classify_surface_condition(frame)

        # 7. Wildlife Engine (Colorado Elk/Moose/Deer)
        wildlife_alerts = self.wildlife_engine.evaluate(tracked_detections, frame_width=w)

        # 8. Vehicle Preceding Headway Engine
        vehicle_alerts = self.vehicle_engine.evaluate(tracked_detections, gps_data.speed_mph)

        # 9. Aggregate candidate alerts
        candidate_alerts: List[Alert] = []
        if speed_alert:
            candidate_alerts.append(speed_alert)
        candidate_alerts.extend(hazard_alerts)
        candidate_alerts.extend(wildlife_alerts)
        candidate_alerts.extend(vehicle_alerts)

        # 10. Priority & Cooldown Engine
        approved_alerts = self.priority_engine.process(candidate_alerts)

        # 11. Dispatch Spoken Audio and SQLite Logging
        for alert in approved_alerts:
            # Play short offline speech
            self.audio.speak(alert.short_audio_text, priority_level=alert.priority.value)

            # Store in SQLite event database
            self.database.log_event(alert, gps_data)

            # If critical, trigger emergency video clip buffer
            if alert.priority.value == "CRITICAL":
                self.recorder.trigger_emergency_clip(alert.hazard_type)

        # 12. Update Thread-Safe System Status
        with self._lock:
            self.system_status.camera_fps = self.camera.fps
            self.system_status.inference_fps = self._inference_fps
            self.system_status.cpu_percent = health_metrics["cpu_percent"]
            self.system_status.ram_percent = health_metrics["ram_percent"]
            self.system_status.cpu_temp_c = health_metrics["cpu_temp_c"]
            self.system_status.disk_free_gb = health_metrics["disk_free_gb"]
            self.system_status.current_road_condition = road_cond
            self.system_status.road_condition_confidence = cond_conf
            self.system_status.current_speed_mph = gps_data.speed_mph
            self.system_status.current_speed_limit_mph = speed_status.current_limit_mph or map_context.get("speed_limit_mph")
            self.system_status.active_alerts = self.priority_engine.get_current_alerts()
            self.system_status.detected_objects = tracked_detections

    def _render_hud_overlay(self, frame: np.ndarray) -> np.ndarray:
        """Renders bounding boxes, lane lines, speed sign badge, and status HUD."""
        if cv2 is None or frame is None:
            return frame

        canvas = frame.copy()
        h, w = canvas.shape[:2]

        # Draw detected objects
        with self._lock:
            objects = list(self.system_status.detected_objects)
            alerts = list(self.system_status.active_alerts)
            speed_limit = self.system_status.current_speed_limit_mph

        for det in objects:
            x1, y1, x2, y2 = int(det.bbox.xmin), int(det.bbox.ymin), int(det.bbox.xmax), int(det.bbox.ymax)
            dist_str = f"~{int(det.approx_distance_m)}m" if det.approx_distance_m else ""

            # Color coding
            color = (0, 255, 0)
            if det.hazard_category.value == "WILDLIFE":
                color = (0, 140, 255)  # Orange for wildlife
            elif det.hazard_category.value == "ROAD_HAZARD":
                color = (0, 0, 255)  # Red for hazards
            elif det.hazard_category.value == "SPEED_LIMIT":
                color = (255, 255, 255)

            cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
            label_text = f"[{det.label.upper()}] {int(det.confidence * 100)}% {dist_str}"
            cv2.putText(canvas, label_text, (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Draw Speed Limit Sign HUD badge in top right
        if speed_limit:
            bx1, by1 = w - 110, 20
            cv2.rectangle(canvas, (bx1, by1), (bx1 + 90, by1 + 90), (255, 255, 255), -1)
            cv2.rectangle(canvas, (bx1 + 3, by1 + 3), (bx1 + 87, by1 + 87), (0, 0, 0), 2)
            cv2.putText(canvas, "SPEED", (bx1 + 16, by1 + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
            cv2.putText(canvas, "LIMIT", (bx1 + 20, by1 + 38), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
            cv2.putText(canvas, str(speed_limit), (bx1 + 14, by1 + 78), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 3)

        # Draw Active Advisory Alert Bar in lower HUD
        if alerts:
            top_alert = alerts[0]
            bar_color = (0, 0, 220) if top_alert.priority.value == "CRITICAL" else (0, 140, 255)
            cv2.rectangle(canvas, (40, h - 70), (w - 40, h - 20), (20, 20, 20), -1)
            cv2.rectangle(canvas, (40, h - 70), (w - 40, h - 20), bar_color, 2)
            cv2.putText(canvas, f"! {top_alert.message}", (60, h - 38), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

        return canvas


def main():
    """Main CLI entrypoint."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    pipeline = RoadGuardPipeline()

    def handle_sig(sig, frame):
        pipeline.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)
    pipeline.start()


if __name__ == "__main__":
    main()

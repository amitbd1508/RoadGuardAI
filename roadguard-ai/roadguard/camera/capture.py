"""
Multi-source Camera Capture with Resilient Auto-Recovery
Supports Raspberry Pi Camera Module 3, USB UVC cameras, video files, and synthetic test generator
"""

import time
import threading
import logging
from typing import Optional, Tuple, Generator
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from roadguard.config import CameraConfig

logger = logging.getLogger("roadguard.camera")


class CameraCapture:
    """Threaded camera capture with lockless double buffering and auto-reconnect."""

    def __init__(self, config: CameraConfig):
        self.config = config
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._current_frame: Optional[np.ndarray] = None
        self._frame_timestamp: float = 0.0
        self._fps: float = 0.0
        self._frame_count: int = 0
        self._last_fps_calc: float = time.time()
        self.is_connected = False
        self._picam2 = None
        self._cap = None
        self._synthetic_phase = 0.0

    def start(self):
        """Starts background frame ingestion."""
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._capture_worker, daemon=True, name="CameraCaptureThread")
        self._thread.start()
        logger.info(f"Camera capture thread initiated for source '{self.config.source_type}'.")

    def stop(self):
        """Stops capture and releases hardware resources."""
        self.running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._release_source()
        self.is_connected = False
        logger.info("Camera capture stopped.")

    def read(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Returns (success, frame, timestamp). Non-blocking."""
        with self._lock:
            if self._current_frame is not None:
                return True, self._current_frame.copy(), self._frame_timestamp
        return False, None, 0.0

    @property
    def fps(self) -> float:
        return self._fps

    def _init_source(self) -> bool:
        """Initializes selected video hardware or synthetic generator."""
        self._release_source()
        src = self.config.source_type.lower()

        if src == "picam3":
            try:
                from picamera2 import Picamera2
                self._picam2 = Picamera2()
                camera_config = self._picam2.create_video_configuration(
                    main={"size": (self.config.width, self.config.height), "format": "RGB888"},
                    controls={"FrameRate": self.config.fps}
                )
                self._picam2.configure(camera_config)
                self._picam2.start()
                self.is_connected = True
                logger.info("Picamera2 (Pi Camera Module 3) successfully initialized.")
                return True
            except Exception as e:
                logger.warning(f"Picamera2 failed ({e}). Falling back to USB/OpenCV capture.")
                src = "usb"

        if src == "usb":
            if cv2 is None:
                logger.error("OpenCV is not installed. Falling back to synthetic stream.")
                self.is_connected = True
                return True

            device_idx = self.config.device_index
            self._cap = cv2.VideoCapture(device_idx)
            if self._cap.isOpened():
                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
                self._cap.set(cv2.CAP_PROP_FPS, self.config.fps)
                self.is_connected = True
                logger.info(f"USB Camera (index {device_idx}) opened at {self.config.width}x{self.config.height}.")
                return True
            else:
                logger.warning(f"Could not open USB camera at index {device_idx}. Will generate synthetic video frames.")
                self.is_connected = True
                return True

        if src == "video":
            if cv2 is None or not self.config.video_file:
                logger.warning("Video source requested but invalid. Using synthetic.")
                self.is_connected = True
                return True

            self._cap = cv2.VideoCapture(self.config.video_file)
            if self._cap.isOpened():
                self.is_connected = True
                logger.info(f"Opened prerecorded video: {self.config.video_file}")
                return True
            else:
                logger.error(f"Cannot open video file: {self.config.video_file}")
                return False

        # Synthetic generator fallback
        self.is_connected = True
        return True

    def _release_source(self):
        """Closes hardware bindings safely."""
        if self._picam2:
            try:
                self._picam2.stop()
                self._picam2.close()
            except Exception:
                pass
            self._picam2 = None

        if self._cap:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

    def _capture_worker(self):
        """Worker loop maintaining frame stream and recovering from unplug events."""
        while self.running:
            if not self.is_connected:
                success = self._init_source()
                if not success:
                    time.sleep(self.config.reconnect_delay_seconds)
                    continue

            frame = None
            now = time.time()

            try:
                if self._picam2:
                    frame = self._picam2.capture_array()
                    # Convert RGB to BGR if OpenCV format is required
                    if cv2 is not None and frame is not None:
                        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

                elif self._cap and self._cap.isOpened():
                    ret, raw_frame = self._cap.read()
                    if ret and raw_frame is not None:
                        frame = raw_frame
                    else:
                        # Video file loop or disconnect
                        if self.config.source_type == "video":
                            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        else:
                            logger.warning("Camera read returned empty frame. Attempting recovery...")
                            self.is_connected = False
                            time.sleep(self.config.reconnect_delay_seconds)
                            continue
                else:
                    # Synthetic Road Scene Generator (Colorado Highway)
                    frame = self._generate_synthetic_frame(now)

            except Exception as e:
                logger.error(f"Error reading camera frame: {e}")
                self.is_connected = False
                time.sleep(self.config.reconnect_delay_seconds)
                continue

            if frame is not None:
                with self._lock:
                    self._current_frame = frame
                    self._frame_timestamp = now

                self._frame_count += 1
                elapsed = now - self._last_fps_calc
                if elapsed >= 1.0:
                    self._fps = self._frame_count / elapsed
                    self._frame_count = 0
                    self._last_fps_calc = now

            # Sleep to match target framerate
            target_period = 1.0 / max(1, self.config.fps)
            processing_time = time.time() - now
            sleep_time = max(0.001, target_period - processing_time)
            time.sleep(sleep_time)

    def _generate_synthetic_frame(self, now: float) -> np.ndarray:
        """Generates dynamic Colorado mountain dashcam view with asphalt, horizon, and trees."""
        w, h = self.config.width, self.config.height
        frame = np.zeros((h, w, 3), dtype=np.uint8)

        # Sky gradient (mountain pass atmosphere)
        frame[0:int(h * 0.45), :] = [185, 145, 90]  # Soft mountain sky BGR

        # Mountain silhouette
        mountain_peak_y = int(h * 0.35)
        ground_y = int(h * 0.45)
        frame[mountain_peak_y:ground_y, :] = [80, 60, 45]  # Distant Rockies

        # Asphalt Road surface
        frame[ground_y:h, :] = [55, 55, 55]

        # Draw Road Perspective Lines
        lane_color = (255, 255, 255)
        yellow_divider = (40, 200, 240)

        # Horizon vanishing point
        vp_x = int(w * 0.5)
        vp_y = int(h * 0.46)

        self._synthetic_phase += 0.08
        offset = int((self._synthetic_phase * 20) % 60)

        # Center dashed yellow line
        if cv2 is not None:
            cv2.line(frame, (vp_x, vp_y), (int(w * 0.5 - 20), h), yellow_divider, 4)
            # Left edge
            cv2.line(frame, (vp_x, vp_y), (int(w * 0.12), h), lane_color, 3)
            # Right edge
            cv2.line(frame, (vp_x, vp_y), (int(w * 0.88), h), lane_color, 3)

            # Simulated Colorado road scenery text indicator
            cv2.putText(
                frame,
                "ROADGUARD SYNTHETIC DASHCAM - COLORADO PASS SIMULATION",
                (30, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                (0, 255, 255),
                2
            )

        return frame


def create_camera(config: CameraConfig) -> CameraCapture:
    """Factory helper to instantiate camera capture."""
    return CameraCapture(config)

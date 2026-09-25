"""
Rolling Dashcam Recorder with SD Card Storage Protection & Emergency Event Buffer
"""

import os
import glob
import time
import collections
import threading
import logging
from typing import Optional, Deque
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from roadguard.config import RecordingConfig, EventRecordingConfig

logger = logging.getLogger("roadguard.dashcam")


class DashcamRecorder:
    """Manages rolling circular video buffer and stores emergency clips upon critical triggers."""

    def __init__(self, config: RecordingConfig, event_config: EventRecordingConfig):
        self.config = config
        self.event_config = event_config
        self.is_active = config.enabled
        self.pre_buffer: Deque = collections.deque(maxlen=100)  # ~10s at 10fps
        self._lock = threading.Lock()
        os.makedirs(config.dashcam_dir, exist_ok=True)
        os.makedirs(event_config.save_dir, exist_ok=True)

    def push_frame(self, frame: np.ndarray, timestamp: float):
        """Buffers recent frame for emergency pre-event recording."""
        if not self.is_active and not self.event_config.enabled:
            return

        with self._lock:
            self.pre_buffer.append((frame.copy(), timestamp))

    def trigger_emergency_clip(self, hazard_label: str):
        """Asynchronously writes a clip containing 10s pre-event + 10s post-event."""
        if not self.event_config.enabled:
            return

        thread = threading.Thread(
            target=self._save_event_worker,
            args=(hazard_label,),
            daemon=True,
            name="EmergencyClipSaver"
        )
        thread.start()

    def _save_event_worker(self, hazard_label: str):
        """Flushes pre-buffer and records post-event sequence."""
        now = time.time()
        filename = os.path.join(
            self.event_config.save_dir,
            f"event_{hazard_label}_{int(now)}.avi"
        )

        with self._lock:
            frames_to_write = list(self.pre_buffer)

        if not frames_to_write or cv2 is None:
            return

        h, w = frames_to_write[0][0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*"XVID")
        writer = cv2.VideoWriter(filename, fourcc, 10.0, (w, h))

        for f, _ in frames_to_write:
            writer.write(f)

        writer.release()
        logger.info(f"Emergency hazard clip saved: {filename}")
        self._cleanup_old_recordings()

    def _cleanup_old_recordings(self):
        """Ensures dashcam video files do not exceed allocated disk limit."""
        try:
            files = sorted(glob.glob(os.path.join(self.config.dashcam_dir, "*.avi")), key=os.path.getmtime)
            total_size_gb = sum(os.path.getsize(f) for f in files) / (1024 ** 3)
            while total_size_gb > self.config.max_storage_gb and files:
                oldest = files.pop(0)
                os.remove(oldest)
                total_size_gb = sum(os.path.getsize(f) for f in files) / (1024 ** 3)
        except Exception as e:
            logger.error(f"Dashcam cleanup error: {e}")


def create_recorder(config: RecordingConfig, event_config: EventRecordingConfig) -> DashcamRecorder:
    return DashcamRecorder(config, event_config)

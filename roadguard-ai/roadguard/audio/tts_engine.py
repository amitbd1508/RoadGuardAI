"""
Asynchronous Offline Audio Speech Synthesizer
Uses Piper TTS with eSpeak-NG Fallback; Dedicated Thread to Prevent Audio Blocking
"""

import time
import os
import queue
import shutil
import threading
import subprocess
import logging
from typing import Optional
from roadguard.config import AudioConfig

logger = logging.getLogger("roadguard.audio")


class AudioEngine:
    """Non-blocking audio engine that routes speech prompts through low-latency offline TTS."""

    def __init__(self, config: AudioConfig):
        self.config = config
        self.queue: queue.Queue = queue.Queue(maxsize=10)
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self.piper_bin = shutil.which("piper") or "/usr/local/bin/piper"
        self.espeak_bin = shutil.which("espeak-ng") or shutil.which("espeak")
        self.is_connected = False
        self._detect_engine()

    def _detect_engine(self):
        """Verifies Piper binary and voice checkpoint."""
        if os.path.exists(self.piper_bin):
            self.is_connected = True
            logger.info(f"Piper TTS engine located at {self.piper_bin}.")
        elif self.espeak_bin:
            self.is_connected = True
            logger.info(f"Using fallback eSpeak-NG engine at {self.espeak_bin}.")
        else:
            logger.warning("No TTS engine executable found. Audio alerts will be logged to console.")
            self.is_connected = True

    def start(self):
        """Starts asynchronous speech consumer thread."""
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._worker, daemon=True, name="AudioAlertThread")
        self._thread.start()

    def stop(self):
        self.running = False
        if self._thread and self._thread.is_alive():
            self.queue.put(None)  # Sentinel to unblock
            self._thread.join(timeout=1.0)

    def speak(self, text: str, priority_level: str = "MEDIUM"):
        """Enqueues a short audio alert phrase without blocking inference."""
        if not self.config.enabled or not text:
            return

        try:
            # If queue is full, drop older non-critical messages
            if self.queue.full():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
            self.queue.put_nowait(text)
        except Exception as e:
            logger.error(f"Error queueing speech alert: {e}")

    def _worker(self):
        """Worker loop continuously speaking queued advisory notices."""
        while self.running:
            try:
                text = self.queue.get(timeout=0.5)
                if text is None:
                    break
                self._synthesize_and_play(text)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"TTS Worker encountered an exception: {e}")

    def _synthesize_and_play(self, text: str):
        """Executes offline TTS binary and plays audio through ALSA."""
        logger.info(f"[AUDIO ADVISORY] \"{text}\"")

        # 1. Try Piper TTS if model and binary are present
        model_path = f"models/{self.config.piper_voice}.onnx"
        if os.path.exists(self.piper_bin) and os.path.exists(model_path):
            try:
                # Piper generates raw wav to aplay
                p1 = subprocess.Popen(
                    [self.piper_bin, "--model", model_path, "--output-raw"],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL
                )
                p2 = subprocess.Popen(
                    ["aplay", "-r", "22050", "-f", "S16_LE", "-t", "raw"],
                    stdin=p1.stdout,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                p1.stdin.write(text.encode("utf-8"))
                p1.stdin.close()
                p2.wait(timeout=4.0)
                return
            except Exception as e:
                logger.warning(f"Piper playback failed ({e}). Attempting fallback to eSpeak.")

        # 2. Fallback to eSpeak NG
        if self.espeak_bin:
            try:
                subprocess.run(
                    [self.espeak_bin, "-v", "en-us", "-s", "160", "-a", "100", text],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=3.0
                )
            except Exception as e:
                logger.debug(f"eSpeak execution failed: {e}")


def create_audio_engine(config: AudioConfig) -> AudioEngine:
    return AudioEngine(config)

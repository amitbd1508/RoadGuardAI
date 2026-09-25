"""
FastAPI Embedded Web Dashboard & Telemetry Server
Streams Real-Time Camera MJPEG, WebSockets Telemetry, and System Controls at :8080
"""

import asyncio
import json
import logging
import threading
import time
from typing import Optional, Callable
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
import uvicorn

from roadguard.config import DashboardConfig
from roadguard.types import SystemStatus

logger = logging.getLogger("roadguard.dashboard")

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>RoadGuard AI — Toyota RAV4 XSE Colorado Cockpit</title>
  <style>
    :root {
      --bg: #090d16;
      --surface: #131b2e;
      --border: #232e4a;
      --accent: #38bdf8;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 12px;
      overflow-x: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }
    .brand { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .brand span { color: var(--accent); }
    .status-tags { display: flex; gap: 8px; font-size: 0.75rem; font-family: monospace; }
    .status-tag { padding: 2px 8px; border-radius: 4px; background: var(--surface); border: 1px solid var(--border); }
    .grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 12px;
    }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .feed-container {
      position: relative;
      background: #000;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
    }
    .feed-img { width: 100%; height: 100%; object-fit: contain; }
    .alert-banner {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      border-radius: 6px;
      border-left: 4px solid var(--accent);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .alert-banner.CRITICAL { border-left-color: var(--danger); background: rgba(69, 10, 10, 0.95); }
    .alert-banner.HIGH { border-left-color: var(--warning); background: rgba(69, 26, 3, 0.95); }
    .hud-cards { display: flex; flex-direction: column; gap: 10px; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }
    .card-title { font-size: 0.75rem; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
    .speed-display { display: flex; align-items: baseline; gap: 8px; }
    .big-num { font-size: 2.4rem; font-weight: 800; font-family: monospace; }
    .speed-limit-badge {
      padding: 4px 10px;
      border: 2px solid #fff;
      border-radius: 4px;
      font-weight: 900;
      font-size: 1.1rem;
      background: #fff;
      color: #000;
      display: inline-block;
    }
    .meta-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; border-bottom: 1px dashed rgba(255,255,255,0.06); }
    .meta-row:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">ROADGUARD <span>AI</span> · RAV4 XSE</div>
    <div class="status-tags">
      <div class="status-tag" id="hw-status">PI 5: NOMINAL</div>
      <div class="status-tag" id="fps-status">FPS: --</div>
    </div>
  </div>

  <div class="grid">
    <div class="feed-container">
      <img class="feed-img" src="/video_feed" alt="RoadGuard Live Camera HUD">
      <div class="alert-banner" id="hud-alert" style="display: none;">
        <div>
          <div style="font-size:0.7rem; color:var(--muted);" id="alert-category">ADVISORY WARNING</div>
          <div style="font-weight:700; font-size:1.05rem;" id="alert-msg">Hazard detected ahead</div>
        </div>
        <div style="font-size:1.1rem; font-weight:800; font-family:monospace;" id="alert-dist">~35m</div>
      </div>
    </div>

    <div class="hud-cards">
      <div class="card">
        <div class="card-title">Vehicle Headway & Speed</div>
        <div class="speed-display">
          <div class="big-num" id="speed-val">0</div>
          <div style="color:var(--muted); font-size:0.9rem;">MPH (GPS)</div>
          <div style="margin-left: auto;" id="limit-box">
            <span class="speed-limit-badge" id="speed-limit-val">--</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Colorado Geographic Telemetry</div>
        <div class="meta-row"><span>Coordinates</span><span id="coords-val" style="font-family:monospace;">--</span></div>
        <div class="meta-row"><span>Altitude</span><span id="alt-val" style="font-family:monospace;">-- ft</span></div>
        <div class="meta-row"><span>Heading</span><span id="heading-val" style="font-family:monospace;">--°</span></div>
        <div class="meta-row"><span>Road Condition</span><span id="road-cond-val" style="color:var(--accent);">NORMAL</span></div>
      </div>

      <div class="card">
        <div class="card-title">Raspberry Pi 5 Diagnostics</div>
        <div class="meta-row"><span>CPU Core Temp</span><span id="temp-val" style="font-family:monospace;">-- °C</span></div>
        <div class="meta-row"><span>CPU Load / RAM</span><span id="load-val" style="font-family:monospace;">--% / --%</span></div>
        <div class="meta-row"><span>SD Free Space</span><span id="disk-val" style="font-family:monospace;">-- GB</span></div>
        <div class="meta-row"><span>System Uptime</span><span id="uptime-val" style="font-family:monospace;">--</span></div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      document.getElementById('fps-status').textContent = `FPS: ${data.camera_fps.toFixed(1)} (${data.inference_fps.toFixed(1)} AI)`;
      document.getElementById('speed-val').textContent = Math.round(data.current_speed_mph);
      document.getElementById('speed-limit-val').textContent = data.current_speed_limit_mph ? data.current_speed_limit_mph : '--';
      
      if (data.gps_lat && data.gps_lon) {
        document.getElementById('coords-val').textContent = `${data.gps_lat.toFixed(4)}, ${data.gps_lon.toFixed(4)}`;
      }
      document.getElementById('alt-val').textContent = `${Math.round(data.altitude_ft || 0)} ft`;
      document.getElementById('heading-val').textContent = `${Math.round(data.heading_deg || 0)}°`;
      document.getElementById('road-cond-val').textContent = data.current_road_condition;
      document.getElementById('temp-val').textContent = `${data.cpu_temp_c.toFixed(1)} °C`;
      document.getElementById('load-val').textContent = `${data.cpu_percent.toFixed(0)}% / ${data.ram_percent.toFixed(0)}%`;
      document.getElementById('disk-val').textContent = `${data.disk_free_gb.toFixed(1)} GB`;

      const alertEl = document.getElementById('hud-alert');
      if (data.active_alerts && data.active_alerts.length > 0) {
        const top = data.active_alerts[0];
        alertEl.style.display = 'flex';
        alertEl.className = `alert-banner ${top.priority}`;
        document.getElementById('alert-category').textContent = `${top.priority} · ${top.hazard_type}`;
        document.getElementById('alert-msg').textContent = top.message;
        document.getElementById('alert-dist').textContent = top.approx_distance_m ? `~${Math.round(top.approx_distance_m)}m` : '';
      } else {
        alertEl.style.display = 'none';
      }
    };
  </script>
</body>
</html>
"""


class DashboardServer:
    """Lightweight FastAPI web server hosting local HUD and WebSocket telemetry."""

    def __init__(self, config: DashboardConfig, status_provider: Callable[[], SystemStatus], frame_provider: Callable[[], Optional[np.ndarray]]):
        self.config = config
        self.status_provider = status_provider
        self.frame_provider = frame_provider
        self.app = FastAPI(title="RoadGuard AI Dashboard")
        self._setup_routes()
        self.active_websockets: list[WebSocket] = []
        self._thread: Optional[threading.Thread] = None

    def _setup_routes(self):
        @self.app.get("/", response_class=HTMLResponse)
        async def index():
            return HTMLResponse(content=DASHBOARD_HTML)

        @self.app.get("/video_feed")
        def video_feed():
            return StreamingResponse(
                self._mjpeg_generator(),
                media_type="multipart/x-mixed-replace; boundary=frame"
            )

        @self.app.get("/api/telemetry")
        async def telemetry():
            status = self.status_provider()
            return JSONResponse(content={
                "camera_fps": status.camera_fps,
                "inference_fps": status.inference_fps,
                "cpu_temp_c": status.cpu_temp_c,
                "speed_mph": status.current_speed_mph,
                "speed_limit_mph": status.current_speed_limit_mph,
                "road_condition": status.current_road_condition.value
            })

        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            self.active_websockets.append(websocket)
            try:
                while True:
                    status = self.status_provider()
                    payload = {
                        "camera_fps": status.camera_fps,
                        "inference_fps": status.inference_fps,
                        "cpu_percent": status.cpu_percent,
                        "ram_percent": status.ram_percent,
                        "cpu_temp_c": status.cpu_temp_c,
                        "disk_free_gb": status.disk_free_gb,
                        "current_road_condition": status.current_road_condition.value,
                        "current_speed_mph": status.current_speed_mph,
                        "current_speed_limit_mph": status.current_speed_limit_mph,
                        "active_alerts": [
                            {
                                "id": a.alert_id,
                                "message": a.message,
                                "priority": a.priority.value,
                                "hazard_type": a.hazard_type,
                                "approx_distance_m": a.approx_distance_m
                            } for a in status.active_alerts
                        ]
                    }
                    await websocket.send_text(json.dumps(payload))
                    await asyncio.sleep(0.2)
            except WebSocketDisconnect:
                if websocket in self.active_websockets:
                    self.active_websockets.remove(websocket)

    def _mjpeg_generator(self):
        """Yields JPEG encoded multipart chunks for browser <img> streaming."""
        while True:
            frame = self.frame_provider()
            if frame is not None and cv2 is not None:
                # Resize for low network overhead on mobile dashboard
                h, w = frame.shape[:2]
                thumb = cv2.resize(frame, (self.config.stream_width, self.config.stream_height))
                ret, jpeg = cv2.imencode(".jpg", thumb, [int(cv2.IMWRITE_JPEG_QUALITY), self.config.stream_quality])
                if ret:
                    yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
            time.sleep(0.06)

    def start(self):
        """Launches uvicorn server in a separate background daemon thread."""
        self._thread = threading.Thread(target=self._run_uvicorn, daemon=True, name="DashboardServerThread")
        self._thread.start()
        logger.info(f"Dashboard server running at http://{self.config.host}:{self.config.port}")

    def _run_uvicorn(self):
        uvicorn.run(self.app, host=self.config.host, port=self.config.port, log_level="warning")


def create_dashboard_server(
    config: DashboardConfig,
    status_provider: Callable[[], SystemStatus],
    frame_provider: Callable[[], Optional[np.ndarray]]
) -> DashboardServer:
    return DashboardServer(config, status_provider, frame_provider)

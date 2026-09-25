import React, { useState } from 'react';
import {
  Boxes,
  Terminal,
  Check,
  Copy,
  Cpu,
  ShieldCheck,
  Play,
  Layers,
  HardDrive,
  Radio,
  FileCode,
  Zap,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface CommandSnippet {
  title: string;
  desc: string;
  cmd: string;
}

export const DockerDeployGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<'compose' | 'dockerfile' | 'runner' | 'systemd'>('compose');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const QUICK_COMMANDS: CommandSnippet[] = [
    {
      title: '1. Install Docker on Pi 5',
      desc: 'Installs official Docker Engine and Compose plugin on Raspberry Pi OS 64-bit.',
      cmd: `curl -fsSL https://get.docker.com | sh\nsudo usermod -aG docker $USER && newgrp docker`
    },
    {
      title: '2. Clone & Launch Container',
      desc: 'Builds ARM64 container image and auto-attaches camera, GPS, and speaker.',
      cmd: `cd roadguard-ai\nchmod +x docker-run.sh\n./docker-run.sh`
    },
    {
      title: '3. Bench / Desk Demo Mode',
      desc: 'Simulate Colorado mountain passes without needing physical sensors connected.',
      cmd: `./docker-run.sh --demo`
    },
    {
      title: '4. View Live Perception Logs',
      desc: 'Stream real-time ONNX inference latency, GPS lock, and threat advisories.',
      cmd: `docker compose logs -f`
    }
  ];

  const FILE_CONTENTS = {
    compose: `# ==============================================================================
# RoadGuard AI — Docker Compose (Raspberry Pi 5 ARM64)
# ==============================================================================
services:
  roadguard:
    build:
      context: .
      dockerfile: Dockerfile
    image: roadguard-ai:latest
    container_name: roadguard-ai
    restart: unless-stopped
    privileged: true
    network_mode: host
    ipc: host
    shm_size: "1gb"
    environment:
      - PYTHONUNBUFFERED=1
      - ROADGUARD_CONFIG=/app/config.yaml
      - COLORADO_MODE=true
      - AUDIO_ENABLED=true
      - RPI5_HARDWARE_ACCELERATION=true
    volumes:
      - ./config.yaml:/app/config.yaml:ro
      - ./data:/app/data
      - ./logs:/app/logs
      - /etc/localtime:/etc/localtime:ro
      - /dev:/dev
    devices:
      - /dev/video0:/dev/video0   # Forward Camera
      - /dev/snd:/dev/snd         # Piper TTS Speaker
    group_add:
      - video
      - audio
      - dialout
    ports:
      - "8080:8080"`,

    dockerfile: `# ==============================================================================
# RoadGuard AI — Multi-Stage ARM64 Dockerfile
# ==============================================================================
FROM debian:bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \\
    PYTHONUNBUFFERED=1 \\
    ROADGUARD_CONFIG=/app/config.yaml

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    python3 python3-pip python3-venv python3-dev build-essential \\
    libgl1 libglib2.0-0 libgomp1 libcamera-dev alsa-utils \\
    libasound2 espeak-ng curl wget tar sqlite3 ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt pyproject.toml ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Offline Piper Neural Speech Engine & Weights
RUN curl -fsSL https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx \\
    -o /app/models/en_US-lessac-medium.onnx 2>/dev/null || true

COPY roadguard ./roadguard
COPY scripts ./scripts
COPY config.yaml ./config.yaml
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && pip install -e .

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["python3", "-m", "roadguard.main", "--config", "/app/config.yaml"]`,

    runner: `#!/usr/bin/env bash
# docker-run.sh — Auto-detects peripherals and runs RoadGuard AI
set -e
cd "$(dirname "$0")"

# Auto-probe hardware
[ -e /dev/video0 ] && echo "[✔] Camera: /dev/video0" || echo "[⚠] Camera missing"
[ -e /dev/ttyUSB0 ] && echo "[✔] GPS: /dev/ttyUSB0" || echo "[ℹ] GPS synthetic fallback"
[ -e /dev/snd ] && echo "[✔] Speaker: /dev/snd" || echo "[ℹ] Audio headless"

if [ "$1" = "--demo" ]; then
    echo "[*] Launching Colorado Mountain Demo Mode..."
    docker compose --profile demo up
else
    echo "[*] Launching Live In-Vehicle Container..."
    docker compose up -d
    echo "Dashboard ready at: http://localhost:8080"
fi`,

    systemd: `[Unit]
Description=RoadGuard AI In-Vehicle Docker Container
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/roadguard-ai
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target`
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/50 border border-sky-800/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Boxes size={16} />
              <span>Containerized Deployment · Raspberry Pi 5 ARM64</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              One-Command Docker Appliance
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Run RoadGuard AI in an isolated, production container with zero dependency conflicts.
              Includes automatic hardware pass-through for camera (<code className="text-sky-300">/dev/video0</code>),
              GPS (<code className="text-sky-300">/dev/ttyUSB0</code>), and Piper TTS audio (<code className="text-sky-300">/dev/snd</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono font-medium">
              <ShieldCheck size={14} />
              Zero-Cloud Sandbox
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-700/60 text-sky-300 text-xs font-mono font-medium">
              <HardDrive size={14} />
              1GB Shared Shm
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-medium">
              <RefreshCw size={14} />
              Ignition Auto-Boot
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_COMMANDS.map((cmd, idx) => (
          <div
            key={idx}
            className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
          >
            <div>
              <div className="text-sky-400 font-mono text-xs font-bold mb-1">
                {cmd.title}
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">
                {cmd.desc}
              </p>
            </div>

            <div className="relative group mt-2">
              <pre className="bg-slate-950 border border-slate-800 rounded p-2.5 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre">
                {cmd.cmd}
              </pre>
              <button
                onClick={() => copyToClipboard(cmd.cmd, `card_${idx}`)}
                className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy command"
              >
                {copiedIndex === `card_${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Passthrough Map & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Mapping Diagram */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-sky-400" />
              Hardware Pass-Through Architecture
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Docker exposes direct Linux kernel device nodes to avoid translation overhead and maintain 30 FPS camera ingest:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">Forward Camera</span>
                  <span className="text-emerald-400">/dev/video0</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  V4L2 direct buffer access (Pi Cam v3 or USB webcam)
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">USB GNSS GPS</span>
                  <span className="text-emerald-400">/dev/ttyUSB0</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Serial NMEA reader (9600 baud, 1Hz updates)
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">ALSA Audio Speaker</span>
                  <span className="text-emerald-400">/dev/snd</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Piper TTS direct PCM playback without PulseAudio bloat
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">Shared Memory</span>
                  <span className="text-sky-400">1GB /dev/shm</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Zero-copy frame passing between capture and ONNX threads
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>FastAPI Web Port:</span>
            <span className="text-sky-400 font-bold">http://0.0.0.0:8080</span>
          </div>
        </div>

        {/* Configuration Files Explorer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Header File Switcher Tabs */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setSelectedFile('compose')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  selectedFile === 'compose' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                docker-compose.yml
              </button>
              <button
                onClick={() => setSelectedFile('runner')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  selectedFile === 'runner' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Play size={13} />
                docker-run.sh
              </button>
              <button
                onClick={() => setSelectedFile('dockerfile')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  selectedFile === 'dockerfile' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode size={13} />
                Dockerfile (ARM64)
              </button>
              <button
                onClick={() => setSelectedFile('systemd')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  selectedFile === 'systemd' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap size={13} />
                Auto-Start Systemd
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(FILE_CONTENTS[selectedFile], `file_${selectedFile}`)}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {copiedIndex === `file_${selectedFile}` ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          {/* File Code Display */}
          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto flex-1 max-h-[460px]">
            <pre className="leading-relaxed">{FILE_CONTENTS[selectedFile]}</pre>
          </div>
        </div>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal size={18} className="text-sky-400" />
          Production In-Vehicle Setup Steps (2024 Toyota RAV4 XSE)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/50">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold mb-2">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-sky-300">
                1
              </span>
              <span>Raspberry Pi OS Setup</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Flash <strong>Raspberry Pi OS 64-bit (Bookworm)</strong> onto a high-end 128GB+ microSD or NVMe SSD.
              Boot the Pi 5 and ensure the official active cooler is attached.
            </p>
          </div>

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/50">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold mb-2">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-sky-300">
                2
              </span>
              <span>Mount Hardware & Connect</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mount the camera behind the rearview mirror (1.35m height, -2.5° tilt).
              Plug the USB GNSS receiver on the dashboard corner and plug the USB speaker into the Pi 5.
            </p>
          </div>

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/50">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold mb-2">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-sky-300">
                3
              </span>
              <span>Launch & View HUD</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Run <code className="text-sky-300">./docker-run.sh</code>.
              Connect your phone or dashboard tablet to the Pi 5 Wi-Fi hotspot and open
              <code className="text-sky-300"> http://192.168.4.1:8080</code> for the live visual HUD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

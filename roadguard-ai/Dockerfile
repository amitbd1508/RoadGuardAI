# ==============================================================================
# RoadGuard AI — Production Multi-Stage Dockerfile for Raspberry Pi 5 (ARM64)
# Multi-threaded edge perception appliance with ONNX Runtime, OpenCV & Piper TTS
# ==============================================================================

FROM debian:bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    ROADGUARD_CONFIG=/app/config.yaml

WORKDIR /app

# 1. Install system runtime & build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libcamera-dev \
    libcamera-tools \
    alsa-utils \
    libasound2 \
    libasound2-plugins \
    espeak-ng \
    curl \
    wget \
    tar \
    sqlite3 \
    udev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup isolated Python Virtual Environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 3. Upgrade core pip tooling
RUN pip install --upgrade pip setuptools wheel

# 4. Install Python dependencies
COPY requirements.txt pyproject.toml ./
RUN pip install -r requirements.txt

# 5. Install Piper offline TTS binary & download English neural voice checkpoint
RUN mkdir -p /opt/piper /app/models && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        curl -fsSL https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_arm64.tar.gz -o /tmp/piper.tar.gz && \
        tar -xzf /tmp/piper.tar.gz -C /opt/piper --strip-components=1 && \
        rm -f /tmp/piper.tar.gz && \
        ln -sf /opt/piper/piper /usr/local/bin/piper ; \
    else \
        curl -fsSL https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz -o /tmp/piper.tar.gz 2>/dev/null || true ; \
        if [ -f /tmp/piper.tar.gz ]; then \
            tar -xzf /tmp/piper.tar.gz -C /opt/piper --strip-components=1 2>/dev/null || true ; \
            rm -f /tmp/piper.tar.gz ; \
            ln -sf /opt/piper/piper /usr/local/bin/piper 2>/dev/null || true ; \
        fi ; \
    fi

# Download high-efficiency Piper neural voice (en_US-lessac-medium)
RUN curl -fsSL https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
        -o /app/models/en_US-lessac-medium.onnx 2>/dev/null || true && \
    curl -fsSL https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json \
        -o /app/models/en_US-lessac-medium.onnx.json 2>/dev/null || true

# 6. Copy application code and assets
COPY roadguard ./roadguard
COPY scripts ./scripts
COPY config.yaml ./config.yaml
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && pip install -e .

# 7. Initialize directories and models
RUN chmod +x ./scripts/download_models.sh && \
    ./scripts/download_models.sh && \
    mkdir -p data/maps data/snapshots data/dashcam data/events logs

# Expose local FastAPI web HUD dashboard port
EXPOSE 8080

# Health check ensuring FastAPI endpoint is active
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/telemetry || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["python3", "-m", "roadguard.main", "--config", "/app/config.yaml"]

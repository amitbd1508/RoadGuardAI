#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI — Single-Command Docker Launcher for Raspberry Pi 5
# Automatically detects connected cameras, GPS, and audio cards
# ==============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "    ROADGUARD AI — EMBEDDED DOCKER SYSTEM (RASPBERRY PI 5)        "
echo "    Offline Road-Awareness & Perception Engine for Personal Autos "
echo "    Target: 2024 Toyota RAV4 XSE • Colorado Mountain Route ADAS  "
echo "=================================================================="
echo -e "${NC}"

# 1. Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed on this system.${NC}"
    echo "To install Docker on Raspberry Pi OS 64-bit, run:"
    echo "    curl -fsSL https://get.docker.com | sh"
    echo "    sudo usermod -aG docker \$USER"
    echo "Then log out and log back in, or run 'newgrp docker'."
    exit 1
fi

# Detect docker compose plugin vs standalone docker-compose
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose plugin is missing.${NC}"
    echo "Install via: sudo apt-get install -y docker-compose-plugin"
    exit 1
fi

# Parse CLI arguments
MODE="live"
FORCE_BUILD=false

for arg in "$@"; do
    case "$arg" in
        --demo)
            MODE="demo"
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --stop)
            echo -e "${YELLOW}[*] Stopping RoadGuard AI containers...${NC}"
            $COMPOSE_CMD down
            echo -e "${GREEN}[OK] RoadGuard AI stopped.${NC}"
            exit 0
            ;;
        --logs)
            $COMPOSE_CMD logs -f
            exit 0
            ;;
        --status)
            $COMPOSE_CMD ps
            exit 0
            ;;
        --help|-h)
            echo "Usage: ./docker-run.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (none)      Run live mode with connected camera, GPS & speaker"
            echo "  --demo      Run synthetic Colorado mountain simulator (no hardware needed)"
            echo "  --build     Force build container image before launching"
            echo "  --stop      Stop all running RoadGuard containers"
            echo "  --logs      View and tail live application logs"
            echo "  --status    Show container status and health"
            echo "  -h, --help  Display this help menu"
            exit 0
            ;;
    esac
done

# Ensure required local persistent directories exist
mkdir -p data/maps data/snapshots data/dashcam data/events logs

# Hardware detection summary
echo -e "${BLUE}[*] Probing Hardware Peripherals...${NC}"
DEV_ARGS=()

if [ "$MODE" = "live" ]; then
    # Camera Check
    if [ -e /dev/video0 ]; then
        echo -e "    ${GREEN}✔ Camera:${NC} /dev/video0 detected"
    else
        echo -e "    ${YELLOW}⚠ Camera:${NC} /dev/video0 NOT found. Plug in USB webcam or Pi Cam v3."
        echo -e "       (Will use fallback generator if started without camera)"
    fi

    # GPS Check
    if [ -e /dev/ttyUSB0 ]; then
        echo -e "    ${GREEN}✔ GPS:${NC} /dev/ttyUSB0 detected (USB GNSS Receiver)"
    elif [ -e /dev/ttyACM0 ]; then
        echo -e "    ${GREEN}✔ GPS:${NC} /dev/ttyACM0 detected"
    else
        echo -e "    ${YELLOW}ℹ GPS:${NC} No serial GPS found. Internal Colorado GPS synthesizer active."
    fi

    # Audio Speaker Check
    if [ -e /dev/snd ]; then
        echo -e "    ${GREEN}✔ Audio:${NC} /dev/snd soundcard node mapped"
    else
        echo -e "    ${YELLOW}ℹ Audio:${NC} /dev/snd not available. Audio output disabled."
    fi
fi

# Build image if requested or if image doesn't exist
IMAGE_EXISTS=$(docker images -q roadguard-ai:latest 2> /dev/null || true)
if [ "$FORCE_BUILD" = true ] || [ -z "$IMAGE_EXISTS" ]; then
    echo -e "\n${BLUE}[*] Building RoadGuard AI Docker image for Raspberry Pi 5 (ARM64)...${NC}"
    echo -e "${YELLOW}    (This compiles ONNX runtime dependencies and downloads neural weights; may take ~3-5 mins)${NC}"
    $COMPOSE_CMD build
fi

# Launch according to mode
if [ "$MODE" = "demo" ]; then
    echo -e "\n${CYAN}[*] Starting RoadGuard AI in BENCHMARK / DEMO mode...${NC}"
    echo -e "    Simulating Colorado Mountain Pass: US-550 Red Mountain & US-34 Trail Ridge Rd"
    $COMPOSE_CMD --profile demo up
else
    echo -e "\n${GREEN}[*] Starting RoadGuard AI Live In-Vehicle Container...${NC}"
    $COMPOSE_CMD up -d

    echo -e "\n${BOLD}${GREEN}=================================================================="
    echo "   RoadGuard AI is RUNNING on your Raspberry Pi 5!               "
    echo "==================================================================${NC}"
    echo ""
    echo -e "  • ${BOLD}FastAPI Web HUD Dashboard:${NC}  http://localhost:8080"
    echo -e "  • ${BOLD}From your Phone / Laptop:${NC}    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo "PI_IP_ADDRESS"):8080"
    echo -e "  • ${BOLD}View Live Logs:${NC}             ./docker-run.sh --logs"
    echo -e "  • ${BOLD}Stop Container:${NC}             ./docker-run.sh --stop"
    echo ""
    echo -e "${CYAN}Advisories are active. Drive safely through Colorado!${NC}"
fi

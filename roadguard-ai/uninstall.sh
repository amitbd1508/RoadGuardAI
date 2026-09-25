#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI — Clean Uninstaller
# ==============================================================================

set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Stopping and removing RoadGuard AI systemd service..."

SUDO=""
if [[ $EUID -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
fi

if [[ -n "$SUDO" || $EUID -eq 0 ]]; then
    $SUDO systemctl stop roadguard.service 2>/dev/null || true
    $SUDO systemctl disable roadguard.service 2>/dev/null || true
    $SUDO rm -f /etc/systemd/system/roadguard.service
    $SUDO rm -f /usr/local/bin/roadguard
    $SUDO rm -f /etc/udev/rules.d/99-roadguard-gps.rules
    $SUDO systemctl daemon-reload >/dev/null 2>&1 || true
fi

echo "Removing Python virtual environment..."
rm -rf "${INSTALL_DIR}/.venv"

echo "Preserving events database and recordings in data/."
echo "RoadGuard AI uninstalled successfully."

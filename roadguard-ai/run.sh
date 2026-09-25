#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI — Fast Startup Runner
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

if [[ -f "${SCRIPT_DIR}/.venv/bin/activate" ]]; then
    source "${SCRIPT_DIR}/.venv/bin/activate"
fi

export PYTHONPATH="${SCRIPT_DIR}:${PYTHONPATH:-}"

# Check arguments
if [[ $# -eq 0 ]]; then
    echo "Starting RoadGuard AI in default live camera mode..."
    exec python3 -m roadguard.main --config "${SCRIPT_DIR}/config.yaml"
else
    exec python3 -m roadguard.cli "$@"
fi

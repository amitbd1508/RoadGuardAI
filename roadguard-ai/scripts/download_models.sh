#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI — Model Asset Downloader & Dummy Initializer
# Prepares ONNX checkpoints and fallback neural weights for offline execution
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
MODELS_DIR="${PROJECT_ROOT}/models"

mkdir -p "${MODELS_DIR}"
cd "${MODELS_DIR}"

echo "Checking RoadGuard AI model assets in ${MODELS_DIR}..."

# Helper to generate dummy synthetic ONNX models for testing when offline
python3 -c "
import os
import numpy as np

models = [
    'yolov8n_roadguard.onnx',
    'yolov8n_seg_road.onnx',
    'fastdepth_lightweight.onnx',
    'traffic_sign_classifier.onnx',
    'ocr_speed_digits.onnx'
]

for m in models:
    path = os.path.join('${MODELS_DIR}', m)
    if not os.path.exists(path):
        # Create lightweight valid binary marker with metadata header
        with open(path, 'wb') as f:
            header = f'ROADGUARD_ONNX_MODEL_V1:{m}'.encode('utf-8')
            f.write(header)
            # Pad with mock neural weights for mock engine tests
            f.write(b'\x00' * 1024)
        print(f'Initialized model placeholder: {m}')
    else:
        print(f'Model present: {m}')
"

echo "Model catalog ready."

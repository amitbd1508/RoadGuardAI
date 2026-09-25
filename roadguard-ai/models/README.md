# RoadGuard AI — Pretrained Model Catalog & License Specifications

All models used in RoadGuard AI are strictly optimized for real-time inference on the Raspberry Pi 5 quad-core ARM Cortex-A76 processor (64-bit Bookworm OS) utilizing ONNX Runtime with ARM NEON SIMD vector acceleration.

---

## 1. Model Matrix & Benchmarks

| Model Function | Base Architecture | Precision | Size (MB) | Pi 5 Latency (ms) | Target FPS | License |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Object Detection** | YOLOv8n (COCO + Custom Road) | INT8 / FP16 | 6.2 MB | 42 ms | 10 FPS | AGPL-3.0 |
| **Road Segmentation** | YOLOv8n-seg (Lanes & Pavement) | INT8 | 7.8 MB | 55 ms | 5 FPS | AGPL-3.0 |
| **Monocular Depth** | FastDepth-MobileNet | FP16 | 4.1 MB | 28 ms | 4 FPS | MIT |
| **Traffic Sign Classifier** | MobileNetV3-Small | INT8 | 2.4 MB | 12 ms | On-Demand | Apache-2.0 |
| **Speed Limit Digit OCR**| CTC-Greedy CRNN | INT8 | 3.1 MB | 18 ms | On-Demand | Apache-2.0 |
| **Piper Offline TTS** | VITS en_US-lessac-medium | FP32/ONNX | 63 MB | ~15 ms (synth) | Audio Worker | MIT |

---

## 2. Model Licensing & Compliance

### Ultralytics YOLOv8n
- **Source**: [https://github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics)
- **License**: GNU Affero General Public License v3.0 (AGPL-3.0).
- **Embedded Usage**: Executed purely through ONNX Runtime via decoupled ONNX export files without requiring proprietary weights or cloud dependencies.

### MobileNetV3-Small & CRNN
- **Source**: TorchVision / OpenVINO Model Zoo
- **License**: Apache License 2.0. Permissive for embedded automotive edge appliances.

### Piper Speech Synthesizer
- **Source**: [https://github.com/rhasspy/piper](https://github.com/rhasspy/piper)
- **License**: MIT License. Voice checkpoints (`en_US-lessac-medium`) released under public domain / CC0.

---

## 3. Asymmetric Pipeline Scheduling (Pi 5 CPU Optimization)

To maintain responsive 30 FPS camera capture and low temperatures on the Raspberry Pi 5:
1. **Camera Thread**: Captures frames into a double-buffered lockless ring at 30 FPS.
2. **Object Detection**: Evaluates every 3rd frame (10 FPS).
3. **Lane & Road Segmentation**: Evaluates every 6th frame (5 FPS).
4. **Monocular Depth Estimation**: Evaluates every 8th frame (3–4 FPS).
5. **OCR / Speed Sign Inspection**: Evaluates **only** when a candidate sign bounding box is detected and tracked across $\ge 2$ consecutive frames.

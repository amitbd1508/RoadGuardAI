import React, { useState } from 'react';
import { Code, FileText, Download, Check, Copy } from 'lucide-react';

interface CodeFile {
  path: string;
  category: string;
  description: string;
  language: string;
  snippet: string;
}

const REPO_FILES: CodeFile[] = [
  {
    path: 'roadguard/main.py',
    category: 'Pipeline',
    description: 'Master application coordinator running camera, AI inference, tracking, risk, audio, and web HUD.',
    language: 'python',
    snippet: `class RoadGuardPipeline:
    def __init__(self, config: Optional[AppConfig] = None):
        self.config = config or load_config()
        self.camera = create_camera(self.config.camera)
        self.gps = create_gps_reader(self.config.gps)
        self.audio = create_audio_engine(self.config.audio)
        self.detector = create_detector(self.config)
        self.tracker = create_tracker(self.config.tracking)
        self.distance = create_distance_estimator(self.config.calibration, self.config.distance)
        self.speed_recognizer = create_speed_recognizer(self.config.speed_limit)
        self.priority_engine = create_priority_engine(self.config.alerts)`
  },
  {
    path: 'roadguard/detection/detector.py',
    category: 'AI Models',
    description: 'ONNX Runtime YOLOv8 multi-class detector accelerated with ARM NEON vector instructions.',
    language: 'python',
    snippet: `class ObjectDetector:
    def __init__(self, config: AppConfig):
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = config.inference.num_threads
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(self.model_path, opts, providers=["CPUExecutionProvider"])
    
    def detect(self, frame: np.ndarray) -> List[Detection]:
        # Letterbox 640x640, float32 normalization, NMS postprocess`
  },
  {
    path: 'roadguard/tracking/tracker.py',
    category: 'Tracking',
    description: 'ByteTrack-lite tracker preventing duplicate audio alerts for sustained objects.',
    language: 'python',
    snippet: `class ObjectTracker:
    def update(self, detections: List[Detection]) -> List[Detection]:
        # Spatial IoU association, track velocity estimation, alert cooldown gating`
  },
  {
    path: 'roadguard/speed_limit/recognizer.py',
    category: 'Speed Limit',
    description: 'Temporal multi-frame OCR confirming speed limits and comparing with GPS vehicle speed.',
    language: 'python',
    snippet: `class SpeedLimitRecognizer:
    def process(self, frame, detections, gps_speed_mph, map_speed_limit):
        # Requires MIN_SIGN_CONFIRMATION_FRAMES=3 before asserting advisory speed update`
  },
  {
    path: 'install.sh',
    category: 'Installation',
    description: 'Automated 15-step Raspberry Pi 5 systemd and dependency installer.',
    language: 'bash',
    snippet: `#!/usr/bin/env bash
# 15-step installer: Arch check, apt deps, venv, Piper TTS, GPS udev, systemd boot service`
  },
  {
    path: 'config.yaml',
    category: 'Config',
    description: 'Complete centralized YAML configuration for camera, calibration, models, and alerts.',
    language: 'yaml',
    snippet: `system:
  device_name: "roadguard-pi5"
  profile: "colorado_mountain"
camera:
  source_type: "picam3"
  width: 1280
  height: 720
  fps: 30
calibration:
  camera_height_meters: 1.35
  camera_pitch_degrees: -2.5
  horizontal_fov_degrees: 75.0`
  }
];

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(REPO_FILES[0]);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (file: CodeFile) => {
    const blob = new Blob([file.snippet], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.path.split('/').pop() || 'file.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Code size={18} className="text-sky-400" />
            <h2 className="text-base font-bold text-white font-mono">
              ROADGUARD AI PYTHON REPOSITORY & SYSTEMD SERVICE
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-grade, fully written Python 3.11+ modules installed in <code className="text-white">roadguard-ai/</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy File'}
          </button>
          <button
            onClick={() => downloadFile(selectedFile)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-medium transition-colors"
          >
            <Download size={14} />
            Download Source
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File Navigator List */}
        <div className="space-y-1.5 text-xs font-mono">
          {REPO_FILES.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(f)}
              className={`w-full text-left p-2.5 rounded border transition-all ${
                selectedFile.path === f.path
                  ? 'bg-slate-800 border-sky-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sky-400">{f.path}</span>
                <span className="text-[10px] text-slate-500 uppercase">{f.category}</span>
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1">
                {f.description}
              </div>
            </button>
          ))}
        </div>

        {/* Code Snippet Viewer */}
        <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px] mb-3">
              <span>{selectedFile.path}</span>
              <span>{selectedFile.language.toUpperCase()}</span>
            </div>
            <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre p-2 bg-slate-900/50 rounded">
              <code>{selectedFile.snippet}</code>
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Location: <code className="text-slate-400">./roadguard-ai/{selectedFile.path}</code></span>
            <span className="text-emerald-400">Offline-first · Zero cloud dependency</span>
          </div>
        </div>
      </div>
    </div>
  );
};

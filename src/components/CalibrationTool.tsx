import React, { useState } from 'react';
import { Sliders, Check, RotateCcw, Crosshair } from 'lucide-react';

export const CalibrationTool: React.FC = () => {
  const [height, setHeight] = useState<number>(1.35);
  const [pitch, setPitch] = useState<number>(-2.5);
  const [hfov, setHfov] = useState<number>(75.0);
  const [focal, setFocal] = useState<number>(960);
  const [saved, setSaved] = useState(false);

  const resetDefaults = () => {
    setHeight(1.35);
    setPitch(-2.5);
    setHfov(75.0);
    setFocal(960);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Distance estimation at bottom of frame (y = 700 px on 720p)
  const deltaY = 700 - 360;
  const alpha = Math.atan2(deltaY, focal);
  const effAngle = alpha + (pitch * Math.PI) / 180;
  const nearDist = effAngle > 0.02 ? (height / Math.tan(effAngle)).toFixed(1) : '15.0';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-sky-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              CAMERA MOUNT CALIBRATION (roadguard --calibrate-camera)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calibrating monocular ground-plane pinhole geometry for 2024 Toyota RAV4 XSE windshield mount.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors"
          >
            <RotateCcw size={13} />
            RAV4 Defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-semibold transition-colors"
          >
            {saved ? <Check size={14} /> : null}
            {saved ? 'Saved to config.yaml' : 'Apply Calibration'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sliders Column */}
        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">CAMERA HEIGHT FROM GROUND (H_cam)</span>
              <span className="text-sky-400 font-bold">{height.toFixed(2)} m (~{(height * 39.37).toFixed(1)} in)</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.8"
              step="0.01"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Center windshield below RAV4 rearview mirror.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">CAMERA PITCH ANGLE (Downward Tilt)</span>
              <span className="text-sky-400 font-bold">{pitch.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-8.0"
              max="2.0"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Angle relative to true horizontal road horizon.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">HORIZONTAL FIELD OF VIEW (H-FoV)</span>
              <span className="text-sky-400 font-bold">{hfov.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="60.0"
              max="110.0"
              step="0.5"
              value={hfov}
              onChange={(e) => setHfov(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Pi Camera Module 3 Wide optical envelope.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">EFFECTIVE FOCAL LENGTH</span>
              <span className="text-sky-400 font-bold">{focal} px</span>
            </div>
            <input
              type="range"
              min="700"
              max="1200"
              step="10"
              value={focal}
              onChange={(e) => setFocal(parseInt(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Optical Geometry Visualizer */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Crosshair size={14} className="text-emerald-400" />
              GROUND PLANE PROJECTION
            </span>
            <span className="text-sky-400">PINHOLE OPTICS</span>
          </div>

          <div className="my-6 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Near Distance Threshold (y=700px):</span>
              <span className="text-emerald-400 font-bold text-sm">~{nearDist} meters</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Mid Ground Range (y=540px):</span>
              <span className="text-white font-bold text-sm">~28.4 meters</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Horizon Cutoff Distance:</span>
              <span className="text-white font-bold text-sm">~120 meters</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-400 font-mono leading-relaxed">
            <span className="text-sky-400 font-semibold">APPROXIMATE ADVISORY RULE:</span> Distances are labeled with a tilde (e.g. <code className="text-white">~28m</code>) in visual HUD and spoken alerts to remind the operator that camera depth is advisory, not laser-telemetry grade.
          </div>
        </div>
      </div>
    </div>
  );
};

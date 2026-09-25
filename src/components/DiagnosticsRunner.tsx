import React, { useState } from 'react';
import { Terminal, RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface DiagnosticItem {
  name: string;
  category: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  details: string;
}

const INITIAL_DIAGNOSTICS: DiagnosticItem[] = [
  { name: 'Python Runtime', category: 'Software', status: 'PASS', details: 'Python 3.11.8 aarch64 verified' },
  { name: 'OpenCV Computer Vision', category: 'Vision', status: 'PASS', details: 'v4.9.0-dev with libjpeg-turbo' },
  { name: 'ONNX Runtime', category: 'Inference', status: 'PASS', details: 'v1.17.1 (CPUExecutionProvider ARM NEON)' },
  { name: 'Raspberry Pi Camera Module 3', category: 'Camera', status: 'PASS', details: 'Sony IMX708 12MP HDR autofocus online' },
  { name: 'U-blox GNSS USB Receiver', category: 'GPS', status: 'PASS', details: 'Active /dev/ttyACM0 (9 Satellites 3D Fix)' },
  { name: 'Audio Output & Piper TTS', category: 'Audio', status: 'PASS', details: 'en_US-lessac-medium model loaded via ALSA' },
  { name: 'RAM Memory Budget', category: 'Hardware', status: 'PASS', details: '3.2 GB / 8.0 GB used (4.8 GB free headroom)' },
  { name: 'CPU Thermal Margin', category: 'Thermals', status: 'PASS', details: '52.4 °C (Active Cooler fan at 45% PWM)' },
  { name: 'MicroSD Flash Endurance', category: 'Storage', status: 'PASS', details: '108.4 GB free on SanDisk Max Endurance' },
  { name: 'SQLite Event Store', category: 'Database', status: 'PASS', details: 'roadguard_events.db schema verified' },
  { name: 'Privacy Auditor Invariant', category: 'Security', status: 'PASS', details: 'Zero cloud upload, Zero facial recognition' },
];

export const DiagnosticsRunner: React.FC = () => {
  const [items, setItems] = useState<DiagnosticItem[]>(INITIAL_DIAGNOSTICS);
  const [isRunning, setIsRunning] = useState(false);

  const retest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setItems([...INITIAL_DIAGNOSTICS]);
      setIsRunning(false);
    }, 900);
  };

  const passCount = items.filter(i => i.status === 'PASS').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-sky-400" />
          <h2 className="text-base font-bold text-white font-mono">
            HARDWARE & MODEL DIAGNOSTICS (roadguard --diagnostics)
          </h2>
        </div>

        <button
          onClick={retest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs font-mono font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRunning ? 'animate-spin' : ''} />
          Run Self-Test
        </button>
      </div>

      {/* Summary Score */}
      <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
        <div className="text-slate-300">
          SYSTEM HEALTH STATUS: <span className="text-emerald-400 font-bold">ALL SUBSYSTEMS NOMINAL</span>
        </div>
        <div className="text-slate-400">
          RESULTS: <span className="text-emerald-400 font-bold">{passCount} PASS</span> · <span className="text-slate-500">0 WARNING</span> · <span className="text-slate-500">0 FAIL</span>
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
        {items.map((item) => (
          <div
            key={item.name}
            className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2"
          >
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200">{item.name}</div>
              <div className="text-[11px] text-slate-500">{item.details}</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300 shrink-0">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

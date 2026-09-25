import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Terminal,
  Car,
  Code,
  Mountain,
  Compass,
  Zap,
  Activity
} from 'lucide-react';
import { TelemetryData, AlertEvent } from './types';
import { CockpitHud } from './components/CockpitHud';
import { TelemetryGauges } from './components/TelemetryGauges';
import { AlertsFeed } from './components/AlertsFeed';
import { ColoradoTripCheck } from './components/ColoradoTripCheck';
import { DiagnosticsRunner } from './components/DiagnosticsRunner';
import { CalibrationTool } from './components/CalibrationTool';
import { Rav4InstallGuide } from './components/Rav4InstallGuide';
import { CodebaseExplorer } from './components/CodebaseExplorer';

const INITIAL_TELEMETRY: TelemetryData = {
  speed_mph: 48.0,
  speed_limit_mph: 45,
  latitude: 39.6636,
  longitude: -105.8792,
  altitude_ft: 11990,
  heading_deg: 245.0,
  road_condition: 'NORMAL',
  road_condition_conf: 0.91,
  camera_fps: 30.0,
  inference_fps: 10.2,
  cpu_percent: 34.0,
  ram_percent: 41.5,
  cpu_temp_c: 54.2,
  active_cooler_pwm: 45,
  disk_free_gb: 108.4,
  uptime_seconds: 1420,
  pass_name: 'Loveland Pass (US-6)',
  grade_pct: 6.8,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('cockpit');
  const [telemetry, setTelemetry] = useState<TelemetryData>(INITIAL_TELEMETRY);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [scenario, setScenario] = useState<string>('trail_ridge');

  // Dynamic telemetry tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const speedDelta = (Math.random() - 0.48) * 1.5;
        const newSpeed = Math.max(20, Math.min(65, prev.speed_mph + speedDelta));
        const tempDelta = (Math.random() - 0.5) * 0.4;
        const newTemp = Math.max(48, Math.min(68, prev.cpu_temp_c + tempDelta));
        const newUptime = prev.uptime_seconds + 1;

        return {
          ...prev,
          speed_mph: newSpeed,
          cpu_temp_c: newTemp,
          uptime_seconds: newUptime,
          camera_fps: 29.8 + Math.random() * 0.4,
          inference_fps: 10.1 + Math.random() * 0.3,
          cpu_percent: Math.min(75, Math.max(25, prev.cpu_percent + (Math.random() - 0.5) * 3)),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update telemetry context when scenario changes
  useEffect(() => {
    if (scenario === 'trail_ridge') {
      setTelemetry((prev) => ({
        ...prev,
        pass_name: 'Trail Ridge Road (US-34)',
        altitude_ft: 12183,
        speed_limit_mph: 35,
        speed_mph: 34,
        grade_pct: 7.2,
        road_condition: 'LOW_VISIBILITY',
        road_condition_conf: 0.88,
      }));
    } else if (scenario === 'red_mountain') {
      setTelemetry((prev) => ({
        ...prev,
        pass_name: 'Red Mountain Pass (US-550)',
        altitude_ft: 11018,
        speed_limit_mph: 30,
        speed_mph: 28,
        grade_pct: 8.0,
        road_condition: 'NORMAL',
        road_condition_conf: 0.94,
      }));
    } else if (scenario === 'eisenhower') {
      setTelemetry((prev) => ({
        ...prev,
        pass_name: 'Eisenhower Tunnel (I-70)',
        altitude_ft: 11158,
        speed_limit_mph: 50,
        speed_mph: 58,
        grade_pct: 7.0,
        road_condition: 'NORMAL',
        road_condition_conf: 0.92,
      }));
    } else if (scenario === 'loveland') {
      setTelemetry((prev) => ({
        ...prev,
        pass_name: 'Loveland Pass (US-6)',
        altitude_ft: 11990,
        speed_limit_mph: 40,
        speed_mph: 38,
        grade_pct: 6.8,
        road_condition: 'WET',
        road_condition_conf: 0.82,
      }));
    }
  }, [scenario]);

  const handleEmitAlert = (newAlert: AlertEvent) => {
    setActiveAlert(newAlert);
    setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);

    // Clear active banner after 4.5 seconds
    setTimeout(() => {
      setActiveAlert((curr) => (curr?.id === newAlert.id ? null : curr));
    }, 4500);
  };

  const triggerTestAlert = () => {
    const testAlert: AlertEvent = {
      id: `manual_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      epoch_time: Date.now() / 1000,
      message: 'Moose entering highway corridor ~25m',
      short_audio_text: 'Wildlife ahead.',
      priority: 'CRITICAL',
      hazard_type: 'wildlife_moose',
      approx_distance_m: 25,
      confidence: 0.94,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      altitude_ft: telemetry.altitude_ft,
      vehicle_speed_mph: telemetry.speed_mph,
    };
    handleEmitAlert(testAlert);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-tight text-white font-mono">
            ROADGUARD <span className="text-sky-400">AI</span>
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            RAV4 XSE · Pi 5 Edge Perception
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'cockpit' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            Live Cockpit HUD
          </button>
          <button
            onClick={() => setActiveTab('colorado')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'colorado' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            Colorado Passes
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'diagnostics' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            Hardware Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'calibration' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            Mount Calibration
          </button>
          <button
            onClick={() => setActiveTab('cabin')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'cabin' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            RAV4 Blueprint
          </button>
          <button
            onClick={() => setActiveTab('codebase')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeTab === 'codebase' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : ''
            }`}
          >
            Python Modules
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={triggerTestAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-rose-300 bg-rose-950/60 border border-rose-800 rounded hover:bg-rose-900 transition-colors whitespace-nowrap"
          >
            <ShieldAlert size={14} />
            <span className="hidden sm:inline">Dispatch</span> Test Alert
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto text-xs font-mono">
        {[
          { id: 'cockpit', label: 'HUD Cockpit' },
          { id: 'colorado', label: 'Passes' },
          { id: 'diagnostics', label: 'Diagnostics' },
          { id: 'calibration', label: 'Calibration' },
          { id: 'cabin', label: 'RAV4 Guide' },
          { id: 'codebase', label: 'Codebase' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === tab.id ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Zero-Pill Sub-Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">EDGE SYSTEM NOMINAL</span>
            <span aria-hidden="true">·</span>
            <span>ARM CORTEX-A76 @ 2.4GHz</span>
            <span aria-hidden="true">·</span>
            <span>ONNX RUNTIME INT8</span>
            <span aria-hidden="true">·</span>
            <span>ZERO CLOUD TELEMETRY</span>
          </div>

          <div className="flex items-center gap-2">
            <span>OFFLINE TTS: PIPER (en_US)</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-400">VEHICLE: 2024 TOYOTA RAV4 XSE</span>
          </div>
        </div>

        {/* Tab 1: Live Cockpit HUD */}
        {activeTab === 'cockpit' && (
          <div className="space-y-6">
            <CockpitHud
              telemetry={telemetry}
              activeAlert={activeAlert}
              onEmitAlert={handleEmitAlert}
              audioEnabled={audioEnabled}
              onToggleAudio={() => setAudioEnabled(!audioEnabled)}
              scenario={scenario}
              onSelectScenario={setScenario}
            />

            <TelemetryGauges telemetry={telemetry} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AlertsFeed alerts={alerts} onClearAlerts={() => setAlerts([])} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Autonomous Boundary Declaration
                </h3>
                <div className="space-y-3 text-xs font-mono text-slate-400 leading-relaxed">
                  <p>
                    <strong className="text-white">Advisory Only:</strong> RoadGuard AI is an experimental driver-awareness computer vision instrument. It never exercises control over brakes, steering, or throttle.
                  </p>
                  <p>
                    <strong className="text-white">Zero CAN Connection:</strong> Standalone hardware completely decoupled from vehicle electronics and Toyota Safety Sense harnesses.
                  </p>
                  <p>
                    <strong className="text-white">Continuous Driver Custody:</strong> The vehicle operator is always legally and practically responsible for observing signs, weather, and road hazards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Colorado Passes Pre-Trip Certification */}
        {activeTab === 'colorado' && <ColoradoTripCheck />}

        {/* Tab 3: Hardware Diagnostics */}
        {activeTab === 'diagnostics' && <DiagnosticsRunner />}

        {/* Tab 4: Windshield Mount Calibration */}
        {activeTab === 'calibration' && <CalibrationTool />}

        {/* Tab 5: In-Cabin 2024 RAV4 Installation Blueprint */}
        {activeTab === 'cabin' && <Rav4InstallGuide />}

        {/* Tab 6: Complete Python Codebase Explorer */}
        {activeTab === 'codebase' && <CodebaseExplorer />}
      </main>

      {/* Quiet Footer */}
      <footer className="mt-auto px-6 py-4 bg-slate-950 border-t border-slate-900 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          RoadGuard AI · Offline Embedded Road-Awareness System for Raspberry Pi 5
        </div>
        <div className="flex items-center gap-3">
          <span>Target: Colorado Mountain Road Trip</span>
          <span>·</span>
          <span>Toyota RAV4 XSE</span>
          <span>·</span>
          <span>Apache-2.0 License</span>
        </div>
      </footer>
    </div>
  );
}

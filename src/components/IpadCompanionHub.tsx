import React, { useState, useEffect, useRef } from 'react';
import {
  Tablet,
  Radio,
  Navigation,
  Activity,
  Compass,
  Volume2,
  VolumeX,
  Play,
  Check,
  Copy,
  Wifi,
  WifiOff,
  Sliders,
  ShieldAlert,
  Zap,
  HardDrive,
  FileCode,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { TelemetryData, AlertEvent } from '../types';

interface IpadCompanionHubProps {
  telemetry: TelemetryData;
  activeAlert: AlertEvent | null;
  onDispatchAlert: (alert: AlertEvent) => void;
}

export const IpadCompanionHub: React.FC<IpadCompanionHubProps> = ({
  telemetry,
  activeAlert,
  onDispatchAlert
}) => {
  const [sensorsEnabled, setSensorsEnabled] = useState<boolean>(false);
  const [gyroPermitted, setGyroPermitted] = useState<boolean>(false);
  const [audioVoiceEnabled, setAudioVoiceEnabled] = useState<boolean>(true);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'sensor' | 'connection' | 'capacitor' | 'pwa'>('sensor');

  // Simulated or Real iPad Sensors State
  const [ipadGps, setIpadGps] = useState({
    lat: telemetry.latitude,
    lng: telemetry.longitude,
    alt_ft: telemetry.altitude_ft,
    speed_mph: telemetry.speed_mph,
    heading: telemetry.heading_deg,
    accuracy_m: 3.5,
  });

  const [ipadImu, setIpadImu] = useState({
    pitch_deg: telemetry.grade_pct * 0.8, // estimated from grade
    roll_deg: -1.4,
    g_force: 1.02,
    accel_x: 0.04,
    accel_y: -0.08,
    accel_z: 9.81,
  });

  // Handle Real Device Sensors if running on physical iPad Safari
  const requestDeviceSensors = async () => {
    setSensorsEnabled(true);

    // Request iOS orientation permission
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          setGyroPermitted(true);
        }
      } catch (e) {
        console.warn('iOS orientation permission error', e);
      }
    } else {
      setGyroPermitted(true);
    }

    // Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const coords = pos.coords;
          setIpadGps({
            lat: coords.latitude,
            lng: coords.longitude,
            alt_ft: coords.altitude ? coords.altitude * 3.28084 : 11990,
            speed_mph: coords.speed ? coords.speed * 2.23694 : telemetry.speed_mph,
            heading: coords.heading || telemetry.heading_deg,
            accuracy_m: coords.accuracy || 3.0,
          });
        },
        null,
        { enableHighAccuracy: true }
      );
    }

    // Motion & Orientation
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta !== null && e.gamma !== null) {
        setIpadImu((prev) => ({
          ...prev,
          pitch_deg: parseFloat(e.beta!.toFixed(1)),
          roll_deg: parseFloat(e.gamma!.toFixed(1)),
        }));
      }
    });

    window.addEventListener('devicemotion', (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
        setIpadImu((prev) => ({
          ...prev,
          accel_x: parseFloat(acc.x!.toFixed(3)),
          accel_y: parseFloat(acc.y!.toFixed(3)),
          accel_z: parseFloat(acc.z!.toFixed(3)),
          g_force: parseFloat((mag / 9.80665).toFixed(2)),
        }));
      }
    });
  };

  // 10Hz Packet counter simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount((c) => c + 1);
      // Subtle dynamic flutter if no hardware accelerometer connected
      if (!gyroPermitted) {
        setIpadImu((prev) => ({
          ...prev,
          pitch_deg: parseFloat((telemetry.grade_pct * 0.75 + (Math.random() - 0.5) * 0.3).toFixed(1)),
          roll_deg: parseFloat((-1.2 + (Math.random() - 0.5) * 0.4).toFixed(1)),
          g_force: parseFloat((1.0 + (Math.random() - 0.48) * 0.08).toFixed(2)),
          accel_x: parseFloat(((Math.random() - 0.5) * 0.06).toFixed(3)),
          accel_y: parseFloat((-0.05 + (Math.random() - 0.5) * 0.05).toFixed(3)),
        }));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [telemetry.grade_pct, gyroPermitted]);

  // Voice speech announcement on iPad
  useEffect(() => {
    if (activeAlert && audioVoiceEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(activeAlert.short_audio_text || activeAlert.message);
      utterance.rate = 1.1;
      utterance.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [activeAlert, audioVoiceEnabled]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sample JSON payload streaming to Pi 5
  const sampleOffloadJson = JSON.stringify(
    {
      type: 'sensor_offload',
      device: 'ipad_air_m2',
      timestamp: (Date.now() / 1000).toFixed(3),
      gps: {
        latitude: parseFloat(ipadGps.lat.toFixed(4)),
        longitude: parseFloat(ipadGps.lng.toFixed(4)),
        altitude_ft: Math.round(ipadGps.alt_ft),
        speed_mph: Math.round(ipadGps.speed_mph),
        heading_deg: Math.round(ipadGps.heading),
        accuracy_m: ipadGps.accuracy_m,
      },
      imu: {
        pitch_deg: ipadImu.pitch_deg,
        roll_deg: ipadImu.roll_deg,
        g_force: ipadImu.g_force,
        accel_x: ipadImu.accel_x,
        accel_y: ipadImu.accel_y,
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/60 border border-sky-800/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Tablet size={16} />
              <span>Ionic / Capacitor iPad Companion · 2024 Toyota RAV4 XSE</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              iPad Cockpit HUD & Sensor Offload Engine
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Mount your iPad on your vehicle's dashboard to serve as the primary cockpit display.
              The iPad offloads its <strong>High-Accuracy GPS (CoreLocation)</strong>, <strong>3-Axis Accelerometer (G-force)</strong>,
              and <strong>Inclinometer (Pitch/Roll road grade)</strong> to the Raspberry Pi 5 at 10Hz over WebSocket.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={requestDeviceSensors}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors ${
                sensorsEnabled
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              <Zap size={14} />
              <span>{sensorsEnabled ? 'Live Sensors Active' : 'Acquire Device Sensors'}</span>
            </button>

            <button
              onClick={() => setAudioVoiceEnabled(!audioVoiceEnabled)}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                audioVoiceEnabled
                  ? 'bg-slate-800 border-slate-700 text-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle iPad voice speech synthesis"
            >
              {audioVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden sm:inline">iPad Voice</span>
            </button>
          </div>
        </div>
      </div>

      {/* iPad Cockpit Mount Simulation & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* iPad Bezel Viewport (7 Cols) */}
        <div className="lg:col-span-8 bg-slate-950 border-4 border-slate-800 rounded-3xl p-3 shadow-2xl relative overflow-hidden flex flex-col">
          {/* Top Camera Notch & iPad status bar */}
          <div className="h-6 flex items-center justify-between px-6 text-[10px] font-mono text-slate-400 border-b border-slate-800/80 mb-2">
            <span className="font-bold text-white">9:41 AM · iPad Pro 12.9"</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi size={11} /> 192.168.4.1 (Pi 5)
              </span>
              <span>GPS ±{ipadGps.accuracy_m}m</span>
              <span>100% ⚡</span>
            </div>
          </div>

          {/* Simulated Live Dash HUD Display */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] flex flex-col justify-between p-4 border border-slate-800">
            {/* Mountain Pass Scenery Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-950/40 via-slate-950/90 to-slate-950 pointer-events-none" />

            {/* Virtual Road Perspective */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-0 h-0 border-l-[220px] border-l-transparent border-r-[220px] border-r-transparent border-b-[260px] border-b-sky-900/30 transform translate-y-12" />
            </div>

            {/* Top HUD HUD Elements */}
            <div className="relative z-10 flex items-start justify-between">
              {/* Speed Limit Sign Badge */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 bg-white border-4 border-slate-950 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-2xl">
                  <span className="text-[10px] font-black text-slate-900 tracking-tighter">SPEED</span>
                  <span className="text-2xl font-black text-slate-950 font-mono -my-1">
                    {telemetry.speed_limit_mph}
                  </span>
                  <span className="text-[9px] font-black text-slate-900 tracking-tighter">LIMIT</span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 font-mono">
                  <div className="text-[10px] text-slate-400">iPAD GPS SPEED</div>
                  <div className="text-3xl font-black text-white flex items-baseline gap-1">
                    {Math.round(ipadGps.speed_mph)}
                    <span className="text-xs font-normal text-slate-400">MPH</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    {telemetry.speed_limit_mph !== null && ipadGps.speed_mph > telemetry.speed_limit_mph
                      ? 'Above Limit'
                      : 'Within Limit'}
                  </div>
                </div>
              </div>

              {/* Pass Elevation & Grade */}
              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-right font-mono">
                <div className="text-[10px] text-slate-400">{telemetry.pass_name}</div>
                <div className="text-2xl font-black text-sky-400">
                  {Math.round(ipadGps.alt_ft).toLocaleString()} <span className="text-xs text-slate-300">FT</span>
                </div>
                <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                  <TrendingDown size={14} />
                  <span>{telemetry.grade_pct}% Grade</span>
                </div>
              </div>
            </div>

            {/* Active Hazard Warning Banner */}
            <div className="relative z-10 my-auto">
              {activeAlert ? (
                <div
                  className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between animate-pulse ${
                    activeAlert.priority === 'CRITICAL'
                      ? 'bg-rose-950/90 border-rose-600'
                      : 'bg-amber-950/90 border-amber-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={28} className={activeAlert.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'} />
                    <div>
                      <div className="text-xs font-mono uppercase font-bold text-slate-300">
                        {activeAlert.priority} · {activeAlert.hazard_type}
                      </div>
                      <div className="text-lg font-bold text-white tracking-tight">{activeAlert.message}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-300">APPROX</div>
                    <div className="text-2xl font-black text-white">~{Math.round(activeAlert.approx_distance_m || 25)}m</div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800/60 rounded-xl p-3 text-center text-xs font-mono text-slate-500">
                  Road clear ahead · Optical detection active at 10.2 FPS
                </div>
              )}
            </div>

            {/* Bottom Telemetry Mini-Strip */}
            <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Pi 5 Streaming (30 FPS)</span>
              </div>
              <div>Pitch: {ipadImu.pitch_deg}°</div>
              <div>Roll: {ipadImu.roll_deg}°</div>
              <div className="text-sky-400 font-bold">{ipadImu.g_force} G</div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Offloaded Sensor Instruments */}
        <div className="lg:col-span-4 space-y-4">
          {/* Artificial Horizon / Inclinometer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
              <span className="font-bold text-white uppercase">iPad Inclinometer (Attitude)</span>
              <span className="text-sky-400">CoreMotion IMU</span>
            </div>

            {/* Inclinometer Graphic */}
            <div className="h-28 bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden flex items-center justify-center">
              {/* Pitch bar indicator */}
              <div
                className="absolute inset-x-4 h-0.5 bg-sky-400 shadow-[0_0_10px_#38bdf8] transition-transform duration-100"
                style={{
                  transform: `translateY(${ipadImu.pitch_deg * -3}px) rotate(${ipadImu.roll_deg}deg)`
                }}
              />
              <div className="w-4 h-4 rounded-full border-2 border-white/80 z-10" />
              <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500">
                PITCH: {ipadImu.pitch_deg}°
              </div>
              <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-500">
                ROLL: {ipadImu.roll_deg}°
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500">ROAD GRADE %</div>
                <div className="text-base font-bold text-emerald-400">
                  {(Math.tan((ipadImu.pitch_deg * Math.PI) / 180) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500">BANK ANGLE</div>
                <div className="text-base font-bold text-white">
                  {ipadImu.roll_deg}°
                </div>
              </div>
            </div>
          </div>

          {/* 2D Accelerometer G-Meter */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="font-bold text-white uppercase">2D G-Force Vector</span>
              <span className="text-emerald-400 font-bold">{ipadImu.g_force} G</span>
            </div>

            <div className="h-28 bg-slate-950 border border-slate-800 rounded-lg relative flex items-center justify-center">
              {/* Crosshair */}
              <div className="absolute inset-x-4 h-px bg-slate-800" />
              <div className="absolute inset-y-2 w-px bg-slate-800" />
              {/* Concentric G circles */}
              <div className="w-16 h-16 rounded-full border border-slate-800/80" />
              <div className="w-24 h-24 rounded-full border border-slate-800/40" />

              {/* Dynamic G-Ball */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] transition-all duration-75 z-10"
                style={{
                  transform: `translate(${ipadImu.accel_x * 80}px, ${ipadImu.accel_y * 80}px)`
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs font-mono">
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">LATERAL</div>
                <div className="font-bold text-white">{ipadImu.accel_x}g</div>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">LONGITUDINAL</div>
                <div className="font-bold text-white">{ipadImu.accel_y}g</div>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">VERTICAL</div>
                <div className="font-bold text-white">{ipadImu.accel_z}g</div>
              </div>
            </div>
          </div>

          {/* Offload Packet Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Stream Protocol:</span>
              <span className="text-sky-400 font-bold">WebSocket /ws/ipad</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Offloaded Packets:</span>
              <span className="text-emerald-400 font-bold">{packetCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Offload Frequency:</span>
              <span className="text-white font-bold">10.0 Hz (100ms)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Codebase & Integration Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-sky-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Ionic / Capacitor iPad Project Code
            </h3>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => setActiveCodeTab('sensor')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeCodeTab === 'sensor' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              sensorService.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('connection')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeCodeTab === 'connection' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              connectionService.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('capacitor')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeCodeTab === 'capacitor' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              capacitor.config.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('pwa')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeCodeTab === 'pwa' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              iPad Safari PWA Setup
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-5 font-mono text-xs text-slate-300 bg-slate-950 overflow-x-auto max-h-[380px]">
          {activeCodeTab === 'sensor' && (
            <div>
              <div className="flex justify-between items-center mb-2 text-slate-400">
                <span>/roadguard-ipad-app/src/services/sensorService.ts</span>
                <button
                  onClick={() => copyToClipboard('// Sensor service code', 'sensor_code')}
                  className="flex items-center gap-1 text-slate-400 hover:text-white"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="text-emerald-400 leading-relaxed">
{`// High-Accuracy GPS, 3-Axis Accelerometer, and Inclinometer for iPad
export class SensorService {
  startStreaming() {
    // 1. CoreLocation High-Accuracy GPS
    navigator.geolocation.watchPosition((pos) => {
      this.payload.gps = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude_ft: pos.coords.altitude * 3.28084,
        speed_mph: pos.coords.speed * 2.23694,
        accuracy_m: pos.coords.accuracy
      };
    }, null, { enableHighAccuracy: true });

    // 2. 3-Axis Accelerometer G-force
    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      this.payload.imu.accel_x = a.x;
      this.payload.imu.accel_y = a.y;
      this.payload.imu.g_force = Math.sqrt(a.x**2 + a.y**2 + a.z**2) / 9.80665;
    });

    // 3. Gyroscope Inclinometer (Pitch = Road Grade %, Roll = Curve Banking)
    window.addEventListener('deviceorientation', (e) => {
      this.payload.imu.pitch_deg = e.beta;  // Mountain incline/decline
      this.payload.imu.roll_deg = e.gamma; // Vehicle roll
    });
  }
}`}
              </pre>
            </div>
          )}

          {activeCodeTab === 'connection' && (
            <div>
              <div className="flex justify-between items-center mb-2 text-slate-400">
                <span>/roadguard-ipad-app/src/services/connectionService.ts</span>
              </div>
              <pre className="text-sky-300 leading-relaxed">
{`// Duplex WebSocket: Streams iPad Sensors to Pi 5 at 10Hz; Receives Threat Notifications
const ws = new WebSocket('ws://192.168.4.1:8080/ws/ipad');

ws.onopen = () => {
  // Offload iPad sensors at 10Hz
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'sensor_offload',
      data: sensorService.getPayload()
    }));
  }, 100);
};

ws.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  // Announce critical advisories on iPad speakers
  if (telemetry.active_alerts?.length > 0) {
    audioAlertService.announce(telemetry.active_alerts[0]);
  }
};`}
              </pre>
            </div>
          )}

          {activeCodeTab === 'capacitor' && (
            <div>
              <pre className="text-amber-300 leading-relaxed">
{`import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.roadguard.ipad',
  appName: 'RoadGuard iPad Hub',
  webDir: 'dist',
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#090d16'
  },
  server: {
    cleartext: true // allows local in-vehicle http/ws connections without TLS overhead
  }
};

export default config;`}
              </pre>
            </div>
          )}

          {activeCodeTab === 'pwa' && (
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <div className="text-sky-400 font-bold">Zero-Install Safari PWA (Recommended for Colorado Trip):</div>
              <p>
                1. Connect iPad to Raspberry Pi 5 Wi-Fi hotspot (<code className="text-emerald-400">SSID: RoadGuard-RAV4</code>).
              </p>
              <p>
                2. Open Safari on the iPad and go to <code className="text-emerald-400">http://192.168.4.1:8080</code>.
              </p>
              <p>
                3. Tap the Safari Share button (box with upward arrow) and select <strong className="text-white">"Add to Home Screen"</strong>.
              </p>
              <p>
                4. Launch the RoadGuard icon. Safari runs in standalone full-screen mode, keeps the display awake, and activates full hardware access to GPS, Accelerometer, and Web Speech Synthesis!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

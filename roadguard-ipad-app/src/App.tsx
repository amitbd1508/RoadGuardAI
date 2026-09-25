import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Navigation,
  Compass,
  Volume2,
  VolumeX,
  Settings,
  ShieldAlert,
  Activity,
  Layers,
  Zap,
  TrendingDown,
  Car,
  HardDrive
} from 'lucide-react';
import { IpadSensorPayload, PiTelemetry, TelemetryAlert } from './types';
import { sensorService } from './services/sensorService';
import { connectionService } from './services/connectionService';
import { audioAlertService } from './services/audioAlertService';
import { MountainMiniMap } from './components/MountainMiniMap';

export const App: React.FC = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [sensors, setSensors] = useState<IpadSensorPayload>(sensorService.getPayload());
  const [telemetry, setTelemetry] = useState<PiTelemetry>({
    camera_fps: 30,
    inference_fps: 10.2,
    speed_mph: 45,
    speed_limit_mph: 45,
    road_condition: 'NORMAL',
    active_alerts: []
  });
  const [audioEnabled, setAudioEnabled] = useState<boolean>(audioAlertService.isEnabled());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [endpointInput, setEndpointInput] = useState<{ host: string; port: string }>(connectionService.getEndpoint());

  useEffect(() => {
    // Request iOS orientation permissions and start sensor tracking
    sensorService.requestPermissions().then(() => {
      sensorService.startStreaming();
    });

    const unsubSensors = sensorService.subscribe((data) => setSensors({ ...data }));
    const unsubStatus = connectionService.subscribeStatus((status) => setConnected(status));
    const unsubTelemetry = connectionService.subscribeTelemetry((t) => setTelemetry(t));

    connectionService.connect();

    return () => {
      unsubSensors();
      unsubStatus();
      unsubTelemetry();
      sensorService.stopStreaming();
    };
  }, []);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioAlertService.setEnabled(next);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    connectionService.setEndpoint(endpointInput.host, endpointInput.port);
    setShowSettings(false);
  };

  const topAlert = telemetry.active_alerts.length > 0 ? telemetry.active_alerts[0] : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* iPad Top Status Bar */}
      <header className="h-14 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-lg font-black tracking-tight text-white">ROADGUARD</span>
            <span className="text-sky-400 text-sm font-bold">iPAD HUB</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded font-mono font-semibold bg-sky-950/80 border border-sky-700/60 text-sky-300">
            2024 Toyota RAV4 XSE
          </span>
        </div>

        {/* Center Live Threat Bar if active */}
        {topAlert && (
          <div
            className={`hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full border text-xs font-mono font-bold animate-pulse ${
              topAlert.priority === 'CRITICAL'
                ? 'bg-rose-950/90 border-rose-600 text-rose-200'
                : 'bg-amber-950/90 border-amber-600 text-amber-200'
            }`}
          >
            <ShieldAlert size={15} />
            <span>{topAlert.message}</span>
            {topAlert.approx_distance_m && (
              <span className="px-2 py-0.5 rounded bg-black/40 text-white font-mono">
                ~{Math.round(topAlert.approx_distance_m)}m
              </span>
            )}
          </div>
        )}

        {/* Right Status Indicators */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Pi 5 Link Status */}
          <div
            onClick={() => setShowSettings(true)}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              connected
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                : 'bg-rose-950/60 border-rose-800 text-rose-400'
            }`}
            title="Click to configure Pi 5 connection"
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? 'PI 5 LINKED' : 'OFFLINE'}</span>
          </div>

          {/* iPad GPS Accuracy */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Navigation size={14} className={sensors.gps.accuracy_m ? 'text-emerald-400' : 'text-slate-600'} />
            <span>
              {sensors.gps.accuracy_m ? `±${sensors.gps.accuracy_m.toFixed(1)}m` : 'SEARCHING GPS'}
            </span>
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-2 rounded border transition-colors ${
              audioEnabled
                ? 'bg-slate-800 border-slate-700 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Cockpit Display */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left 65%: Live HUD / Video Feed */}
        <div className="flex-1 relative bg-black flex items-center justify-center border-r border-slate-800 overflow-hidden">
          {/* MJPEG Stream or Synthetic Preview */}
          <div className="w-full h-full relative flex items-center justify-center">
            {connected ? (
              <img
                src={`http://${endpointInput.host}:${endpointInput.port}/video_feed`}
                alt="RoadGuard HUD Feed"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}

            {/* Offline / Standby Simulated Road Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
              {/* Top Left Speed Limit Badge */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 bg-white border-4 border-slate-900 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-2xl">
                  <span className="text-[10px] font-black tracking-tighter text-slate-900 uppercase">SPEED</span>
                  <span className="text-2xl font-black text-slate-950 font-mono -my-1">
                    {telemetry.speed_limit_mph || 45}
                  </span>
                  <span className="text-[9px] font-black tracking-tighter text-slate-900 uppercase">LIMIT</span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 font-mono">
                  <div className="text-[10px] text-slate-400">VEHICLE SPEED (iPAD GPS)</div>
                  <div className="text-3xl font-black text-white">
                    {Math.round(sensors.gps.speed_mph || telemetry.speed_mph)}
                    <span className="text-xs font-normal text-slate-400 ml-1">MPH</span>
                  </div>
                </div>
              </div>

              {/* Bottom Alert Banner Overlay */}
              {topAlert && (
                <div
                  className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between ${
                    topAlert.priority === 'CRITICAL'
                      ? 'bg-rose-950/90 border-rose-600'
                      : 'bg-amber-950/90 border-amber-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={28} className={topAlert.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'} />
                    <div>
                      <div className="text-xs font-mono uppercase font-bold text-slate-300">
                        {topAlert.priority} · {topAlert.hazard_type}
                      </div>
                      <div className="text-lg font-bold text-white tracking-tight">{topAlert.message}</div>
                    </div>
                  </div>
                  {topAlert.approx_distance_m && (
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-300">DISTANCE</div>
                      <div className="text-2xl font-black text-white">~{Math.round(topAlert.approx_distance_m)}m</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 35%: iPad Sensor Offloading & Fusion Center */}
        <div className="w-[380px] bg-slate-900 p-5 flex flex-col gap-4 overflow-y-auto border-l border-slate-800">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <Activity size={15} />
            <span>iPad Sensor Stream & Offload</span>
          </div>

          {/* Topographical Mountain Pass Mini-Map (Leaflet.js) */}
          <MountainMiniMap
            latitude={sensors.gps.latitude}
            longitude={sensors.gps.longitude}
            heading={sensors.gps.heading_deg || 245}
            speedMph={sensors.gps.speed_mph || telemetry.speed_mph}
            altitudeFt={sensors.gps.altitude_ft || 11990}
          />

          {/* Artificial Horizon / Vehicle Pitch & Roll (Mountain Pass Grade) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
              <span>VEHICLE ATTITUDE (IMU)</span>
              <span className="text-sky-400">{sensors.imu.pitch_deg > 0 ? 'CLIMBING' : 'DESCENDING'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Road Pitch (Grade)</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {sensors.imu.pitch_deg > 0 ? `+${sensors.imu.pitch_deg}°` : `${sensors.imu.pitch_deg}°`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {(Math.tan((sensors.imu.pitch_deg * Math.PI) / 180) * 100).toFixed(1)}% Grade
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Lateral Lean (Roll)</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {sensors.imu.roll_deg}°
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Curve Banking</div>
              </div>
            </div>
          </div>

          {/* Accelerometer G-Meter */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
              <span>ACCELEROMETER G-METER</span>
              <span className="text-emerald-400 font-bold">{sensors.imu.g_force} G</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LAT X</span>
                <span className="text-white font-bold">{sensors.imu.accel_x}g</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LONG Y</span>
                <span className="text-white font-bold">{sensors.imu.accel_y}g</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">VERT Z</span>
                <span className="text-white font-bold">{sensors.imu.accel_z}g</span>
              </div>
            </div>
          </div>

          {/* iPad CoreLocation GPS Telemetry */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>iPAD HIGH-PRECISION GPS</span>
              <span className="text-sky-400">CO-LOCATION</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">COORDINATES</span>
                <span className="text-slate-200">
                  {sensors.gps.latitude.toFixed(4)}°, {sensors.gps.longitude.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">ALTITUDE</span>
                <span className="text-emerald-400 font-bold">
                  {sensors.gps.altitude_ft ? `${Math.round(sensors.gps.altitude_ft)} FT` : '11,990 FT'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">OFFLOAD RATE</span>
                <span className="text-sky-400 font-bold">10 Hz (WebSocket)</span>
              </div>
            </div>
          </div>

          {/* Active Threats Mini-List */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase">
                Active Threat Registry ({telemetry.active_alerts.length})
              </div>
              {telemetry.active_alerts.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-slate-600">
                  No critical hazards detected ahead
                </div>
              ) : (
                <div className="space-y-2">
                  {telemetry.active_alerts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-200 truncate max-w-[200px]">{a.message}</span>
                      <span className="text-rose-400 font-bold">~{Math.round(a.approx_distance_m || 0)}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Camera: {telemetry.camera_fps.toFixed(1)} FPS</span>
              <span>Inference: {telemetry.inference_fps.toFixed(1)} FPS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-mono mb-4 flex items-center gap-2">
              <Settings size={20} className="text-sky-400" />
              Raspberry Pi 5 Link Configuration
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Raspberry Pi IP Address / Hostname
                </label>
                <input
                  type="text"
                  value={endpointInput.host}
                  onChange={(e) => setEndpointInput({ ...endpointInput, host: e.target.value })}
                  placeholder="192.168.4.1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-sky-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Default Pi 5 Wi-Fi Hotspot IP is <code>192.168.4.1</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Port</label>
                <input
                  type="text"
                  value={endpointInput.port}
                  onChange={(e) => setEndpointInput({ ...endpointInput, port: e.target.value })}
                  placeholder="8080"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-sky-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 space-y-1">
                <div className="text-white font-bold mb-1">Offloaded Sensors:</div>
                <div>✔ CoreLocation High-Accuracy GPS (10Hz)</div>
                <div>✔ DeviceMotion 3-Axis Accelerometer (G-force)</div>
                <div>✔ DeviceOrientation Gyroscope (Pitch/Roll)</div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 text-white font-mono text-xs font-bold hover:bg-sky-500"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Camera, Video, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import { Detection, AlertEvent, TelemetryData } from '../types';

interface CockpitHudProps {
  telemetry: TelemetryData;
  activeAlert: AlertEvent | null;
  onEmitAlert: (alert: AlertEvent) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  scenario: string;
  onSelectScenario: (id: string) => void;
}

export const SCENARIOS = [
  { id: 'trail_ridge', name: 'Trail Ridge Road', alt: '12,183 ft', hazard: 'Elk on Roadside', speed: 35, limit: 35 },
  { id: 'red_mountain', name: 'Million Dollar Hwy', alt: '11,018 ft', hazard: 'Rock in Travel Lane', speed: 28, limit: 30 },
  { id: 'eisenhower', name: 'Eisenhower Approach', alt: '11,158 ft', hazard: 'Speed Drop & Traffic', speed: 58, limit: 50 },
  { id: 'loveland', name: 'Loveland Pass', alt: '11,990 ft', hazard: 'Frost Heave Pothole', speed: 38, limit: 40 },
  { id: 'webcam', name: 'Live Device Camera', alt: 'Real-time', hazard: 'Edge Inference', speed: 0, limit: 45 },
];

export const CockpitHud: React.FC<CockpitHudProps> = ({
  telemetry,
  activeAlert,
  onEmitAlert,
  audioEnabled,
  onToggleAudio,
  scenario,
  onSelectScenario,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLanes, setShowLanes] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const animFrameId = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const lastSpokenRef = useRef<string>('');

  // Voice speech synthesis for advisory alerts
  const speakAlert = useCallback((text: string) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    if (lastSpokenRef.current === text) return;
    lastSpokenRef.current = text;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    // Reset duplicate suppression after 5 seconds
    setTimeout(() => {
      if (lastSpokenRef.current === text) {
        lastSpokenRef.current = '';
      }
    }, 5000);
  }, [audioEnabled]);

  // Handle webcam toggle
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (scenario === 'webcam') {
      setUseWebcam(true);
      navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Webcam not accessible:', err);
          setUseWebcam(false);
        });
    } else {
      setUseWebcam(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [scenario]);

  // Generate synthetic detections based on scenario & time phase
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now() / 1000;
      const cycle = Math.floor(now) % 18;
      const dets: Detection[] = [];

      if (scenario === 'trail_ridge') {
        // Preceding SUV
        dets.push({
          id: 'veh_1',
          label: 'SUV',
          confidence: 0.94,
          bbox: { xmin: 520, ymin: 360, xmax: 680, ymax: 480 },
          approx_distance_m: 32,
          hazard_category: 'VEHICLE',
        });

        // Rocky Mountain Elk on shoulder
        if (cycle >= 2 && cycle <= 14) {
          const dist = Math.max(18, 48 - (cycle - 2) * 2.5);
          dets.push({
            id: 'wildlife_1',
            label: 'ELK',
            confidence: 0.91,
            bbox: { xmin: 220, ymin: 350, xmax: 380, ymax: 490 },
            approx_distance_m: Math.round(dist),
            hazard_category: 'WILDLIFE',
          });

          if (cycle === 4) {
            const alert: AlertEvent = {
              id: `elk_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              epoch_time: now,
              message: 'Rocky Mountain Elk detected on shoulder ~38m',
              short_audio_text: 'Wildlife near road.',
              priority: 'HIGH',
              hazard_type: 'wildlife_elk',
              approx_distance_m: 38,
              confidence: 0.91,
              latitude: telemetry.latitude,
              longitude: telemetry.longitude,
              altitude_ft: telemetry.altitude_ft,
              vehicle_speed_mph: telemetry.speed_mph,
            };
            onEmitAlert(alert);
            speakAlert('Wildlife near road.');
          }
        }
      } else if (scenario === 'red_mountain') {
        // Fallen Boulder / Rock in Travel Corridor
        if (cycle >= 3 && cycle <= 15) {
          const dist = Math.max(12, 40 - (cycle - 3) * 2.2);
          dets.push({
            id: 'rock_1',
            label: 'ROCK',
            confidence: 0.88,
            bbox: { xmin: 580, ymin: 440, xmax: 680, ymax: 510 },
            approx_distance_m: Math.round(dist),
            hazard_category: 'ROAD_HAZARD',
          });

          if (cycle === 5) {
            const alert: AlertEvent = {
              id: `rock_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              epoch_time: now,
              message: 'Rock debris directly in travel lane ~30m',
              short_audio_text: 'Rock in road.',
              priority: 'CRITICAL',
              hazard_type: 'road_debris',
              approx_distance_m: 30,
              confidence: 0.88,
              latitude: telemetry.latitude,
              longitude: telemetry.longitude,
              altitude_ft: telemetry.altitude_ft,
              vehicle_speed_mph: telemetry.speed_mph,
            };
            onEmitAlert(alert);
            speakAlert('Rock in road.');
          }
        }
      } else if (scenario === 'eisenhower') {
        // Preceding stopped car
        dets.push({
          id: 'veh_stop',
          label: 'CAR',
          confidence: 0.95,
          bbox: { xmin: 540, ymin: 380, xmax: 680, ymax: 490 },
          approx_distance_m: 24,
          hazard_category: 'VEHICLE',
        });

        // Speed Limit 50 sign
        dets.push({
          id: 'sign_50',
          label: 'SPEED 50',
          confidence: 0.96,
          bbox: { xmin: 980, ymin: 240, xmax: 1080, ymax: 360 },
          approx_distance_m: 35,
          hazard_category: 'SPEED_LIMIT',
        });

        if (cycle === 4) {
          const alert: AlertEvent = {
            id: `speed_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            epoch_time: now,
            message: 'Speed limit change detected: 50 MPH. Vehicle at 58 MPH.',
            short_audio_text: 'Speed limit 50. Above limit.',
            priority: 'HIGH',
            hazard_type: 'speed_limit',
            approx_distance_m: 35,
            confidence: 0.96,
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            altitude_ft: telemetry.altitude_ft,
            vehicle_speed_mph: telemetry.speed_mph,
          };
          onEmitAlert(alert);
          speakAlert('Speed limit 50. You are above the detected limit.');
        }
      } else if (scenario === 'loveland') {
        // Road surface pothole / frost heave
        if (cycle >= 2 && cycle <= 13) {
          const dist = Math.max(10, 36 - (cycle - 2) * 2.8);
          dets.push({
            id: 'pot_1',
            label: 'POTHOLE',
            confidence: 0.84,
            bbox: { xmin: 500, ymin: 470, xmax: 640, ymax: 540 },
            approx_distance_m: Math.round(dist),
            hazard_category: 'ROAD_HAZARD',
          });

          if (cycle === 4) {
            const alert: AlertEvent = {
              id: `pot_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              epoch_time: now,
              message: 'Severe frost heave pothole in right track ~22m',
              short_audio_text: 'Pothole ahead.',
              priority: 'HIGH',
              hazard_type: 'pothole',
              approx_distance_m: 22,
              confidence: 0.84,
              latitude: telemetry.latitude,
              longitude: telemetry.longitude,
              altitude_ft: telemetry.altitude_ft,
              vehicle_speed_mph: telemetry.speed_mph,
            };
            onEmitAlert(alert);
            speakAlert('Pothole ahead.');
          }
        }
      } else if (scenario === 'webcam') {
        // Device webcam interactive simulated detector
        dets.push({
          id: 'user_target',
          label: 'OBJECT AHEAD',
          confidence: 0.89,
          bbox: { xmin: 480, ymin: 240, xmax: 800, ymax: 560 },
          approx_distance_m: 14,
          hazard_category: 'VEHICLE',
        });
      }

      setDetections(dets);
    }, 1000);

    return () => clearInterval(timer);
  }, [scenario, telemetry, onEmitAlert, speakAlert]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      phaseRef.current += 0.04;
      const phase = phaseRef.current;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (useWebcam && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, w, h);
      } else {
        // 1. Sky & Rocky Mountain Horizon
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
        if (scenario === 'trail_ridge') {
          skyGrad.addColorStop(0, '#1e293b'); // alpine fog
          skyGrad.addColorStop(1, '#475569');
        } else if (scenario === 'loveland') {
          skyGrad.addColorStop(0, '#0f172a'); // overcast pass
          skyGrad.addColorStop(1, '#334155');
        } else {
          skyGrad.addColorStop(0, '#0284c7'); // clear Colorado sky
          skyGrad.addColorStop(1, '#38bdf8');
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.48);

        // Distant Mountain Peaks
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.48);
        ctx.lineTo(w * 0.15, h * 0.32);
        ctx.lineTo(w * 0.3, h * 0.42);
        ctx.lineTo(w * 0.5, h * 0.28);
        ctx.lineTo(w * 0.72, h * 0.38);
        ctx.lineTo(w * 0.88, h * 0.30);
        ctx.lineTo(w, h * 0.48);
        ctx.closePath();
        ctx.fill();

        // Snow Caps on Colorado Peaks
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.46, h * 0.31);
        ctx.lineTo(w * 0.5, h * 0.28);
        ctx.lineTo(w * 0.54, h * 0.31);
        ctx.closePath();
        ctx.fill();

        // 2. Asphalt Road Surface
        const roadGrad = ctx.createLinearGradient(0, h * 0.48, 0, h);
        if (telemetry.road_condition === 'WET') {
          roadGrad.addColorStop(0, '#1e293b');
          roadGrad.addColorStop(1, '#0f172a');
        } else if (telemetry.road_condition === 'ICE_POSSIBLE') {
          roadGrad.addColorStop(0, '#475569');
          roadGrad.addColorStop(1, '#334155');
        } else {
          roadGrad.addColorStop(0, '#334155');
          roadGrad.addColorStop(1, '#1e293b');
        }
        ctx.fillStyle = roadGrad;
        ctx.fillRect(0, h * 0.48, w, h * 0.52);

        // Vanishing Point
        const vpX = w * 0.5;
        const vpY = h * 0.48;

        // 3. Lane Lines
        if (showLanes) {
          // Yellow Center Dashes
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 6;
          ctx.setLineDash([30, 25]);
          ctx.lineDashOffset = -phase * 45;
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(w * 0.49, h);
          ctx.stroke();

          // Left White Edge
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(w * 0.1, h);
          ctx.stroke();

          // Right White Edge
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(w * 0.9, h);
          ctx.stroke();
        }
      }

      // 4. Bounding Boxes Overlay
      if (showBoxes) {
        detections.forEach((det) => {
          const { xmin, ymin, xmax, ymax } = det.bbox;
          let boxColor = '#10b981'; // green for vehicle
          if (det.hazard_category === 'WILDLIFE') boxColor = '#f97316'; // orange
          if (det.hazard_category === 'ROAD_HAZARD') boxColor = '#ef4444'; // red
          if (det.hazard_category === 'SPEED_LIMIT') boxColor = '#38bdf8'; // cyan

          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);

          // Label plate
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          const text = `${det.label} ~${det.approx_distance_m}m (${Math.round(det.confidence * 100)}%)`;
          ctx.font = '600 13px ui-monospace, monospace';
          const textWidth = ctx.measureText(text).width;
          ctx.fillRect(xmin, Math.max(16, ymin - 22), textWidth + 12, 20);

          ctx.fillStyle = boxColor;
          ctx.fillText(text, xmin + 6, Math.max(16, ymin - 7));
        });
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameId.current);
    };
  }, [scenario, useWebcam, showBoxes, showLanes, detections, telemetry.road_condition]);

  return (
    <div className="relative flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Top HUD Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE DASHCAM HUD
          </div>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-xs text-slate-400 font-mono">1280x720 · 30 FPS</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Overlay Toggles */}
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              showBoxes
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            Boxes {showBoxes ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowLanes(!showLanes)}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              showLanes
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            Lanes {showLanes ? 'ON' : 'OFF'}
          </button>

          {/* Audio TTS Mute Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-1.5 rounded border transition-colors ${
              audioEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
            title={audioEnabled ? 'Advisory Speech Active' : 'Advisory Speech Muted'}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain"
        />
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />

        {/* Speed Limit Sign Badge (Upper Right Corner) */}
        {telemetry.speed_limit_mph && (
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center justify-center w-16 h-20 bg-white border-4 border-black rounded shadow-2xl">
            <span className="text-[10px] font-black tracking-tight text-black leading-none uppercase">SPEED</span>
            <span className="text-[10px] font-black tracking-tight text-black leading-none uppercase">LIMIT</span>
            <span className="text-2xl font-black text-black leading-tight tabular-nums font-mono">
              {telemetry.speed_limit_mph}
            </span>
          </div>
        )}

        {/* Road Condition & Pitch Marker (Upper Left Corner) */}
        <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded px-3 py-2 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">SURFACE:</span>
            <span className={`font-semibold ${
              telemetry.road_condition === 'ICE_POSSIBLE'
                ? 'text-cyan-400'
                : telemetry.road_condition === 'WET'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {telemetry.road_condition} ({Math.round(telemetry.road_condition_conf * 100)}%)
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>RAV4 PITCH:</span>
            <span className="text-slate-200">-2.5° · 1.35m</span>
          </div>
        </div>

        {/* Active Spoken Alert HUD Banner */}
        {activeAlert && (
          <div
            className={`absolute bottom-4 left-4 right-4 z-20 px-4 py-3 rounded-lg border backdrop-blur-md flex items-center justify-between shadow-2xl transition-all duration-200 ${
              activeAlert.priority === 'CRITICAL'
                ? 'bg-rose-950/90 border-rose-500 text-rose-100'
                : activeAlert.priority === 'HIGH'
                ? 'bg-amber-950/90 border-amber-500 text-amber-100'
                : 'bg-slate-950/90 border-sky-500 text-sky-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${
                activeAlert.priority === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-600'
              }`}>
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-wider uppercase opacity-80">
                  {activeAlert.priority} ADVISORY · {activeAlert.hazard_type.replace('_', ' ')}
                </div>
                <div className="text-base font-bold tracking-tight">
                  {activeAlert.message}
                </div>
              </div>
            </div>
            {activeAlert.approx_distance_m && (
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-mono">EST. DISTANCE</span>
                <span className="text-xl font-bold font-mono tabular-nums">
                  ~{activeAlert.approx_distance_m}m
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Colorado Scenario Selector Bar */}
      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="text-xs font-medium text-slate-400 shrink-0">
          Colorado Route Simulation:
        </div>
        <div className="flex items-center gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap ${
                scenario === s.id
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {s.name} <span className="opacity-70 font-mono">({s.alt})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

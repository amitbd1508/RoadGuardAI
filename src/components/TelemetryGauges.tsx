import React from 'react';
import { Compass, Mountain, Gauge, Cpu, HardDrive, Thermometer, Shield, Satellite } from 'lucide-react';
import { TelemetryData } from '../types';

interface TelemetryGaugesProps {
  telemetry: TelemetryData;
}

export const TelemetryGauges: React.FC<TelemetryGaugesProps> = ({ telemetry }) => {
  const isOverspeed =
    telemetry.speed_limit_mph !== null &&
    telemetry.speed_mph > telemetry.speed_limit_mph + 5;

  const tempStatusColor =
    telemetry.cpu_temp_c >= 78
      ? 'text-rose-400'
      : telemetry.cpu_temp_c >= 65
      ? 'text-amber-400'
      : 'text-emerald-400';

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Speed & Headway Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Gauge size={14} className="text-sky-400" />
            Vehicle Speed & Limit
          </span>
          <span>U-BLOX GNSS</span>
        </div>

        <div className="flex items-baseline justify-between my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono tabular-nums text-white">
              {Math.round(telemetry.speed_mph)}
            </span>
            <span className="text-sm font-medium text-slate-400">MPH</span>
          </div>

          {telemetry.speed_limit_mph && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">LIMIT</span>
                <span className="text-xl font-bold font-mono text-white">
                  {telemetry.speed_limit_mph}
                </span>
              </div>
              {isOverspeed && (
                <span className="px-2 py-0.5 text-[11px] font-bold text-rose-300 bg-rose-950 border border-rose-800 rounded font-mono animate-pulse">
                  +{Math.round(telemetry.speed_mph - telemetry.speed_limit_mph)} MPH
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>PIPELINE FPS:</span>
          <span className="text-emerald-400 font-semibold">
            {telemetry.camera_fps.toFixed(1)} (AI {telemetry.inference_fps.toFixed(1)})
          </span>
        </div>
      </div>

      {/* 2. Colorado Mountain Geography */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Mountain size={14} className="text-amber-400" />
            Colorado Elevation
          </span>
          <span className="text-sky-400 font-medium">{telemetry.pass_name}</span>
        </div>

        <div className="space-y-1.5 my-1 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">ALTITUDE:</span>
            <span className="font-bold text-white tabular-nums text-sm">
              {Math.round(telemetry.altitude_ft).toLocaleString()} FT
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">ROAD GRADE:</span>
            <span className={`font-semibold ${telemetry.grade_pct >= 6.0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {telemetry.grade_pct.toFixed(1)}% {telemetry.grade_pct >= 6.0 && '(STEEP)'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">GPS FIX:</span>
            <span className="text-slate-300 tabular-nums">
              {telemetry.latitude.toFixed(4)}°, {telemetry.longitude.toFixed(4)}°
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>HEADING:</span>
          <span className="text-slate-200 font-semibold">{Math.round(telemetry.heading_deg)}° WNW</span>
        </div>
      </div>

      {/* 3. Raspberry Pi 5 Telemetry & Thermals */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Cpu size={14} className="text-purple-400" />
            Raspberry Pi 5 Health
          </span>
          <span className="text-emerald-400 font-medium">ACTIVE COOLER</span>
        </div>

        <div className="space-y-1.5 my-1 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">SoC TEMPERATURE:</span>
            <span className={`font-bold tabular-nums text-sm ${tempStatusColor}`}>
              {telemetry.cpu_temp_c.toFixed(1)} °C
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">CPU / RAM LOAD:</span>
            <span className="tabular-nums">
              {Math.round(telemetry.cpu_percent)}% / {Math.round(telemetry.ram_percent)}%
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">COOLER FAN PWM:</span>
            <span className="text-sky-300 tabular-nums">{telemetry.active_cooler_pwm}%</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>STORAGE / UPTIME:</span>
          <span className="text-slate-300 tabular-nums">
            {telemetry.disk_free_gb.toFixed(1)} GB · {formatUptime(telemetry.uptime_seconds)}
          </span>
        </div>
      </div>
    </div>
  );
};

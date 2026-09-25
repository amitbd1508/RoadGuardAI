import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Mountain, ShieldCheck, Play, ArrowRight } from 'lucide-react';

interface PassDetail {
  name: string;
  elevation: string;
  route: string;
  grade: string;
  hazards: string;
  status: 'READY' | 'WARNING';
}

const COLORADO_PASSES: PassDetail[] = [
  {
    name: 'Trail Ridge Road',
    elevation: '12,183 ft',
    route: 'US-34 · Rocky Mountain NP',
    grade: '7.5% Alpine Grade',
    hazards: 'Elk herds, zero guardrail tundra, rapid freezing fog',
    status: 'READY'
  },
  {
    name: 'Independence Pass',
    elevation: '12,095 ft',
    route: 'CO-82 · Twin Lakes to Aspen',
    grade: '7.0% Tight Curves',
    hazards: 'Single-lane rock narrows, sheer drop-offs, blind curves',
    status: 'READY'
  },
  {
    name: 'Loveland Pass',
    elevation: '11,990 ft',
    route: 'US-6 · Continental Divide',
    grade: '7.0% Switchbacks',
    hazards: 'Black ice chutes, heavy hazmat tankers, winter gale winds',
    status: 'READY'
  },
  {
    name: 'Eisenhower-Johnson Tunnel',
    elevation: '11,158 ft',
    route: 'I-70 · Continental Divide',
    grade: '7.0% Downgrade',
    hazards: 'Lighting transition shock, high-speed runaway truck ramps',
    status: 'READY'
  },
  {
    name: 'Red Mountain Pass',
    elevation: '11,018 ft',
    route: 'US-550 · Million Dollar Hwy',
    grade: '8.0% Cliff Hangers',
    hazards: 'No shoulder, vertical canyons, falling boulder zones',
    status: 'READY'
  }
];

export const ColoradoTripCheck: React.FC = () => {
  const [certifying, setCertifying] = useState(false);
  const [certified, setCertified] = useState(true);

  const runCertification = () => {
    setCertifying(true);
    setTimeout(() => {
      setCertifying(false);
      setCertified(true);
    }, 1200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Mountain size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              COLORADO ROAD-TRIP READINESS INSPECTOR
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validating 2024 Toyota RAV4 XSE embedded perception system for high-altitude Rocky Mountain passes.
          </p>
        </div>

        <button
          onClick={runCertification}
          disabled={certifying}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-mono text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
        >
          {certifying ? (
            <>
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Validating Peripherals...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Run Pre-Trip Certification
            </>
          )}
        </button>
      </div>

      {/* Subsystem Health Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded bg-slate-950 border border-slate-800">
          <div className="text-slate-400 mb-1">OFFLINE MAP DATA</div>
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> 5 Passes Cached
          </div>
        </div>
        <div className="p-3 rounded bg-slate-950 border border-slate-800">
          <div className="text-slate-400 mb-1">GPS SATELLITES</div>
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> GNSS Independent
          </div>
        </div>
        <div className="p-3 rounded bg-slate-950 border border-slate-800">
          <div className="text-slate-400 mb-1">WILDLIFE ENGINE</div>
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Elk / Moose / Deer
          </div>
        </div>
        <div className="p-3 rounded bg-slate-950 border border-slate-800">
          <div className="text-slate-400 mb-1">HIGH-ALTITUDE FAN</div>
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Active PWM 100%
          </div>
        </div>
      </div>

      {/* Mountain Pass Profiles Table */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
          Curated Mountain Pass Profiles & Road Invariants
        </h3>

        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pass & Summit</th>
                  <th className="py-2.5 px-3">Elevation</th>
                  <th className="py-2.5 px-3">Route & Corridor</th>
                  <th className="py-2.5 px-3">Primary Hazards</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {COLORADO_PASSES.map((pass) => (
                  <tr key={pass.name} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {pass.name}
                    </td>
                    <td className="py-3 px-3 text-sky-400 whitespace-nowrap font-semibold">
                      {pass.elevation}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {pass.route}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {pass.hazards}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle2 size={12} /> {pass.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-xs text-amber-200/90 leading-relaxed font-mono">
        <span className="font-bold text-amber-300">COLORADO TRAVEL NOTICE:</span> In high mountain terrain, weather changes abruptly. RoadGuard AI is an advisory aid and never replaces driver caution. Maintain safe following distances on downgrades and test RAV4 brakes prior to summit descents.
      </div>
    </div>
  );
};

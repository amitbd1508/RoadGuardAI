import React from 'react';
import { ShieldAlert, Car, AlertOctagon, Zap, BatteryCharging, Speaker } from 'lucide-react';

export const Rav4InstallGuide: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Car size={20} className="text-emerald-400" />
          <h2 className="text-base font-bold text-white font-mono">
            2024 TOYOTA RAV4 XSE IN-CABIN INSTALLATION BLUEPRINT
          </h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
          NON-INVASIVE MOUNT
        </span>
      </div>

      {/* Safety Invariant Banner */}
      <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg flex items-start gap-3 text-xs font-mono text-rose-200">
        <AlertOctagon size={20} className="text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-rose-300 text-sm">CRITICAL SAFETY INVARIANTS FOR TOYOTA RAV4:</div>
          <div>1. <strong className="text-white">ZERO CAN-BUS INTERFACE:</strong> Never tap into the RAV4 CAN-bus, OBD-II port, or Toyota Safety Sense (TSS) harness.</div>
          <div>2. <strong className="text-white">ZERO AIRBAG OBSTRUCTION:</strong> Route ribbon cables strictly behind door weatherstripping, avoiding A-pillar side curtain airbags.</div>
          <div>3. <strong className="text-white">ISOLATED BATTERY POWER:</strong> Power Raspberry Pi 5 exclusively from an external USB-C PD power bank (e.g. Anker 737) to prevent car battery drain.</div>
        </div>
      </div>

      {/* Physical Cabin Map Schematic */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-sky-400 font-bold flex items-center gap-1.5">
            <span>[1]</span> CAMERA MOUNT
          </div>
          <div className="text-white font-semibold">Rearview Mirror Center</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Attach suction arm directly below the Toyota TSS sensor housing. Wiped by windshield wipers during mountain rain/snow.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-sky-400 font-bold flex items-center gap-1.5">
            <span>[2]</span> CABLE ROUTING
          </div>
          <div className="text-white font-semibold">Headliner to A-Pillar</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Tuck thin cable into headliner seam, across passenger door rubber seal. Avoid crossing the curtain airbag deployment zone.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-sky-400 font-bold flex items-center gap-1.5">
            <span>[3]</span> POWER & PI 5
          </div>
          <div className="text-white font-semibold">Passenger Glove Shelf</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Rest the Pi 5 Active Cooler case and Anker 737 power bank on the flat shelf above the glovebox, secured with velcro straps.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-sky-400 font-bold flex items-center gap-1.5">
            <span>[4]</span> ADVISORY SPEAKER
          </div>
          <div className="text-white font-semibold">Passenger Grab Handle</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Clip JBL Clip 4 speaker to roof grab handle or place in cup holder. Spoken warnings clear at 65 MPH highway cruise.
          </p>
        </div>
      </div>

      {/* Desk Test to Field Test Roadmap */}
      <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
          Safe 6-Stage Progressive Testing Protocol
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-mono">
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 1</span>
            Desk & CLI Test
          </div>
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 2</span>
            Parked Camera Check
          </div>
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 3</span>
            Dashcam Video Test
          </div>
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 4</span>
            Parked Audio Test
          </div>
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 5</span>
            Low-Speed Private Road
          </div>
          <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
            <span className="text-sky-400 font-bold block">Stage 6</span>
            Colorado Mountain Trip
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { AlertTriangle, Clock, Download, Filter, ShieldAlert } from 'lucide-react';
import { AlertEvent } from '../types';

interface AlertsFeedProps {
  alerts: AlertEvent[];
  onClearAlerts: () => void;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts, onClearAlerts }) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const filtered = alerts.filter((a) => {
    if (filterPriority === 'ALL') return true;
    return a.priority === filterPriority;
  });

  const exportCSV = () => {
    if (alerts.length === 0) return;
    const headers = 'ID,Timestamp,Priority,Hazard,Distance_m,Confidence,Lat,Lon,Speed_MPH,Message\n';
    const rows = alerts.map(a =>
      `"${a.id}","${a.timestamp}","${a.priority}","${a.hazard_type}","${a.approx_distance_m || ''}","${a.confidence}","${a.latitude}","${a.longitude}","${a.vehicle_speed_mph}","${a.message.replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roadguard_events_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
            SQLite Incident Log ({alerts.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  filterPriority === p
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            disabled={alerts.length === 0}
            className="p-1.5 text-xs rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
            title="Export Incidents CSV"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            No hazard incidents logged yet. Monitoring forward roadway...
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-2.5 rounded border text-xs font-mono flex items-start justify-between gap-3 ${
                alert.priority === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  : alert.priority === 'HIGH'
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      alert.priority === 'CRITICAL'
                        ? 'bg-rose-800 text-white'
                        : alert.priority === 'HIGH'
                        ? 'bg-amber-800 text-white'
                        : 'bg-slate-800 text-sky-300'
                    }`}
                  >
                    {alert.priority}
                  </span>
                  <span className="font-semibold text-white">{alert.message}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{alert.timestamp}</span>
                  <span>·</span>
                  <span>{alert.latitude.toFixed(4)}°, {alert.longitude.toFixed(4)}°</span>
                  <span>·</span>
                  <span>{Math.round(alert.altitude_ft)} ft</span>
                  <span>·</span>
                  <span>{Math.round(alert.vehicle_speed_mph)} MPH</span>
                </div>
              </div>

              {alert.approx_distance_m && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">DISTANCE</div>
                  <div className="font-bold text-sm text-white tabular-nums">
                    ~{Math.round(alert.approx_distance_m)}m
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

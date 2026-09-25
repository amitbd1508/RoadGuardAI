import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Mountain,
  WifiOff,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  AlertTriangle
} from 'lucide-react';

interface MountainMiniMapProps {
  latitude: number;
  longitude: number;
  heading: number;
  speedMph: number;
  altitudeFt: number;
  passName?: string;
  gradePct?: number;
}

const COLORADO_PASS_TRACKS: Record<
  string,
  {
    name: string;
    summitFt: number;
    highway: string;
    waypoints: [number, number, number][];
    hairpins: [number, number, string][];
  }
> = {
  loveland: {
    name: 'Loveland Pass (US-6)',
    summitFt: 11990,
    highway: 'US-6',
    waypoints: [
      [39.6912, -105.9015, 10800],
      [39.6845, -105.8942, 11150],
      [39.6781, -105.8884, 11420],
      [39.6712, -105.8821, 11690],
      [39.6636, -105.8792, 11990],
      [39.6582, -105.8835, 11750],
      [39.6515, -105.8898, 11340],
      [39.6438, -105.8985, 10920],
      [39.6380, -105.9082, 10600],
    ],
    hairpins: [
      [39.6795, -105.8895, 'Switchback #1 (North Ascent)'],
      [39.6718, -105.8825, 'Switchback #2 (Ridge Corner)'],
      [39.6568, -105.8850, 'South Hairpin #3'],
    ],
  },
  trail_ridge: {
    name: 'Trail Ridge Road (US-34)',
    summitFt: 12183,
    highway: 'US-34',
    waypoints: [
      [40.4150, -105.7480, 10750],
      [40.4225, -105.7530, 11200],
      [40.4310, -105.7515, 11700],
      [40.4398, -105.7450, 12050],
      [40.4412, -105.7538, 12183],
      [40.4385, -105.7660, 11950],
      [40.4320, -105.7820, 11400],
      [40.4250, -105.8010, 10750],
    ],
    hairpins: [
      [40.4280, -105.7525, 'Many Parks Curve'],
      [40.4365, -105.7485, 'Rainbow Curve'],
    ],
  },
};

export const MountainMiniMap: React.FC<MountainMiniMapProps> = ({
  latitude,
  longitude,
  heading,
  speedMph,
  altitudeFt,
  passName = 'Loveland Pass (US-6)',
  gradePct = 6.8,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const [mapMode, setMapMode] = useState<'topo' | 'dark'>('topo');

  const activePass = COLORADO_PASS_TRACKS.loveland;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    const tileUrl =
      mapMode === 'topo'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 17,
      subdomains: 'abc',
    }).addTo(map);

    // Mountain Pass Polyline
    const routeCoords: [number, number][] = activePass.waypoints.map((w) => [w[0], w[1]]);
    L.polyline(routeCoords, { color: '#38bdf8', weight: 4, opacity: 0.8 }).addTo(map);

    // Vehicle Marker Arrow
    const vehicleIcon = L.divIcon({
      className: 'ipad-vehicle-icon',
      html: `
        <div style="position: relative; width: 26px; height: 26px;">
          <div style="
            position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            background: #0284c7; border: 2px solid #ffffff; border-radius: 50%;
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.9);
            transform: rotate(${heading}deg);
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([latitude, longitude], { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapMode]);

  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleMarkerRef.current) return;
    vehicleMarkerRef.current.setLatLng([latitude, longitude]);
    mapInstanceRef.current.panTo([latitude, longitude], { animate: true, duration: 0.2 });
  }, [latitude, longitude, heading]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-sky-400 font-bold">
          <Mountain size={14} />
          <span>{activePass.name}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
          <WifiOff size={10} />
          <span>FREE OFFLINE TOPO</span>
        </div>
      </div>

      <div className="relative w-full h-[180px]">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded p-1.5 font-mono text-[10px]">
          <span className="text-slate-400 block">ALTITUDE</span>
          <span className="text-emerald-400 font-bold">{Math.round(altitudeFt).toLocaleString()} FT</span>
        </div>
        <div className="absolute bottom-2 right-2 z-[400] flex gap-1">
          <button
            onClick={() => mapInstanceRef.current?.setView([latitude, longitude], 15)}
            className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-sky-400"
          >
            <Navigation size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  MapPin,
  Mountain,
  Maximize2,
  Layers,
  WifiOff,
  Navigation,
  RefreshCw,
  AlertTriangle,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface MountainMiniMapProps {
  latitude: number;
  longitude: number;
  heading: number;
  speedMph: number;
  altitudeFt: number;
  passName: string;
  gradePct: number;
}

// Colorado Mountain Pass Waypoints with Topographical Elevation Profiles
const COLORADO_PASS_TRACKS: Record<
  string,
  {
    name: string;
    summitFt: number;
    highway: string;
    waypoints: [number, number, number][]; // [lat, lng, altFt]
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
      [39.6636, -105.8792, 11990], // Summit / Divide
      [39.6582, -105.8835, 11750],
      [39.6515, -105.8898, 11340],
      [39.6438, -105.8985, 10920],
      [39.6380, -105.9082, 10600],
    ],
    hairpins: [
      [39.6795, -105.8895, 'Switchback #1 (North Ascent)'],
      [39.6718, -105.8825, 'Switchback #2 (Ridge Corner)'],
      [39.6568, -105.8850, 'South Hairpin #3 (Arapahoe Basin Descent)'],
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
      [40.4412, -105.7538, 12183], // Highest continuous paved highway in US
      [40.4385, -105.7660, 11950],
      [40.4320, -105.7820, 11400],
      [40.4250, -105.8010, 10750],
    ],
    hairpins: [
      [40.4280, -105.7525, 'Many Parks Curve (Hairpin)'],
      [40.4365, -105.7485, 'Rainbow Curve (Drop-off)'],
      [40.4395, -105.7620, 'Gore Range Overlook Turn'],
    ],
  },
  red_mountain: {
    name: 'Red Mountain Pass (US-550)',
    summitFt: 11018,
    highway: 'US-550 (Million Dollar Hwy)',
    waypoints: [
      [37.9350, -107.6950, 9300],
      [37.9220, -107.6990, 9850],
      [37.9110, -107.7050, 10400],
      [37.8988, -107.7121, 11018], // Summit
      [37.8860, -107.7210, 10600],
      [37.8740, -107.7310, 10100],
      [37.8610, -107.7420, 9500],
    ],
    hairpins: [
      [37.9150, -107.7020, 'Unshielded Cliff Edge (No Guardrail)'],
      [37.9050, -107.7080, 'Idarado Mine Hairpin Turn'],
      [37.8920, -107.7160, 'Red Mountain Gorge Curve'],
    ],
  },
};

export const MountainMiniMap: React.FC<MountainMiniMapProps> = ({
  latitude,
  longitude,
  heading,
  speedMph,
  altitudeFt,
  passName,
  gradePct,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const breadcrumbLayerRef = useRef<L.Polyline | null>(null);
  const passLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'topo' | 'dark' | 'offline_vector'>('topo');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState<number>(14);
  const [breadcrumbHistory, setBreadcrumbHistory] = useState<[number, number][]>([]);

  // Identify active pass track profile
  const activePassKey = passName.toLowerCase().includes('trail')
    ? 'trail_ridge'
    : passName.toLowerCase().includes('red')
    ? 'red_mountain'
    : 'loveland';
  const activePass = COLORADO_PASS_TRACKS[activePassKey] || COLORADO_PASS_TRACKS.loveland;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy prior map instance if any
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
      scrollWheelZoom: true,
      doubleClickZoom: false,
    });

    mapInstanceRef.current = map;

    // Create Tile Layer depending on mode
    let tileUrl = '';
    let maxZoom = 17;

    if (mapMode === 'topo') {
      // Free OpenTopoMap (Contour lines + hillshade relief)
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    } else if (mapMode === 'dark') {
      // Free CartoDB Dark Matter (High contrast night/cockpit mode)
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      maxZoom = 19;
    }

    if (tileUrl && mapMode !== 'offline_vector') {
      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom,
        subdomains: 'abc',
        // Fallback gracefully on tile fetch errors when in offline mountain passes
        errorTileUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="%230f172a"/><path d="M0,0 L256,256 M256,0 L0,256" stroke="%231e293b" stroke-width="1"/></svg>',
      });
      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;
    }

    // Pass track & waypoints Layer Group
    const passGroup = L.layerGroup().addTo(map);
    passLayerRef.current = passGroup;

    // Render Mountain Pass Road Line with Gradient Styling
    const routeCoords: [number, number][] = activePass.waypoints.map((w) => [w[0], w[1]]);

    // Outer glow for the mountain highway
    L.polyline(routeCoords, {
      color: '#38bdf8',
      weight: 6,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(passGroup);

    // Inner sharp highway track
    L.polyline(routeCoords, {
      color: '#0284c7',
      weight: 3,
      opacity: 0.9,
      dashArray: '6, 6',
    }).addTo(passGroup);

    // Summit Marker Badge
    const summitPoint = activePass.waypoints.reduce((prev, curr) => (curr[2] > prev[2] ? curr : prev));
    const summitIcon = L.divIcon({
      className: 'custom-summit-icon',
      html: `
        <div style="
          background: #0f172a;
          border: 2px solid #f59e0b;
          border-radius: 6px;
          padding: 2px 5px;
          color: #fef3c7;
          font-family: monospace;
          font-size: 9px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span style="color: #f59e0b;">▲</span>
          <span>${activePass.summitFt.toLocaleString()}' CREST</span>
        </div>
      `,
      iconSize: [85, 20],
      iconAnchor: [42, 10],
    });

    L.marker([summitPoint[0], summitPoint[1]], { icon: summitIcon }).addTo(passGroup);

    // Hairpin Curve Warning Markers
    activePass.hairpins.forEach(([hLat, hLng, label]) => {
      const hairpinIcon = L.divIcon({
        className: 'custom-hairpin-icon',
        html: `
          <div style="
            background: #991b1b;
            color: #ffffff;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 900;
            border: 1.5px solid #fecaca;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          " title="${label}">!</div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([hLat, hLng], { icon: hairpinIcon }).addTo(passGroup);
    });

    // Create Breadcrumb history line
    const breadcrumbs = L.polyline([], {
      color: '#34d399',
      weight: 2,
      opacity: 0.8,
      dashArray: '3, 4',
    }).addTo(map);
    breadcrumbLayerRef.current = breadcrumbs;

    // Vehicle Location & Heading Marker (RAV4 XSE arrow)
    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-icon',
      html: `
        <div style="position: relative; width: 28px; height: 28px;">
          <!-- Radar pulse ring -->
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(56, 189, 248, 0.25);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <!-- Vehicle Direction Arrow -->
          <div style="
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0284c7;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.9);
            transform: rotate(${heading}deg);
            transition: transform 0.2s ease-out;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([latitude, longitude], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
    vehicleMarkerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapMode, activePassKey]);

  // Update vehicle position, heading, and breadcrumbs dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleMarkerRef.current) return;

    // Update vehicle marker coordinate
    vehicleMarkerRef.current.setLatLng([latitude, longitude]);

    // Update vehicle marker heading rotation
    const markerEl = vehicleMarkerRef.current.getElement();
    if (markerEl) {
      const arrowEl = markerEl.querySelector('div > div:nth-child(2)') as HTMLElement;
      if (arrowEl) {
        arrowEl.style.transform = `rotate(${heading}deg)`;
      }
    }

    // Keep map centered on vehicle
    mapInstanceRef.current.panTo([latitude, longitude], { animate: true, duration: 0.3 });

    // Append to breadcrumb trail
    setBreadcrumbHistory((prev) => {
      const next = [...prev.slice(-35), [latitude, longitude] as [number, number]];
      if (breadcrumbLayerRef.current) {
        breadcrumbLayerRef.current.setLatLngs(next);
      }
      return next;
    });
  }, [latitude, longitude, heading]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
      setCurrentZoom(mapInstanceRef.current.getZoom());
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
      setCurrentZoom(mapInstanceRef.current.getZoom());
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
      setCurrentZoom(15);
    }
  };

  // Delta to pass summit
  const summitDeltaFt = activePass.summitFt - altitudeFt;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* Mini-Map Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-sky-400 font-bold">
          <Mountain size={14} />
          <span className="truncate max-w-[140px]">{activePass.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Offline / Free Map Status Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold">
            <WifiOff size={10} />
            <span>OFFLINE TOPOGRAPHY</span>
          </span>

          {/* Mode Switcher */}
          <button
            onClick={() => setMapMode(mapMode === 'topo' ? 'dark' : mapMode === 'dark' ? 'offline_vector' : 'topo')}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title={`Current: ${mapMode}. Click to toggle layer`}
          >
            <Layers size={13} />
          </button>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full h-[220px] bg-slate-950 overflow-hidden">
        {/* If in pure offline vector mode, show topographical contour overlay background */}
        {mapMode === 'offline_vector' && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Synthetic Elevation Contour Rings for Colorado Pass */}
            <svg className="w-full h-full text-sky-900/30" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50%" cy="50%" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
              <circle cx="50%" cy="50%" r="75" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50%" cy="50%" r="105" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 4" />
              <circle cx="50%" cy="50%" r="135" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Cockpit HUD HUD Overlay Elements */}
        {/* Top-Left: Altitude & Summit Delta */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-2 font-mono text-[11px] shadow-lg space-y-0.5">
            <div className="text-[9px] text-slate-400">GPS ELEVATION</div>
            <div className="text-sm font-black text-emerald-400">
              {Math.round(altitudeFt).toLocaleString()} <span className="text-[10px] text-slate-400">FT</span>
            </div>
            <div className="text-[10px] text-amber-400 font-bold">
              {summitDeltaFt > 0 ? `-${Math.round(summitDeltaFt)}' to Crest` : `Passed Crest (+${Math.abs(Math.round(summitDeltaFt))}')`}
            </div>
          </div>
        </div>

        {/* Top-Right: Hairpin Curve Warning Badge */}
        {gradePct >= 6 && (
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-950/90 border border-amber-600 rounded text-[10px] font-mono font-bold text-amber-200 backdrop-blur-md shadow-lg">
              <AlertTriangle size={12} className="text-amber-400" />
              <span>{gradePct}% STEEP GRADE</span>
            </div>
          </div>
        )}

        {/* Bottom-Right: Quick Nav Controls */}
        <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1">
          <button
            onClick={handleRecenter}
            className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-sky-400 shadow-md transition-colors"
            title="Recenter on RAV4 GPS location"
          >
            <Navigation size={13} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
        </div>

        {/* Bottom-Left: Coordinates & Speed */}
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
          <div className="px-2 py-1 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span>{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
            <span className="text-sky-300 font-bold">{Math.round(speedMph)} MPH</span>
          </div>
        </div>
      </div>

      {/* Mini-Map Footer Details */}
      <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">{activePass.highway}</span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Contour: OpenTopo / Local Vector
        </div>
      </div>
    </div>
  );
};

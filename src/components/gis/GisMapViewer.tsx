import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Farmer } from '../../types';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  FileText,
  User,
  Trees,
} from 'lucide-react';

interface GisMapViewerProps {
  onSelectFarmer?: (farmer: Farmer) => void;
}

export const GisMapViewer: React.FC<GisMapViewerProps> = ({ onSelectFarmer }) => {
  const { farmers, practices } = useData();
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(farmers[0] || null);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'dark' | 'topo'>('satellite');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Regions for fast focus
  const regions = [
    { id: 'all', name: 'All Nigeria', centerLat: 10.0, centerLng: 8.5, zoom: 1 },
    { id: 'kano', name: 'Kano (Dambatta)', centerLat: 12.4382, centerLng: 8.5147, zoom: 2.2 },
    { id: 'jigawa', name: 'Jigawa (Dutse)', centerLat: 11.7594, centerLng: 9.3389, zoom: 2.2 },
    { id: 'kaduna', name: 'Kaduna (Zaria)', centerLat: 11.0855, centerLng: 7.7199, zoom: 2.2 },
    { id: 'benue', name: 'Benue (Gboko)', centerLat: 7.5, centerLng: 8.8, zoom: 2.0 },
  ];

  // Map bounding box for Nigeria:
  // Lat: 4°N to 14°N (height 10 deg)
  // Lng: 3°E to 14°E (width 11 deg)
  const minLat = 4.0;
  const maxLat = 14.2;
  const minLng = 2.8;
  const maxLng = 14.5;

  // Convert lat/lng to percentage in SVG viewBox (1000 x 700)
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    // Invert Y because lat increases upward
    const y = ((maxLat - lat) / (maxLat - minLat)) * 700;
    return { x, y };
  };

  const handleSelectRegion = (regionId: string) => {
    setActiveRegion(regionId);
    const target = regions.find((r) => r.id === regionId);
    if (!target) return;
    setZoomLevel(target.zoom);
    if (regionId === 'all') {
      setPanOffset({ x: 0, y: 0 });
    } else {
      const { x, y } = projectCoords(target.centerLat, target.centerLng);
      // center on 500, 350
      setPanOffset({
        x: (500 - x) * (target.zoom - 1),
        y: (350 - y) * (target.zoom - 1),
      });
    }
  };

  // Associated practices for selected farmer
  const selectedPractices = useMemo(() => {
    if (!selectedFarmer) return [];
    return practices.filter((p) => p.farmer_client_uuid === selectedFarmer.client_uuid);
  }, [selectedFarmer, practices]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-100 text-[#1B7F4B] dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-[#111827] dark:text-white text-base">GIS Farm Plot & EUDR Provenance Viewer</h2>
            <p className="text-xs text-[#6B7280] dark:text-slate-400">
              Interactive satellite inspection of smallholder GPS polygons and deforestation risk
            </p>
          </div>
        </div>

        {/* Region Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {regions.map((reg) => (
            <button
              key={reg.id}
              onClick={() => handleSelectRegion(reg.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeRegion === reg.id
                  ? 'bg-[#1B7F4B] text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-[#111827] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {reg.name}
            </button>
          ))}
        </div>

        {/* Map Style Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800">
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs' : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'dark' ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs' : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
          >
            Dark GIS
          </button>
          <button
            onClick={() => setMapStyle('topo')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'topo' ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs' : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
          >
            Terrain
          </button>
        </div>
      </div>

      {/* Main Map + Details Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
        {/* Interactive Map Canvas (8 cols) */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-between shadow-2xl">
          {/* Map Controls Overlay */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.4, 3.5))}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.4, 0.8))}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
                setActiveRegion('all');
              }}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs text-slate-300 max-w-xs space-y-1.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>EUDR Sentinel Layer</span>
              <span className="text-[10px] text-emerald-400 font-mono">REG-2023/1115</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
              <span>EUDR Compliant Smallholder Centroid</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded bg-emerald-500/30 border border-emerald-400"></span>
              <span>Farm Plot GPS Boundary Polygon</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <Trees className="w-3 h-3 text-emerald-400" />
              <span>Forest Canopy Baseline: Dec 31, 2020</span>
            </div>
          </div>

          {/* SVG Map Projection */}
          <div className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden">
            <svg
              viewBox="0 0 1000 700"
              className="w-full h-full transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                backgroundColor:
                  mapStyle === 'satellite' ? '#09151e' : mapStyle === 'dark' ? '#070b12' : '#0e1820',
              }}
            >
              {/* Satellite Background Grid Texture */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.5" />
                </pattern>
                {/* Glowing filters for plot polygons */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <rect width="1000" height="700" fill="url(#grid)" />

              {/* Nigeria Approximate Boundary Path (stylized geospatial outline) */}
              <path
                d="M 120 540 Q 180 570 280 580 Q 360 610 420 620 Q 520 640 580 580 Q 640 560 700 500 Q 740 450 820 400 Q 860 320 890 240 Q 880 180 840 140 Q 780 120 700 100 Q 600 90 520 110 Q 420 130 350 140 Q 260 160 200 200 Q 140 250 110 320 Q 100 420 120 540 Z"
                fill={
                  mapStyle === 'satellite'
                    ? 'rgba(16, 40, 32, 0.45)'
                    : mapStyle === 'dark'
                    ? 'rgba(15, 23, 42, 0.6)'
                    : 'rgba(20, 35, 45, 0.5)'
                }
                stroke="rgba(52, 211, 153, 0.3)"
                strokeWidth="1.5"
              />

              {/* Major Rivers / Landscape references (Benue & Niger confluence) */}
              <path
                d="M 120 380 Q 250 390 380 440 Q 520 460 640 470 Q 750 490 820 440"
                fill="none"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 380 440 Q 400 520 420 620"
                fill="none"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* State labels */}
              <text x="490" y="210" fill="rgba(255, 255, 255, 0.4)" fontSize="13" fontWeight="bold" fontFamily="monospace">
                KANO STATE
              </text>
              <text x="610" y="230" fill="rgba(255, 255, 255, 0.4)" fontSize="13" fontWeight="bold" fontFamily="monospace">
                JIGAWA STATE
              </text>
              <text x="400" y="290" fill="rgba(255, 255, 255, 0.4)" fontSize="13" fontWeight="bold" fontFamily="monospace">
                KADUNA STATE
              </text>
              <text x="520" y="490" fill="rgba(255, 255, 255, 0.4)" fontSize="13" fontWeight="bold" fontFamily="monospace">
                BENUE VALLEY
              </text>

              {/* Render Farm Plot GPS Boundary Polygons */}
              {farmers.map((farmer) => {
                const { x: cx, y: cy } = projectCoords(farmer.latitude, farmer.longitude);
                const isSelected = selectedFarmer?.client_uuid === farmer.client_uuid;

                // Compute visible boundary polygon
                let pointsString = '';
                if (farmer.gps_polygon) {
                  const rawCoords = farmer.gps_polygon
                    .split(';')
                    .map((pair) => {
                      const [latStr, lngStr] = pair.split(',');
                      const lat = parseFloat(latStr);
                      const lng = parseFloat(lngStr);
                      if (isNaN(lat) || isNaN(lng)) return null;
                      return projectCoords(lat, lng);
                    })
                    .filter((p): p is { x: number; y: number } => p !== null);

                  if (rawCoords.length >= 3) {
                    // Check if raw span is too small (< 12px) to see on nationwide map
                    const maxDist = Math.max(...rawCoords.map((p) => Math.hypot(p.x - cx, p.y - cy)));
                    const scaleFactor = maxDist > 0 && maxDist < 14 ? 16 / maxDist : 1;

                    pointsString = rawCoords
                      .map((p) => {
                        const px = cx + (p.x - cx) * scaleFactor;
                        const py = cy + (p.y - cy) * scaleFactor;
                        return `${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(' ');
                  }
                }

                // Fallback polygon if no explicit boundary
                if (!pointsString) {
                  const r = Math.max(10, Math.min(22, (farmer.farm_size_hectares || 4) * 2.5));
                  pointsString = `${cx - r},${cy - r} ${cx + r},${cy - r * 0.7} ${cx + r * 0.9},${cy + r} ${cx - r * 0.8},${cy + r * 0.9}`;
                }

                return (
                  <g key={`poly-${farmer.client_uuid}`}>
                    <polygon
                      points={pointsString}
                      fill={isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(52, 211, 153, 0.2)'}
                      stroke={isSelected ? '#10b981' : '#34d399'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      strokeDasharray={isSelected ? 'none' : '4,2'}
                      className="transition-all cursor-pointer hover:fill-emerald-500/50"
                      onClick={() => {
                        setSelectedFarmer(farmer);
                        if (onSelectFarmer) onSelectFarmer(farmer);
                      }}
                    />
                  </g>
                );
              })}

              {/* Render Farm Centroid Markers */}
              {farmers.map((farmer) => {
                const { x, y } = projectCoords(farmer.latitude, farmer.longitude);
                const isSelected = selectedFarmer?.client_uuid === farmer.client_uuid;

                return (
                  <g
                    key={`marker-${farmer.client_uuid}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer group"
                    onClick={() => {
                      setSelectedFarmer(farmer);
                      if (onSelectFarmer) onSelectFarmer(farmer);
                    }}
                  >
                    {/* Centroid Pulse ring if selected */}
                    {isSelected && (
                      <circle
                        r="18"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Outer marker pin */}
                    <circle
                      r={isSelected ? '10' : '7'}
                      fill={isSelected ? '#10b981' : '#059669'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all group-hover:scale-125"
                    />

                    {/* Centroid Center Dot */}
                    <circle r="3" fill="#ffffff" />

                    {/* Tooltip on hover */}
                    <text
                      y="-14"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-md font-mono"
                    >
                      {farmer.official_farmer_id} ({farmer.crop})
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Plot Detail Inspector Drawer (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-y-auto">
          {selectedFarmer ? (
            <div className="space-y-4">
              {/* Header: Farmer ID & EUDR Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-[#1B7F4B] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {selectedFarmer.official_farmer_id}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" /> EUDR Certified
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-white mt-1">{selectedFarmer.full_name}</h3>
                <p className="text-xs text-[#6B7280] dark:text-slate-400">
                  {selectedFarmer.community}, {selectedFarmer.lga}, {selectedFarmer.state} State
                </p>
              </div>

              {/* Plot Specifications Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Crop Commodity</span>
                  <div className="text-sm font-bold text-[#111827] dark:text-white mt-0.5">{selectedFarmer.crop}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Farm Plot Area</span>
                  <div className="text-sm font-bold text-[#1B7F4B] dark:text-emerald-400 mt-0.5">{selectedFarmer.farm_size_hectares} ha</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Centroid GPS</span>
                  <div className="text-[11px] font-mono text-[#111827] dark:text-slate-200 mt-0.5">
                    {selectedFarmer.latitude.toFixed(4)}°N, {selectedFarmer.longitude.toFixed(4)}°E
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Field Agent</span>
                  <div className="text-[11px] font-mono font-semibold text-[#111827] dark:text-slate-200 mt-0.5">
                    {selectedFarmer.agent_id}
                  </div>
                </div>
              </div>

              {/* EUDR Deforestation Compliance Box */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
                  <span>EU Deforestation Regulation (EUDR) Passed</span>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-300">
                  Farm boundary polygon verified against Copernicus 2020 tree cover canopy. Zero deforestation detected.
                </p>
                <div className="text-[10px] font-mono text-[#6B7280] dark:text-slate-400 pt-1 border-t border-emerald-200 dark:border-emerald-900/60 flex justify-between">
                  <span>POLYGON VERTICES:</span>
                  <span className="text-[#1B7F4B] dark:text-emerald-400">4 Points Closed Loop</span>
                </div>
              </div>

              {/* Chemical Applications / GAP History on this Plot */}
              <div>
                <h4 className="text-xs font-bold text-[#111827] dark:text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Applied Agrochemicals & PHI
                </h4>
                {selectedPractices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPractices.map((p) => (
                      <div
                        key={p.client_uuid}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#111827] dark:text-white">{p.product_name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                              p.phi_cleared
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {p.phi_cleared ? 'PHI Cleared' : 'PHI Active Hold'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-slate-400">
                          Active: {p.active_ingredient}
                        </div>
                        <div className="text-[10px] font-mono text-[#6B7280] dark:text-slate-500 flex justify-between">
                          <span>NAFDAC Reg: {p.nafdac_reg_no}</span>
                          <span>PHI: {p.pre_harvest_interval_days} Days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] dark:text-slate-500 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-[#E5E7EB] dark:border-slate-800/60">
                    No chemical sprays logged yet for this plot.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#6B7280] dark:text-slate-500">
              <MapPin className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2 opacity-50" />
              <p className="text-sm">Select any plot on the GIS map to inspect details.</p>
            </div>
          )}

          {/* Cooperative & Contact Footer */}
          {selectedFarmer && (
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 text-xs flex items-center justify-between text-[#6B7280] dark:text-slate-400">
              <span className="truncate max-w-[200px]">{selectedFarmer.cooperative_name || 'Individual Smallholder'}</span>
              <span className="font-mono text-[#1B7F4B] dark:text-emerald-400">{selectedFarmer.phone_number}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

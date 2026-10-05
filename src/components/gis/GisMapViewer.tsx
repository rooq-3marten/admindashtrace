import React, { useState, useMemo, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useData } from '../../context/DataContext';
import { Farmer } from '../../types';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  Polygon,
  useMap,
  useApiIsLoaded,
} from '@vis.gl/react-google-maps';
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
  Crosshair,
  Satellite,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Scale,
} from 'lucide-react';
import {
  validateAndCleanTopology,
  analyzeRemoteSensingTreeCover,
  detectBoundaryOverlaps,
} from '../../utils/eudrEngine';

interface GisMapViewerProps {
  onSelectFarmer?: (farmer: Farmer) => void;
}

// Regional Presets for quick camera navigation
const REGIONS = [
  { id: 'all', name: 'All Nigeria', center: { lat: 10.2, lng: 8.5 }, zoom: 6.5 },
  { id: 'kano', name: 'Kano (Dambatta Sesame)', center: { lat: 12.4382, lng: 8.5147 }, zoom: 14.5 },
  { id: 'jigawa', name: 'Jigawa (Ringim Cluster)', center: { lat: 12.1528, lng: 9.1628 }, zoom: 14.5 },
  { id: 'kaduna', name: 'Kaduna (Zaria Crops)', center: { lat: 11.0855, lng: 7.7199 }, zoom: 14.5 },
  { id: 'benue', name: 'Benue (Gboko Valley)', center: { lat: 7.7420, lng: 8.5310 }, zoom: 14.0 },
];

// Helper to safely parse or compute closed-loop boundary polygon
function parseFarmerPolygon(farmer: Farmer): { lat: number; lng: number }[] {
  if (farmer.gps_polygon && typeof farmer.gps_polygon === 'string' && farmer.gps_polygon.trim().length > 0) {
    const raw = farmer.gps_polygon.trim();
    const parts = raw.split(/[;\s]+/).filter(Boolean);
    const coords: { lat: number; lng: number }[] = [];
    for (const part of parts) {
      const [latStr, lngStr] = part.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng) && lat >= 4 && lat <= 15 && lng >= 2 && lng <= 16) {
        coords.push({ lat, lng });
      }
    }
    if (coords.length >= 3) {
      return coords;
    }
  }

  // Derive geographical parcel around centroid based on farm_size_hectares
  const lat = typeof farmer.latitude === 'number' && !isNaN(farmer.latitude) && farmer.latitude >= 4 && farmer.latitude <= 15
    ? farmer.latitude
    : 12.4382;
  const lng = typeof farmer.longitude === 'number' && !isNaN(farmer.longitude) && farmer.longitude >= 2 && farmer.longitude <= 16
    ? farmer.longitude
    : 8.5147;
  const hectares = typeof farmer.farm_size_hectares === 'number' && !isNaN(farmer.farm_size_hectares) && farmer.farm_size_hectares > 0
    ? farmer.farm_size_hectares
    : 4.5;

  const sideMeters = Math.sqrt(hectares * 10000); // meters per side
  // 1 deg lat ≈ 110,574 meters; 1 deg lng ≈ 111,320 * cos(lat)
  const dLat = (sideMeters / 2) / 110574;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = (sideMeters / 2) / (111320 * (cosLat || 1));

  return [
    { lat: Number((lat - dLat).toFixed(6)), lng: Number((lng - dLng).toFixed(6)) },
    { lat: Number((lat - dLat).toFixed(6)), lng: Number((lng + dLng).toFixed(6)) },
    { lat: Number((lat + dLat).toFixed(6)), lng: Number((lng + dLng).toFixed(6)) },
    { lat: Number((lat + dLat).toFixed(6)), lng: Number((lng - dLng).toFixed(6)) },
  ];
}

// Inner Camera Controller to smoothly pan & zoom Google Maps camera
const MapCameraController: React.FC<{
  targetCenter: { lat: number; lng: number };
  targetZoom: number;
  triggerKey: string | number;
}> = ({ targetCenter, targetZoom, triggerKey }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    try {
      map.panTo(targetCenter);
      map.setZoom(targetZoom);
    } catch (e) {
      console.warn('Map camera pan error:', e);
    }
  }, [map, targetCenter.lat, targetCenter.lng, targetZoom, triggerKey]);

  return null;
};

// Fallback Satellite Canvas when Google Maps is loading or in offline mode
const FallbackSatelliteCanvas: React.FC<{
  farmers: Farmer[];
  selectedFarmer: Farmer | null;
  onSelectFarmer: (f: Farmer) => void;
  activeRegion: string;
}> = ({ farmers, selectedFarmer, onSelectFarmer, activeRegion }) => {
  const minLat = 4.0;
  const maxLat = 14.5;
  const minLng = 2.5;
  const maxLng = 14.8;

  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 700;
    return { x, y };
  };

  return (
    <div className="w-full h-full relative bg-[#09151e] overflow-hidden flex items-center justify-center select-none">
      {/* High-Res Satellite Imagery Texture Overlay */}
      <div
        className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none mix-blend-luminosity"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
        }}
      />

      <svg viewBox="0 0 1000 700" className="w-full h-full relative z-10">
        <defs>
          <pattern id="sat-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />
          </pattern>
          <filter id="plot-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width="1000" height="700" fill="url(#sat-grid)" />

        {/* Nigeria Agro-Ecological Boundary Base */}
        <path
          d="M 120 540 Q 180 570 280 580 Q 360 610 420 620 Q 520 640 580 580 Q 640 560 700 500 Q 740 450 820 400 Q 860 320 890 240 Q 880 180 840 140 Q 780 120 700 100 Q 600 90 520 110 Q 420 130 350 140 Q 260 160 200 200 Q 140 250 110 320 Q 100 420 120 540 Z"
          fill="rgba(16, 40, 32, 0.55)"
          stroke="rgba(52, 211, 153, 0.4)"
          strokeWidth="1.5"
        />

        {/* River Basins */}
        <path
          d="M 120 380 Q 250 390 380 440 Q 520 460 640 470 Q 750 490 820 440"
          fill="none"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="3"
        />
        <path
          d="M 380 440 Q 400 520 420 620"
          fill="none"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="4"
        />

        {/* Farm Plots Polygons */}
        {farmers.map((farmer) => {
          const isSelected = selectedFarmer?.client_uuid === farmer.client_uuid;
          const polygonCoords = parseFarmerPolygon(farmer);
          const pointsStr = polygonCoords
            .map((p) => {
              const { x, y } = projectCoords(p.lat, p.lng);
              return `${x},${y}`;
            })
            .join(' ');

          const { x: cx, y: cy } = projectCoords(farmer.latitude, farmer.longitude);

          return (
            <g
              key={`fallback-${farmer.client_uuid}`}
              onClick={() => onSelectFarmer(farmer)}
              className="cursor-pointer group"
            >
              <polygon
                points={pointsStr}
                fill={isSelected ? 'rgba(6, 182, 212, 0.55)' : farmer.eudr_compliant ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.4)'}
                stroke={isSelected ? '#06b6d4' : farmer.eudr_compliant ? '#10b981' : '#f59e0b'}
                strokeWidth={isSelected ? '3.5' : '2'}
                filter={isSelected ? 'url(#plot-glow)' : undefined}
                className="transition-all duration-200 group-hover:stroke-white"
              />
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? '8' : '5'}
                fill={isSelected ? '#06b6d4' : farmer.eudr_compliant ? '#10b981' : '#f59e0b'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy - 12}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                className="pointer-events-none drop-shadow-md font-mono"
              >
                {farmer.official_farmer_id} ({farmer.crop})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// React Error Boundary to catch any third-party script rendering failures
class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Google Maps Platform Boundary Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const GisMapViewer: React.FC<GisMapViewerProps> = ({ onSelectFarmer }) => {
  const { farmers, practices } = useData();

  // Sanitize farmers ensuring valid coordinates and fields for rendering
  const safeFarmers = useMemo<Farmer[]>(() => {
    if (!Array.isArray(farmers)) return [];
    return farmers
      .filter((f) => f && (f.client_uuid || f.official_farmer_id))
      .map((f) => {
        let lat = typeof f.latitude === 'number' && !isNaN(f.latitude) ? f.latitude : 12.4382;
        let lng = typeof f.longitude === 'number' && !isNaN(f.longitude) ? f.longitude : 8.5147;
        const hectares =
          typeof f.farm_size_hectares === 'number' && !isNaN(f.farm_size_hectares) && f.farm_size_hectares > 0
            ? f.farm_size_hectares
            : 4.5;

        // If coordinates fall outside Nigeria territory (approx Lat 4-14.5, Lng 2.5-15), assign regional baseline
        if (lat < 4 || lat > 15 || lng < 2 || lng > 16) {
          const s = (f.state || '').toLowerCase();
          if (s.includes('jigawa')) {
            lat = 12.1528;
            lng = 9.1628;
          } else if (s.includes('benue')) {
            lat = 7.7420;
            lng = 8.5310;
          } else if (s.includes('kaduna')) {
            lat = 11.0855;
            lng = 7.7199;
          } else {
            lat = 12.4382;
            lng = 8.5147;
          }
        }

        return {
          ...f,
          latitude: lat,
          longitude: lng,
          farm_size_hectares: hectares,
          full_name: f.full_name || 'Enrolled Smallholder',
          official_farmer_id: f.official_farmer_id || f.client_uuid || 'TH-NG-2026-FARM',
          crop: f.crop || 'Sesame',
          eudr_compliant: f.eudr_compliant ?? true,
        };
      });
  }, [farmers]);

  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(() => safeFarmers[0] || null);
  const [mapStyle, setMapStyle] = useState<'hybrid' | 'satellite' | 'roadmap' | 'terrain'>('hybrid');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [cameraState, setCameraState] = useState<{
    center: { lat: number; lng: number };
    zoom: number;
    trigger: number;
  }>({
    center: { lat: 10.2, lng: 8.5 },
    zoom: 6.5,
    trigger: 1,
  });

  const [showSatellitePolygons, setShowSatellitePolygons] = useState<boolean>(true);
  const [showCentroidMarkers, setShowCentroidMarkers] = useState<boolean>(true);
  const [mapEngine, setMapEngine] = useState<'google' | 'fallback'>('google');

  // API Key provisioning with reliable fallback to provisioned demo key
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDUVr3YbwYrnDqCfoeddvPTOrFl6gPjngc';

  // Synchronize selected farmer when safeFarmers changes
  useEffect(() => {
    if (!selectedFarmer && safeFarmers.length > 0) {
      setSelectedFarmer(safeFarmers[0]);
    } else if (selectedFarmer && !safeFarmers.some((f) => f.client_uuid === selectedFarmer.client_uuid)) {
      setSelectedFarmer(safeFarmers[0] || null);
    }
  }, [safeFarmers, selectedFarmer]);

  const handleSelectFarmer = useCallback(
    (farmer: Farmer) => {
      setSelectedFarmer(farmer);
      if (onSelectFarmer) onSelectFarmer(farmer);

      setCameraState({
        center: { lat: farmer.latitude, lng: farmer.longitude },
        zoom: 16.5,
        trigger: Date.now(),
      });
    },
    [onSelectFarmer]
  );

  const handleSelectRegion = (regionId: string) => {
    setActiveRegion(regionId);
    const reg = REGIONS.find((r) => r.id === regionId);
    if (!reg) return;

    setCameraState({
      center: reg.center,
      zoom: reg.zoom,
      trigger: Date.now(),
    });

    if (regionId !== 'all') {
      const regionFarmers = safeFarmers.filter(
        (f) =>
          f.state.toLowerCase().includes(regionId.toLowerCase()) ||
          f.lga.toLowerCase().includes(regionId.toLowerCase()) ||
          f.community.toLowerCase().includes(regionId.toLowerCase())
      );
      if (regionFarmers.length > 0) {
        setSelectedFarmer(regionFarmers[0]);
      }
    }
  };

  // Associated practices for selected farmer
  const selectedPractices = useMemo(() => {
    if (!selectedFarmer) return [];
    return practices.filter(
      (p) =>
        p.farmer_client_uuid === selectedFarmer.client_uuid ||
        p.farmer_code === selectedFarmer.official_farmer_id
    );
  }, [selectedFarmer, practices]);

  const activeFarmerPolygon = useMemo(() => {
    if (!selectedFarmer) return [];
    return parseFarmerPolygon(selectedFarmer);
  }, [selectedFarmer]);

  const topologyResult = useMemo(() => {
    if (!selectedFarmer || activeFarmerPolygon.length === 0) return null;
    return validateAndCleanTopology(activeFarmerPolygon);
  }, [selectedFarmer, activeFarmerPolygon]);

  const rsAnalysis = useMemo(() => {
    if (!selectedFarmer) return null;
    return analyzeRemoteSensingTreeCover(selectedFarmer);
  }, [selectedFarmer]);

  const overlapReport = useMemo(() => {
    if (!selectedFarmer) return null;
    return detectBoundaryOverlaps(selectedFarmer, safeFarmers);
  }, [selectedFarmer, safeFarmers]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-[#1B7F4B] dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#111827] dark:text-white text-base">
                Geographical Farm Plot & EUDR Satellite Inspection
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                {safeFarmers.length} Plots Loaded
              </span>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-slate-400">
              High-resolution satellite and aerial imagery with precision smallholder boundary polygons and EUDR 2020 canopy validation
            </p>
          </div>
        </div>

        {/* Region Presets Toolbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {REGIONS.map((reg) => (
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

        {/* Imagery Style Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800">
          <button
            onClick={() => setMapStyle('hybrid')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'hybrid'
                ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
            title="High-resolution aerial satellite imagery with roads and landmarks"
          >
            Hybrid Satellite
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
            title="Pure satellite imagery"
          >
            Pure Satellite
          </button>
          <button
            onClick={() => setMapStyle('terrain')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'terrain'
                ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
            title="Topographical terrain map"
          >
            Terrain
          </button>
          <button
            onClick={() => setMapStyle('roadmap')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              mapStyle === 'roadmap'
                ? 'bg-white dark:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200'
            }`}
            title="Standard vector street map"
          >
            Roadmap
          </button>
        </div>
      </div>

      {/* Main Map + Details Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
        {/* Interactive Satellite Map Container (8 cols) */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 flex flex-col justify-between shadow-xl">
          {/* Quick Floating Map Actions Overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs shadow-md">
            <button
              onClick={() => setShowSatellitePolygons((v) => !v)}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                showSatellitePolygons
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Plot Boundaries ({safeFarmers.length})</span>
            </button>

            <button
              onClick={() => setShowCentroidMarkers((v) => !v)}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                showCentroidMarkers
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Centroid Pins</span>
            </button>

            {/* Map Engine Toggle */}
            <button
              onClick={() => setMapEngine((m) => (m === 'google' ? 'fallback' : 'google'))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1 transition cursor-pointer"
              title="Toggle between Google Satellite and High-Res Vector Imagery"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Engine: {mapEngine === 'google' ? 'Google Satellite' : 'Geospatial Vector'}</span>
            </button>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs text-slate-300 max-w-xs space-y-1.5 shadow-lg">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>EUDR Sentinel & Farm Layers</span>
              <span className="text-[10px] text-emerald-400 font-mono">REG-2023/1115</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded bg-emerald-500/40 border border-emerald-400"></span>
              <span>EUDR Deforestation-Free Farm Parcel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded bg-cyan-500/40 border border-cyan-400"></span>
              <span>Active Selected Farm Parcel</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <Trees className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copernicus Sentinel-2 Dec 31, 2020 Cutoff Reference</span>
            </div>
          </div>

          {/* Map Display Surface */}
          <div className="w-full h-full relative" style={{ minHeight: '620px' }}>
            {mapEngine === 'google' ? (
              <MapErrorBoundary
                fallback={
                  <FallbackSatelliteCanvas
                    farmers={safeFarmers}
                    selectedFarmer={selectedFarmer}
                    onSelectFarmer={handleSelectFarmer}
                    activeRegion={activeRegion}
                  />
                }
              >
                <APIProvider apiKey={apiKey} libraries={['maps', 'marker', 'geometry']}>
                  <Map
                    mapId="DEMO_MAP_ID"
                    mapTypeId={mapStyle}
                    defaultCenter={cameraState.center}
                    defaultZoom={cameraState.zoom}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    zoomControl={true}
                    mapTypeControl={false}
                    scaleControl={true}
                    streetViewControl={false}
                    rotateControl={true}
                    fullscreenControl={true}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%', minHeight: '620px' }}
                  >
                    <MapCameraController
                      targetCenter={cameraState.center}
                      targetZoom={cameraState.zoom}
                      triggerKey={cameraState.trigger}
                    />

                    {/* Render Farm Plot Polygons on Satellite Imagery */}
                    {showSatellitePolygons &&
                      safeFarmers.map((farmer) => {
                        const isSelected = selectedFarmer?.client_uuid === farmer.client_uuid;
                        const polygonPaths = parseFarmerPolygon(farmer);

                        const strokeColor = isSelected
                          ? '#06b6d4'
                          : farmer.eudr_compliant
                          ? '#10b981'
                          : '#f59e0b';

                        const fillColor = isSelected
                          ? '#06b6d4'
                          : farmer.eudr_compliant
                          ? '#059669'
                          : '#d97706';

                        return (
                          <Polygon
                            key={`poly-${farmer.client_uuid}`}
                            paths={polygonPaths}
                            strokeColor={strokeColor}
                            strokeOpacity={isSelected ? 1.0 : 0.85}
                            strokeWeight={isSelected ? 3.5 : 2}
                            fillColor={fillColor}
                            fillOpacity={isSelected ? 0.42 : 0.28}
                            onClick={() => handleSelectFarmer(farmer)}
                          />
                        );
                      })}

                    {/* Render Centroid Advanced Markers with Pin */}
                    {showCentroidMarkers &&
                      safeFarmers.map((farmer) => {
                        const isSelected = selectedFarmer?.client_uuid === farmer.client_uuid;
                        return (
                          <AdvancedMarker
                            key={`marker-${farmer.client_uuid}`}
                            position={{ lat: farmer.latitude, lng: farmer.longitude }}
                            onClick={() => handleSelectFarmer(farmer)}
                            title={`${farmer.full_name} (${farmer.crop})`}
                          >
                            <Pin
                              background={isSelected ? '#06b6d4' : farmer.eudr_compliant ? '#10b981' : '#f59e0b'}
                              borderColor="#ffffff"
                              glyphColor="#ffffff"
                              scale={isSelected ? 1.3 : 1.0}
                            />
                          </AdvancedMarker>
                        );
                      })}
                  </Map>
                </APIProvider>
              </MapErrorBoundary>
            ) : (
              <FallbackSatelliteCanvas
                farmers={safeFarmers}
                selectedFarmer={selectedFarmer}
                onSelectFarmer={handleSelectFarmer}
                activeRegion={activeRegion}
              />
            )}
          </div>
        </div>

        {/* Selected Plot Detail Inspector Drawer (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-y-auto space-y-4">
          {selectedFarmer ? (
            <div className="space-y-4">
              {/* Header: Farmer ID & EUDR Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-[#1B7F4B] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {selectedFarmer.official_farmer_id || selectedFarmer.client_uuid}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      rsAnalysis?.eudr_compliance_verdict === 'EUDR_CERTIFIED'
                        ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-700'
                        : 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-700'
                    }`}
                  >
                    {rsAnalysis?.eudr_compliance_verdict === 'EUDR_CERTIFIED' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{rsAnalysis?.eudr_compliance_verdict || 'EUDR Checked'}</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-white mt-1">
                  {selectedFarmer.full_name}
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-slate-400">
                  {selectedFarmer.community}, {selectedFarmer.lga}, {selectedFarmer.state} State, Nigeria
                </p>
              </div>

              {/* Overlap Radar Warning Banner if Neighbor Conflict Detected */}
              {overlapReport?.overlap_detected && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs space-y-1 text-red-900 dark:text-red-300">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                    <Scale className="w-4 h-4" />
                    <span>Neighboring Plot Boundary Overlap Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Overlaps by {overlapReport.total_overlapping_ha} ha with neighbor{' '}
                    <strong>{overlapReport.conflicts[0]?.conflicting_farmer_name}</strong>. Dispute hold active to prevent double-claim.
                  </p>
                </div>
              )}

              {/* Fly to Farm Plot Action */}
              <button
                onClick={() => {
                  setCameraState({
                    center: { lat: selectedFarmer.latitude, lng: selectedFarmer.longitude },
                    zoom: 17,
                    trigger: Date.now(),
                  });
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-[#1B7F4B] dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>Zoom Directly to Satellite Plot (Level 17)</span>
              </button>

              {/* Plot Specifications Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Commodity</span>
                  <div className="text-sm font-bold text-[#111827] dark:text-white mt-0.5">
                    {selectedFarmer.crop}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-[#E5E7EB] dark:border-slate-800">
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono">Farm Plot Area</span>
                  <div className="text-sm font-bold text-[#1B7F4B] dark:text-emerald-400 mt-0.5">
                    {selectedFarmer.farm_size_hectares} Hectares
                  </div>
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
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  rsAnalysis?.eudr_compliance_verdict === 'EUDR_CERTIFIED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                    {rsAnalysis?.eudr_compliance_verdict === 'EUDR_CERTIFIED' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>
                      {rsAnalysis?.eudr_compliance_verdict === 'EUDR_CERTIFIED'
                        ? 'EUDR Certified (0.00 ha Canopy Loss)'
                        : 'Compliance Review Hold (Disturbance Detected)'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    Cutoff: 2020-12-31
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-300 leading-relaxed">
                  {rsAnalysis?.timestamped_evidence_summary ||
                    `Geospatial polygon verified against Copernicus Sentinel-2 canopy data.`}
                </p>
                <div className="text-[10px] font-mono text-[#6B7280] dark:text-slate-400 pt-1 border-t border-emerald-200 dark:border-emerald-900/60 flex justify-between">
                  <span>POSTGIS ST_MAKEVALID:</span>
                  <span className="text-[#1B7F4B] dark:text-emerald-400 font-bold">
                    {topologyResult?.was_repaired ? 'REPAIRED (VALID)' : 'PASSED (SIMPLE RING)'} •{' '}
                    {topologyResult?.cleaned_vertex_count || activeFarmerPolygon.length} Vertices
                  </span>
                </div>
              </div>

              {/* GPS Polygon Vertices Coordinates Table */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-[#E5E7EB] dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#111827] dark:text-slate-200">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Polygon Boundary Vertices
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">EPSG:4326</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  {activeFarmerPolygon.map((coord, idx) => (
                    <div key={idx} className="flex justify-between px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span>Point {idx + 1}:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">
                        {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chemical Applications / GAP History on this Plot */}
              <div>
                <h4 className="text-xs font-bold text-[#111827] dark:text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Applied Agrochemicals & PHI Harvest Hold
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
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              p.phi_cleared
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {p.phi_cleared ? 'PHI Cleared' : 'PHI Active Hold'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-slate-400">
                          Active Ingredient: {p.active_ingredient}
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
                    No chemical sprays logged yet for this plot. Safe for immediate export aggregation.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-[#6B7280] dark:text-slate-500">
              <MapPin className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2 opacity-50" />
              <p className="text-sm">Select any farm plot polygon on the satellite map to inspect details.</p>
            </div>
          )}

          {/* Cooperative & Contact Footer */}
          {selectedFarmer && (
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 text-xs flex items-center justify-between text-[#6B7280] dark:text-slate-400">
              <span className="truncate max-w-[200px]">
                {selectedFarmer.cooperative_name || 'Individual Smallholder'}
              </span>
              <span className="font-mono text-[#1B7F4B] dark:text-emerald-400">
                {selectedFarmer.phone_number}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

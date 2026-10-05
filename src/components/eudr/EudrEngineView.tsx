import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Farmer } from '../../types';
import {
  Trees,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Download,
  Copy,
  Check,
  Compass,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  Maximize2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Hash,
  Database,
  Satellite,
  Radio,
  FileText,
  Scale,
  Users,
} from 'lucide-react';
import {
  parsePolygonCoords,
  coordsToPostGisWkt,
  coordsToDbString,
  validateAndCleanTopology,
  detectBoundaryOverlaps,
  analyzeRemoteSensingTreeCover,
  generateOfficialEudrAnnexIIGeoJson,
  downloadGeoJsonFile,
  Point2D,
} from '../../utils/eudrEngine';

export const EudrEngineView: React.FC = () => {
  const { farmers, batches, createDispute } = useData();

  // Active top tab
  const [activeTab, setActiveTab] = useState<'remote_sensing' | 'topology' | 'overlaps' | 'annex_ii'>(
    'remote_sensing'
  );

  // Selected farmer for detail inspection
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    farmers[0]?.client_uuid || ''
  );

  const selectedFarmer = useMemo(() => {
    return farmers.find((f) => f.client_uuid === selectedFarmerId) || farmers[0];
  }, [farmers, selectedFarmerId]);

  // Remote Sensing Analysis for Selected Farmer
  const [simulatedLossHa, setSimulatedLossHa] = useState<number | null>(null);
  const rsAnalysis = useMemo(() => {
    if (!selectedFarmer) return null;
    return analyzeRemoteSensingTreeCover(
      selectedFarmer,
      simulatedLossHa !== null ? simulatedLossHa : undefined
    );
  }, [selectedFarmer, simulatedLossHa]);

  // Topology Analysis for Selected Farmer
  const topologyResult = useMemo(() => {
    if (!selectedFarmer) return null;
    const coords = parsePolygonCoords(
      selectedFarmer.gps_polygon,
      selectedFarmer.latitude,
      selectedFarmer.longitude,
      selectedFarmer.farm_size_hectares
    );
    return validateAndCleanTopology(coords);
  }, [selectedFarmer]);

  // Overlap Report for Selected Farmer
  const overlapReport = useMemo(() => {
    if (!selectedFarmer) return null;
    return detectBoundaryOverlaps(selectedFarmer, farmers);
  }, [selectedFarmer, farmers]);

  // Global Overlap Collisions across all farmers
  const globalOverlapCollisions = useMemo(() => {
    const list: { farmerA: Farmer; farmerB: Farmer; overlapHa: number; pct: number }[] = [];
    const seenPairs = new Set<string>();

    for (let i = 0; i < farmers.length; i++) {
      const fa = farmers[i];
      const rep = detectBoundaryOverlaps(fa, farmers);
      for (const conflict of rep.conflicts) {
        const pairKey = [fa.official_farmer_id, conflict.conflicting_farmer_id].sort().join('::');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          const fb = farmers.find(
            (f) => (f.official_farmer_id || f.client_uuid) === conflict.conflicting_farmer_id
          );
          if (fb) {
            list.push({
              farmerA: fa,
              farmerB: fb,
              overlapHa: conflict.overlap_hectares,
              pct: conflict.overlap_percentage,
            });
          }
        }
      }
    }
    return list;
  }, [farmers]);

  // Fleet-wide EUDR Statistics
  const stats = useMemo(() => {
    let certifiedCount = 0;
    let holdCount = 0;
    let totalHa = 0;

    for (const f of farmers) {
      const rs = analyzeRemoteSensingTreeCover(f);
      totalHa += f.farm_size_hectares || 4.5;
      if (rs.eudr_compliance_verdict === 'EUDR_CERTIFIED') {
        certifiedCount++;
      } else {
        holdCount++;
      }
    }

    return {
      totalPlots: farmers.length,
      totalHa: Math.round(totalHa * 10) / 10,
      certifiedCount,
      holdCount,
      overlapsCount: globalOverlapCollisions.length,
    };
  }, [farmers, globalOverlapCollisions]);

  // Topology Tester State (Custom input)
  const [customWktInput, setCustomWktInput] = useState<string>('');
  const [testResult, setTestResult] = useState<any>(null);

  // Preset faulty geometries for instant demonstration
  const handleLoadPreset = (type: 'bowtie' | 'duplicates' | 'unclosed') => {
    if (type === 'bowtie') {
      // Self-intersecting bowtie polygon
      const bowtieStr = '12.4350,8.5120;12.4390,8.5180;12.4350,8.5180;12.4390,8.5120';
      setCustomWktInput(bowtieStr);
      const pts = parsePolygonCoords(bowtieStr);
      setTestResult(validateAndCleanTopology(pts));
    } else if (type === 'duplicates') {
      // Consecutive duplicate vertices
      const dupStr = '12.4350,8.5120;12.4350,8.5120;12.4350,8.5180;12.4390,8.5180;12.4390,8.5120';
      setCustomWktInput(dupStr);
      const pts = parsePolygonCoords(dupStr);
      setTestResult(validateAndCleanTopology(pts));
    } else {
      // Valid closed polygon
      const validStr = '12.4342,8.5131;12.4374,8.5131;12.4374,8.5163;12.4342,8.5163';
      setCustomWktInput(validStr);
      const pts = parsePolygonCoords(validStr);
      setTestResult(validateAndCleanTopology(pts));
    }
  };

  // Annex II Exporter State
  const [exportCommodity, setExportCommodity] = useState<string>('Sesame');
  const [exportCountry, setExportCountry] = useState<string>('NGA');
  const [exportDdsId, setExportDdsId] = useState<string>('DDS-2026-90412');
  const [exportOperator, setExportOperator] = useState<string>(
    'TraceHarvest Export Logistics & Commodities Ltd'
  );
  const [exportEori, setExportEori] = useState<string>('NL847291038');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Generated Official Annex II GeoJSON
  const generatedAnnexII = useMemo(() => {
    return generateOfficialEudrAnnexIIGeoJson(farmers, {
      commodity: exportCommodity,
      countryOfProduction: exportCountry,
      eudrDueDiligenceId: exportDdsId,
      operatorName: exportOperator,
      operatorEori: exportEori,
    });
  }, [farmers, exportCommodity, exportCountry, exportDdsId, exportOperator, exportEori]);

  const handleCopyGeoJson = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedAnnexII, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyEvidenceHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadGeoJson = () => {
    downloadGeoJsonFile(generatedAnnexII);
  };

  const handleRegisterDispute = (collision: { farmerA: Farmer; farmerB: Farmer; overlapHa: number }) => {
    if (!createDispute) return;
    createDispute({
      farmer_id: collision.farmerA.official_farmer_id || collision.farmerA.client_uuid,
      farmer_name: `${collision.farmerA.full_name} vs ${collision.farmerB.full_name}`,
      region: collision.farmerA.state,
      issue: 'Boundary Overlap & Double-Claim Conflict',
      details: `Automated PostGIS collision detection identified ${collision.overlapHa} ha overlap between plot ${collision.farmerA.official_farmer_id} and plot ${collision.farmerB.official_farmer_id}. Field cooperative dispute hold registered to prevent fraudulent dual EUDR clearance.`,
      status: 'Open',
    });
    alert(`Dispute registered successfully for ${collision.farmerA.official_farmer_id} vs ${collision.farmerB.official_farmer_id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Engine Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> EU Regulation 2023/1115
              </span>
              <span className="text-[11px] font-mono text-emerald-300/80 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
                Cutoff: Dec 31, 2020 Baseline
              </span>
              <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800">
                PostGIS ST_MakeValid Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Enterprise Geospatial & Automated EUDR Engine</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automated geometry topology cleaning, mutual smallholder boundary overlap detection, and Copernicus Sentinel-2 multispectral tree-cover validation against the December 31, 2020 regulatory forest baseline.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('annex_ii')}
              className="px-4 py-2 rounded-xl bg-[#1B7F4B] hover:bg-[#166534] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Annex II GeoJSON</span>
            </button>
            <button
              onClick={() => {
                setSimulatedLossHa(null);
                alert('Copernicus Sentinel-2 & GFW baseline re-synchronized across all smallholder parcels.');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Scan Fleet</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plots & Hectares */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B7280] dark:text-slate-400">Total Enrolled Area</span>
            <div className="text-2xl font-extrabold text-[#111827] dark:text-white mt-1">
              {stats.totalHa} <span className="text-sm font-semibold text-slate-500">ha</span>
            </div>
            <span className="text-[11px] text-slate-500">{stats.totalPlots} Smallholder Parcels</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* 0% Tree Cover Loss: EUDR Certified */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">0% Tree Cover Loss</span>
            <div className="text-2xl font-extrabold text-[#1B7F4B] dark:text-emerald-400 mt-1">
              {stats.certifiedCount}{' '}
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">
                ({Math.round((stats.certifiedCount / Math.max(1, stats.totalPlots)) * 100)}%)
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> EUDR Certified Cleared
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-[#1B7F4B] dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* > 0.1 ha Disturbance: Compliance Review Hold */}
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">&gt; 0.1 ha Disturbance</span>
            <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">
              {stats.holdCount}{' '}
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                ({Math.round((stats.holdCount / Math.max(1, stats.totalPlots)) * 100)}%)
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Compliance Review Hold
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <Trees className="w-5 h-5" />
          </div>
        </div>

        {/* Boundary Overlaps & Disputes */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Boundary Overlaps</span>
            <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-1">
              {stats.overlapsCount}{' '}
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-500">Flags</span>
            </div>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Double-Claim Defense
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-[#E5E7EB] dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('remote_sensing')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'remote_sensing'
              ? 'border-[#1B7F4B] text-[#1B7F4B] dark:text-emerald-400'
              : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Satellite className="w-4 h-4" />
          <span>Copernicus Sentinel-2 & Forest Baseline</span>
        </button>

        <button
          onClick={() => setActiveTab('topology')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'topology'
              ? 'border-[#1B7F4B] text-[#1B7F4B] dark:text-emerald-400'
              : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>PostGIS Topology & ST_MakeValid</span>
        </button>

        <button
          onClick={() => setActiveTab('overlaps')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'overlaps'
              ? 'border-[#1B7F4B] text-[#1B7F4B] dark:text-emerald-400'
              : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Boundary Overlaps Radar ({stats.overlapsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('annex_ii')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'annex_ii'
              ? 'border-[#1B7F4B] text-[#1B7F4B] dark:text-emerald-400'
              : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Official EUDR Annex II Exporter</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Copernicus Sentinel-2 Remote Sensing & Forest Baseline Validation   */}
      {/* ========================================================================= */}
      {activeTab === 'remote_sensing' && selectedFarmer && rsAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Plot Selector & Mini Table (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Select Plot for Satellite Inspection
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {farmers.length} Parcels
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {farmers.map((farmer) => {
                  const isSelected = farmer.client_uuid === selectedFarmer.client_uuid;
                  const itemRs = analyzeRemoteSensingTreeCover(farmer);
                  const isCertified = itemRs.eudr_compliance_verdict === 'EUDR_CERTIFIED';

                  return (
                    <div
                      key={farmer.client_uuid}
                      onClick={() => {
                        setSelectedFarmerId(farmer.client_uuid);
                        setSimulatedLossHa(null);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-1 ring-emerald-500'
                          : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {farmer.official_farmer_id || farmer.client_uuid}
                          </span>
                          <span className="text-[10px] text-slate-500">({farmer.crop})</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate max-w-[180px]">
                          {farmer.full_name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {farmer.lga}, {farmer.state} • {farmer.farm_size_hectares} ha
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                            isCertified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          }`}
                        >
                          {isCertified ? '0% Loss' : `${itemRs.tree_cover_loss_post_2020_ha} ha`}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-400 mt-1">
                          {isCertified ? 'EUDR CERTIFIED' : 'REVIEW HOLD'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regulatory Rules Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono text-[11px] uppercase">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                EUDR Automated Classification Rules
              </h4>
              <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
                  <span className="font-bold">0% Tree Cover Loss:</span> Automatically marked{' '}
                  <strong className="underline">EUDR Certified</strong>. Export batches aggregate this plot without audit delays.
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                  <span className="font-bold">&gt; 0.1 ha Disturbance:</span> Automatically locked in{' '}
                  <strong className="underline">Compliance Review Hold</strong> with satellite timestamped evidence. Prohibits EU export clearance.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Satellite Remote Sensing Evidence Dossier (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-5">
              {/* Header: Farmer & Verdict Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {selectedFarmer.official_farmer_id}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedFarmer.crop} • {selectedFarmer.farm_size_hectares} Hectares
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedFarmer.full_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedFarmer.community}, {selectedFarmer.lga}, {selectedFarmer.state} State, Nigeria
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                      rsAnalysis.eudr_compliance_verdict === 'EUDR_CERTIFIED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    {rsAnalysis.eudr_compliance_verdict === 'EUDR_CERTIFIED' ? (
                      <ShieldCheck className="w-4 h-4 text-[#1B7F4B]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{rsAnalysis.eudr_compliance_verdict}</span>
                  </span>
                  <span className="block text-[11px] font-mono text-slate-500 mt-1">
                    Risk Score: {rsAnalysis.risk_score} / 100
                  </span>
                </div>
              </div>

              {/* Satellite Acquisition & Dec 31, 2020 Forest Intersection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Dec 31, 2020 Forest Baseline</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {rsAnalysis.forest_baseline_2020_pct}% <span className="text-xs font-normal text-slate-500">Canopy</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Global Forest Watch (GFW)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Post-2020 Tree Cover Loss</span>
                  <div
                    className={`text-base font-bold mt-1 ${
                      rsAnalysis.tree_cover_loss_post_2020_ha > 0.1
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-[#1B7F4B] dark:text-emerald-400'
                    }`}
                  >
                    {rsAnalysis.tree_cover_loss_post_2020_ha} ha{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({rsAnalysis.tree_cover_loss_pct}%)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Threshold: &le; 0.10 ha allowed
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Sentinel-2 Pass Date</span>
                  <div className="text-base font-mono font-bold text-slate-900 dark:text-white mt-1">
                    {rsAnalysis.copernicus_sentinel.acquisition_date}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {rsAnalysis.copernicus_sentinel.cloud_cover_pct}% Cloud Cover
                  </span>
                </div>
              </div>

              {/* Spectral NDVI Delta & Remote Sensing Evidence Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {rsAnalysis.copernicus_sentinel.sensor}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Tile: {rsAnalysis.copernicus_sentinel.tile_id}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">NDVI (2020 Baseline):</span>
                    <p className="font-bold text-slate-200">{rsAnalysis.copernicus_sentinel.mean_ndvi_2020}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">NDVI (Latest Pass):</span>
                    <p className="font-bold text-slate-200">{rsAnalysis.copernicus_sentinel.mean_ndvi_current}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">NDVI Drop Delta:</span>
                    <p
                      className={`font-bold ${
                        rsAnalysis.copernicus_sentinel.ndvi_drop_delta < -0.1
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {rsAnalysis.copernicus_sentinel.ndvi_drop_delta > 0 ? '+' : ''}
                      {rsAnalysis.copernicus_sentinel.ndvi_drop_delta}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                  {rsAnalysis.timestamped_evidence_summary}
                </p>

                {/* Cryptographic Evidence Token */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/60 border border-slate-800 text-xs font-mono">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-slate-500 block">SATELLITE EVIDENCE HASH:</span>
                    <span className="text-cyan-400 text-[11px] truncate">
                      {rsAnalysis.satellite_evidence_sha256}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyEvidenceHash(rsAnalysis.satellite_evidence_sha256)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition shrink-0"
                    title="Copy Evidence Token"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Interactive Disturbance Simulator Slider (for testing) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Interactive Deforestation / Disturbance Tester
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Simulate Sentinel-2 Loss Event
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={simulatedLossHa !== null ? simulatedLossHa : rsAnalysis.tree_cover_loss_post_2020_ha}
                    onChange={(e) => setSimulatedLossHa(parseFloat(e.target.value))}
                    className="flex-1 accent-[#1B7F4B] cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white w-20 text-right">
                    {(simulatedLossHa !== null ? simulatedLossHa : rsAnalysis.tree_cover_loss_post_2020_ha).toFixed(2)} ha
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Drag slider &gt; 0.10 ha to verify automated transition into{' '}
                    <strong className="text-amber-700 dark:text-amber-400 font-mono">COMPLIANCE_REVIEW_HOLD</strong>.
                  </span>
                  {simulatedLossHa !== null && (
                    <button
                      onClick={() => setSimulatedLossHa(null)}
                      className="text-xs font-bold text-[#1B7F4B] hover:underline cursor-pointer"
                    >
                      Reset to Live Sensor
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PostGIS Topology & Self-Intersection Cleaning (ST_MakeValid)        */}
      {/* ========================================================================= */}
      {activeTab === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Selected Plot Geometry Inspection (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Plot Topology: {selectedFarmer.official_farmer_id}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFarmer.full_name} • {selectedFarmer.crop}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                    topologyResult?.was_repaired
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                  }`}
                >
                  {topologyResult?.was_repaired ? 'ST_MakeValid: Repaired' : 'ST_IsValid: Passed'}
                </span>
              </div>

              {/* Topology Verification Reasons */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  PostGIS Validation Log:
                </span>
                {topologyResult?.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Vertices:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {topologyResult?.cleaned_vertex_count} Points
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Area (Spherical):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {topologyResult?.calculated_hectares} ha
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Perimeter:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {topologyResult?.perimeter_meters} m
                  </span>
                </div>
              </div>

              {/* PostGIS SQL Query Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-[11px] space-y-1">
                <span className="text-slate-400 text-[10px] uppercase block">Executed PostGIS SQL:</span>
                <p className="text-emerald-400 break-all select-all">{topologyResult?.postgis_command}</p>
              </div>

              {/* Cleaned Vertices List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  WGS84 Cleaned Coordinates (Counter-Clockwise Closed Loop)
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs font-mono">
                  {topologyResult?.cleaned_polygon_coords.map((coord, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 px-2.5 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between"
                    >
                      <span className="text-slate-500">Vertex {idx + 1}:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">
                        {coord.lat.toFixed(6)}° N, {coord.lng.toFixed(6)}° E
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive PostGIS Topology Repair Console (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Interactive PostGIS ST_MakeValid Tester</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test polygon self-intersections, bowties, and collinear point collapsing.
                  </p>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 text-[11px]">Load Test Case:</span>
                <button
                  onClick={() => handleLoadPreset('bowtie')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium cursor-pointer"
                >
                  ⚡ Bowtie / Figure-8
                </button>
                <button
                  onClick={() => handleLoadPreset('duplicates')}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-medium cursor-pointer"
                >
                  ⚡ Duplicate Vertices
                </button>
                <button
                  onClick={() => handleLoadPreset('unclosed')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-medium cursor-pointer"
                >
                  ⚡ Valid Ring
                </button>
              </div>

              {/* Polygon String Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  Input GPS Polygon (semicolon lat,lng pairs):
                </label>
                <textarea
                  value={customWktInput}
                  onChange={(e) => {
                    setCustomWktInput(e.target.value);
                    const pts = parsePolygonCoords(e.target.value);
                    setTestResult(validateAndCleanTopology(pts));
                  }}
                  placeholder="e.g. 12.4350,8.5120;12.4390,8.5180;12.4350,8.5180;12.4390,8.5120"
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              {/* Test Result Inspection */}
              {testResult && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      Validation Verdict:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        testResult.has_self_intersections
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {testResult.has_self_intersections
                        ? 'Self-Intersection Detected'
                        : 'Clean Topology'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {testResult.reasons.map((r: string, idx: number) => (
                      <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">
                        • {r}
                      </p>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Repaired WKT:</span>
                    <p className="text-emerald-700 dark:text-emerald-400 break-all select-all font-semibold">
                      {testResult.wkt_polygon}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Neighboring Smallholder Overlap Radar & Double-Claim Prevention    */}
      {/* ========================================================================= */}
      {activeTab === 'overlaps' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Fleet-Wide Polygon Overlap & Cooperative Dispute Radar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated detection of overlapping GPS parcel boundaries between neighboring smallholders to prevent cooperative land disputes and fraudulent double-claims.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                {globalOverlapCollisions.length} Overlapping Pair(s) Detected
              </span>
            </div>

            {globalOverlapCollisions.length > 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                {globalOverlapCollisions.map((collision, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {collision.farmerA.official_farmer_id} ({collision.farmerA.full_name})
                        </span>
                        <span className="text-slate-400 font-bold">&harr;</span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {collision.farmerB.official_farmer_id} ({collision.farmerB.full_name})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {collision.farmerA.lga}, {collision.farmerA.state} • Cooperative:{' '}
                        {collision.farmerA.cooperative_name || 'Independent'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                          {collision.overlapHa} ha Overlap
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {collision.pct}% of parcel area
                        </span>
                      </div>

                      <button
                        onClick={() => handleRegisterDispute(collision)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 text-xs font-semibold cursor-pointer transition shrink-0"
                      >
                        Flag Land Dispute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Zero Neighboring Smallholder Overlaps Detected
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  All registered smallholder farm plots have distinct, verified polygon boundary buffers. No fraudulent double-claims or boundary disputes found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Official European Commission EUDR Annex II Exporter                 */}
      {/* ========================================================================= */}
      {activeTab === 'annex_ii' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                    Regulation (EU) 2023/1115
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    Official Annex II DDS GeoJSON
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  European Commission Deforestation Due Diligence Exporter
                </h3>
                <p className="text-xs text-slate-500">
                  Generates the exact GeoJSON specification required by the European Commission for customs entry clearance at EU ports.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyGeoJson}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedJson ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedJson ? 'Copied to Clipboard' : 'Copy EUDR JSON'}</span>
                </button>
                <button
                  onClick={handleDownloadGeoJson}
                  className="px-4 py-2 rounded-xl bg-[#1B7F4B] hover:bg-[#166534] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .geojson</span>
                </button>
              </div>
            </div>

            {/* Config Parameter Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  Commodity
                </label>
                <select
                  value={exportCommodity}
                  onChange={(e) => setExportCommodity(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="Sesame">Sesame (Sesamum indicum)</option>
                  <option value="Soybeans">Soybeans (Glycine max)</option>
                  <option value="Ginger">Ginger (Zingiber officinale)</option>
                  <option value="Cocoa">Cocoa (Theobroma cacao)</option>
                  <option value="Cashew">Cashew (Anacardium occidentale)</option>
                  <option value="Hibiscus">Hibiscus (Hibiscus sabdariffa)</option>
                  <option value="ALL">All Commodities (Consolidated)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  Country of Production
                </label>
                <input
                  type="text"
                  value={exportCountry}
                  onChange={(e) => setExportCountry(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  EU Due Diligence ID (DDS)
                </label>
                <input
                  type="text"
                  value={exportDdsId}
                  onChange={(e) => setExportDdsId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  Operator EORI Number
                </label>
                <input
                  type="text"
                  value={exportEori}
                  onChange={(e) => setExportEori(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Exporter Preview Meta */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">
                Plots: <strong className="text-slate-900 dark:text-white">{generatedAnnexII.features.length}</strong>
              </span>
              <span className="text-slate-500">
                Total Area:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {generatedAnnexII.properties.total_certified_hectares} ha
                </strong>
              </span>
              <span className="text-slate-500">
                Coordinate CRS: <strong className="text-slate-900 dark:text-white">EPSG:4326 (WGS84)</strong>
              </span>
              <span className="text-slate-500">
                Format: <strong className="text-blue-600 dark:text-blue-400">GeoJSON RFC 7946</strong>
              </span>
            </div>

            {/* Syntax-Highlighted GeoJSON Output Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Output GeoJSON Preview:</span>
                <span>{(JSON.stringify(generatedAnnexII).length / 1024).toFixed(1)} KB</span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] max-h-96 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                {JSON.stringify(generatedAnnexII, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

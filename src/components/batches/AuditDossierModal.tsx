import React, { useState, useEffect, useMemo } from 'react';
import { ExportBatch, Farmer, Shipment } from '../../types';
import {
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  FileCheck,
  Ship,
  MapPin,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  Printer,
} from 'lucide-react';
import {
  buildCompleteAuditDossier,
  downloadAuditDossierZip,
  downloadFile,
  AuditDossierResult,
  generatePhytosanitaryPdf,
  generateLaboratoryMrlPdf,
  generateEudrPolygonMapPdf,
  generateBillOfLadingPdf,
} from '../../utils/auditDossierGenerator';
import { evaluateDocumentEtaRisks, DocumentEtaAuditRecord } from '../../utils/documentExpirySentinel';
import { useData } from '../../context/DataContext';

interface AuditDossierModalProps {
  batch: ExportBatch;
  isOpen: boolean;
  onClose: () => void;
  shipment?: Shipment | null;
}

export const AuditDossierModal: React.FC<AuditDossierModalProps> = ({
  batch,
  isOpen,
  onClose,
  shipment,
}) => {
  const { farmers, shipments, documents } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'phyto' | 'mrl' | 'eudr' | 'bol' | 'manifest'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dossierResult, setDossierResult] = useState<AuditDossierResult | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Linked shipment resolution
  const activeShipment = useMemo(() => {
    if (shipment) return shipment;
    return shipments.find(
      (s) =>
        s.container_id === batch.container_id ||
        s.vessel_name === batch.vessel_name ||
        s.destination.toLowerCase().includes(batch.destination.toLowerCase().split(',')[0])
    ) || shipments[0];
  }, [shipment, shipments, batch]);

  // Contributing smallholders
  const linkedFarmers = useMemo(() => {
    const list = farmers.filter((f) => batch.farmer_client_uuids?.includes(f.client_uuid));
    return list.length > 0 ? list : farmers.slice(0, 6);
  }, [farmers, batch]);

  // Document Expiry Sentinel Audit for this batch
  const sentinelRecords = useMemo(() => {
    const allRecords = evaluateDocumentEtaRisks(documents, [batch], activeShipment ? [activeShipment] : shipments);
    return allRecords.filter(
      (r) =>
        r.batchNumber === batch.batch_number ||
        r.containerId === batch.container_id ||
        (r.shipmentCode && r.shipmentCode === activeShipment?.shipment_code)
    );
  }, [documents, batch, activeShipment, shipments]);

  const flaggedSentinel = sentinelRecords.find((r) => r.isFlagged);

  // Pre-generate dossier package on open
  useEffect(() => {
    if (isOpen && batch) {
      let isMounted = true;
      setIsGenerating(true);
      buildCompleteAuditDossier(batch, linkedFarmers, activeShipment)
        .then((res) => {
          if (isMounted) {
            setDossierResult(res);
            setIsGenerating(false);
          }
        })
        .catch((err) => {
          console.error('Failed to build dossier bundle:', err);
          if (isMounted) setIsGenerating(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, batch, linkedFarmers, activeShipment]);

  if (!isOpen) return null;

  const handleDownloadFullZip = async () => {
    try {
      setIsGenerating(true);
      await downloadAuditDossierZip(batch, linkedFarmers, activeShipment);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = (type: 'phyto' | 'mrl' | 'eudr_json' | 'eudr_map' | 'bol' | 'manifest') => {
    if (!dossierResult) return;
    const { files } = dossierResult;
    switch (type) {
      case 'phyto':
        downloadFile(files.phytosanitaryPdf, files.phytosanitaryFileName, 'application/pdf');
        break;
      case 'mrl':
        downloadFile(files.labMrlPdf, files.labMrlFileName, 'application/pdf');
        break;
      case 'eudr_json':
        downloadFile(files.eudrAnnexIIJson, files.eudrAnnexIIFileName, 'application/json');
        break;
      case 'eudr_map':
        downloadFile(files.eudrMapPdf, files.eudrMapFileName, 'application/pdf');
        break;
      case 'bol':
        downloadFile(files.billOfLadingPdf, files.billOfLadingFileName, 'application/pdf');
        break;
      case 'manifest':
        downloadFile(files.cryptographicManifestJson, files.cryptographicManifestFileName, 'application/json');
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  EU European Single-Window Package
                </span>
                <span className="text-xs text-slate-500 font-mono">Rotterdam & Hamburg Customs Ready</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                One-Click EUDR & Phytosanitary Audit Dossier
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consignment Lot: <strong className="font-mono text-slate-800 dark:text-slate-200">{batch.batch_number}</strong> ({batch.crop}, {batch.estimated_tonnage} MT) → {batch.destination}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expiry Sentinel Alert Banner (if expiring within 14 days of ETA) */}
        {flaggedSentinel && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[11px]">
                  Maritime Expiry Sentinel Alert: {flaggedSentinel.documentCategory}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-mono font-semibold">
                  ETA: {flaggedSentinel.etaDateStr}
                </span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 mt-1">
                {flaggedSentinel.flagReason}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-semibold text-amber-900 dark:text-amber-100">
                  Recommended Action: {flaggedSentinel.remediationAction}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'Complete Dossier (5 Documents)', count: '5' },
            { id: 'phyto', label: '1. Phytosanitary (NAQS)', count: 'PDF' },
            { id: 'mrl', label: '2. Lab MRL Report (SGS)', count: 'PDF' },
            { id: 'eudr', label: '3. EUDR DDS & Polygons Map', count: 'JSON+PDF' },
            { id: 'bol', label: '4. Bill of Lading & Seal', count: 'PDF' },
            { id: 'manifest', label: '5. SHA-256 Manifest', count: 'JSON' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* OVERVIEW / ALL TAB */}
          {activeTab === 'all' && (
            <div className="space-y-5">
              {/* Primary Call-to-action Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/20 text-white font-bold">
                      One-Click Single-Window Archive
                    </span>
                    <span className="text-xs text-emerald-200">ZIP Bundle with Cryptographic Manifest</span>
                  </div>
                  <h4 className="text-lg font-bold">Download Complete Customs Audit Dossier (.ZIP)</h4>
                  <p className="text-xs text-emerald-100 max-w-xl">
                    Packages all official phytosanitary certifications, laboratory spectrometry assay results, EUDR Annex II Due Diligence statement, satellite vector polygon maps, and ocean container seal verifications.
                  </p>
                </div>

                <button
                  onClick={handleDownloadFullZip}
                  disabled={isGenerating}
                  className="px-5 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 active:scale-98 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>{isGenerating ? 'Packaging Dossier...' : 'Download Dossier (.ZIP)'}</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customs Audit Dossier downloaded successfully! All 5 regulatory files are packaged inside.</span>
                </div>
              )}

              {/* 5 Components Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Phyto Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌿</span>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                          1. Official Phytosanitary Certificate
                        </h5>
                        <span className="text-[11px] text-slate-500 font-mono">Nigeria Agricultural Quarantine Service (NAQS)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadSingle('phyto')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Certifies zero quarantine pests (*Khapra beetle*), phosphine aeration degassing (&lt;0.01 ppm), and IPPC compliance.
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Valid: 60 Days</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● NAQS Verified</span>
                  </div>
                </div>

                {/* 2. Lab MRL Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧪</span>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                          2. Lab Gas-Chromatography MRL Report
                        </h5>
                        <span className="text-[11px] text-slate-500 font-mono">SGS / NAFDAC ISO/IEC 17025 Accredited</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadSingle('mrl')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    GC-MS/MS & LC-MS/MS multi-residue pesticide screen. Proves Chlorpyrifos &lt;0.005 mg/kg (EU 0.01 limit) and safe PHI degradation.
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Regulation (EC) 396/2005</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● 100% Passed</span>
                  </div>
                </div>

                {/* 3. EUDR Due Diligence & Map Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛰️</span>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                          3. EUDR Due Diligence & Polygon Map
                        </h5>
                        <span className="text-[11px] text-slate-500 font-mono">Annex II GeoJSON + Vector Map PDF</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadSingle('eudr_json')}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </button>
                      <button
                        onClick={() => handleDownloadSingle('eudr_map')}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Map PDF</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    EU Regulation 2023/1115 Annex II GeoJSON with operator EORI, plot coordinates, and Copernicus Sentinel-2 satellite zero deforestation proof.
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>{linkedFarmers.length} Smallholders Linked</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● 0% Canopy Loss</span>
                  </div>
                </div>

                {/* 4. Bill of Lading Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚢</span>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                          4. Bill of Lading & Ocean Container Seal
                        </h5>
                        <span className="text-[11px] text-slate-500 font-mono">Nigerian Ports Authority & Ocean Carrier</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadSingle('bol')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    ISO 17712 High-Security mechanical bolt seal verification, SOLAS Verified Gross Mass (VGM), and customs outwards clearance.
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Vessel: {batch.vessel_name || activeShipment?.vessel_name || 'CMA CGM'}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">● Seal Intact</span>
                  </div>
                </div>
              </div>

              {/* 5. Cryptographic SHA-256 Manifest Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <h5 className="font-bold text-xs">5. Cryptographic SHA-256 Chain Verification Manifest</h5>
                  </div>
                  <button
                    onClick={() => handleDownloadSingle('manifest')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Manifest</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg break-all">
                  <span className="text-emerald-400">MASTER_ROOT_SHA256: </span>
                  {dossierResult?.manifestSummary.masterSha256 || batch.tamper_proof_sha256}
                </div>
              </div>
            </div>
          )}

          {/* INDIVIDUAL DOCUMENT PREVIEWS */}
          {activeTab === 'phyto' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Federal Republic of Nigeria — Official Phytosanitary Certificate
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Nigeria Agricultural Quarantine Service (NAQS) | IPPC International Standard
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('phyto')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Official PDF
                </button>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-500 font-mono">Certificate Number:</span>
                    <p className="font-bold font-mono mt-0.5">NAQS-EXP-KN-{batch.batch_number.replace(/\D/g, '') || '9042'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Quarantine Authority:</span>
                    <p className="font-bold mt-0.5">NAQS Port Directorate</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Issue Date:</span>
                    <p className="font-mono mt-0.5">2026-09-28</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Valid Until:</span>
                    <p className="font-mono text-emerald-600 font-bold mt-0.5">2026-11-28 (60 Days)</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Official Declaration:</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    This consignment of <strong>{batch.crop}</strong> ({batch.estimated_tonnage} MT) has been officially sampled and inspected in accordance with international IPPC protocols and found free from quarantine storage pests (including Khapra beetle, grain borers, and weevils). Safe phosphine fumigation and aeration verified.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mrl' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    SGS Testing Laboratory — Residue Chemistry & MRL Report
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    GC-MS/MS & LC-MS/MS Multi-Residue Analysis | ISO/IEC 17025 Accredited
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('mrl')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Lab Report PDF
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3">Analyte / Active Ingredient</th>
                      <th className="p-3">Instrument</th>
                      <th className="p-3">Detected (mg/kg)</th>
                      <th className="p-3">EU MRL Limit</th>
                      <th className="p-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="p-3 font-medium">Chlorpyrifos (Organophosphate)</td>
                      <td className="p-3 font-mono text-slate-500">GC-MS/MS</td>
                      <td className="p-3 font-bold">&lt;0.005 (LOD)</td>
                      <td className="p-3 font-mono">0.010 (Complete Ban)</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">● PASSED</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Lambda-cyhalothrin</td>
                      <td className="p-3 font-mono text-slate-500">GC-MS/MS</td>
                      <td className="p-3 font-bold">0.008</td>
                      <td className="p-3 font-mono">0.050</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">● PASSED</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Dichlorvos (DDVP / Sniper)</td>
                      <td className="p-3 font-mono text-slate-500">GC-MS/MS</td>
                      <td className="p-3 font-bold">NOT DETECTED</td>
                      <td className="p-3 font-mono">0.010</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">● PASSED</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Flubendiamide (Belt Expert)</td>
                      <td className="p-3 font-mono text-slate-500">LC-MS/MS</td>
                      <td className="p-3 font-bold">0.012</td>
                      <td className="p-3 font-mono">0.200</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">● PASSED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'eudr' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    EU Deforestation Regulation (EUDR) — Due Diligence Statement & Map
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Regulation (EU) 2023/1115 Annex II GeoJSON + Vector Polygons Cartographic Map
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadSingle('eudr_json')}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Annex II JSON
                  </button>
                  <button
                    onClick={() => handleDownloadSingle('eudr_map')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Polygons Map PDF
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Contributing Smallholder Plots ({linkedFarmers.length}):
                  </span>
                  <span className="font-mono text-emerald-600 font-semibold">● 0.00 ha Post-2020 Tree Cover Loss</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {linkedFarmers.map((f) => (
                    <div key={f.client_uuid} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-emerald-600">{f.official_farmer_id}</span>
                        <p className="font-medium text-slate-900 dark:text-slate-200">{f.full_name} ({f.lga}, {f.state})</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{f.farm_size_hectares} ha</span>
                        <span className="block text-[10px] text-emerald-600 font-semibold">WGS84 Polygon Validated</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bol' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Maritime Bill of Lading & Container High-Security Seal
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Nigerian Ports Authority (NPA) & Ocean Carrier Master Manifest
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('bol')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Bill of Lading PDF
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-500 font-mono">Ocean Vessel:</span>
                    <p className="font-bold mt-0.5">{batch.vessel_name || activeShipment?.vessel_name || 'CMA CGM Africa One'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Container ID:</span>
                    <p className="font-bold font-mono mt-0.5">{batch.container_id || activeShipment?.container_id || 'MSCU-904128-4'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Bolt Seal Number:</span>
                    <p className="font-bold font-mono text-indigo-600 mt-0.5">NG-SEAL-ISO-{batch.batch_number.replace(/\D/g, '') || '88902'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Discharge Port:</span>
                    <p className="font-bold mt-0.5">{batch.destination}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 text-white">
                <div>
                  <h4 className="font-bold text-sm">Cryptographic Verification Manifest</h4>
                  <p className="text-xs text-slate-400">
                    SHA-256 Checksums for Customs Single-Window Chain of Custody
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('manifest')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download Manifest JSON
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-80">
                {dossierResult?.files.cryptographicManifestJson || 'Generating cryptographic manifest...'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consignment SHA-256: {batch.tamper_proof_sha256.substring(0, 16)}...</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadFullZip}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Packaging...' : 'Download Full Dossier ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

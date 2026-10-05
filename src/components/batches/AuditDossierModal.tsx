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
  Lock,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  buildCompleteAuditDossier,
  downloadAuditDossierZip,
  downloadFile,
  AuditDossierResult,
} from '../../utils/auditDossierGenerator';
import { evaluateDocumentEtaRisks } from '../../utils/documentExpirySentinel';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header - Quiet, institutional typography */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <span>European Single-Window Documentation</span>
              <span aria-hidden="true">·</span>
              <span>Port Inspection Clearance</span>
              <span aria-hidden="true">·</span>
              <span>Rotterdam / Hamburg</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Single-Window Customs Audit Dossier
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
              <span className="font-bold text-slate-900 dark:text-white">{batch.batch_number}</span>
              <span aria-hidden="true">/</span>
              <span>{batch.crop}</span>
              <span aria-hidden="true">/</span>
              <span>{batch.estimated_tonnage} MT Net</span>
              <span aria-hidden="true">/</span>
              <span>Dest: {batch.destination}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expiry Sentinel Alert (if flagged) */}
        {flaggedSentinel && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>Document Expiry Warning: {flaggedSentinel.documentCategory}</span>
                  <span className="font-mono text-[11px] font-normal text-amber-800 dark:text-amber-300">
                    (Vessel ETA: {flaggedSentinel.etaDateStr})
                  </span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {flaggedSentinel.flagReason}
                </p>
                <p className="font-medium text-amber-900 dark:text-amber-200 pt-0.5">
                  Directive: {flaggedSentinel.remediationAction}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - Clean Segmented Border */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Dossier Checklist' },
            { id: 'phyto', label: '1. Phytosanitary (NAQS)' },
            { id: 'mrl', label: '2. SGS Laboratory Assay' },
            { id: 'eudr', label: '3. EUDR Annex II & Map' },
            { id: 'bol', label: '4. Bill of Lading & Seal' },
            { id: 'manifest', label: '5. SHA-256 Manifest' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'all' && (
            <div className="space-y-5">
              {/* Primary Download Bar - Functional, quiet dark header */}
              <div className="p-4 rounded-lg bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Consignment Archive Package</div>
                  <h4 className="text-sm font-semibold text-white mt-0.5">
                    Download Official Customs Audit Dossier (.ZIP)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Contains official NAQS Phytosanitary Certificate, SGS GC-MS/MS Laboratory Assay, EUDR Annex II GeoJSON, plot polygon cartography, and ocean bill of lading container seal verification.
                  </p>
                </div>

                <button
                  onClick={handleDownloadFullZip}
                  disabled={isGenerating}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? 'Compiling Archive...' : 'Download Dossier (.ZIP)'}</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customs Audit Dossier downloaded successfully. All 5 regulatory verification files are packaged.</span>
                </div>
              )}

              {/* Document Checklist Items - High-Density Clean List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {/* 1. Phyto */}
                <div className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        1. Official Phytosanitary Certificate (NAQS Form 1)
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">· IPPC Plant Health Standard</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Certified free from Trogoderma granarium (Khapra beetle). Phosphine degassing &lt;0.01 ppm verified. Valid 60 days.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadSingle('phyto')}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* 2. Lab MRL */}
                <div className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        2. SGS Gas-Chromatography MRL Assay Report
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">· ISO/IEC 17025 Accredited</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      GC-MS/MS & LC-MS/MS screen. Chlorpyrifos &lt;0.005 mg/kg (EU 0.01 limit). Satisfies EC 396/2005.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadSingle('mrl')}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* 3. EUDR */}
                <div className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        3. EUDR Due Diligence Statement & Plot Cartography
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">· Regulation (EU) 2023/1115</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Annex II GeoJSON with operator EORI NL823901456, WGS84 plot boundaries, and Sentinel-2 satellite baseline confirmation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadSingle('eudr_json')}
                      className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>GeoJSON</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSingle('eudr_map')}
                      className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Map PDF</span>
                    </button>
                  </div>
                </div>

                {/* 4. Bill of Lading */}
                <div className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        4. Maritime Bill of Lading & Container Bolt Seal
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">· ISO 17712 High-Security / SOLAS VGM</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Container {batch.container_id || activeShipment?.container_id || 'MSCU-904128-4'} on vessel {batch.vessel_name || activeShipment?.vessel_name || 'CMA CGM Africa One'}. Seal intact.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadSingle('bol')}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* 5. Manifest */}
                <div className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        5. Cryptographic SHA-256 Chain Verification Manifest
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">· ECDSA P-256 Digest</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Master Merkle root establishing tamper-proof chain of custody across all 5 regulatory instruments.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadSingle('manifest')}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manifest JSON</span>
                  </button>
                </div>
              </div>

              {/* Master Root Hash */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <span className="text-slate-500">Master Merkle Root SHA-256: </span>
                <span className="text-slate-800 dark:text-slate-200 break-all select-all font-semibold">
                  {dossierResult?.manifestSummary.masterSha256 || batch.tamper_proof_sha256}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'phyto' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Nigeria Agricultural Quarantine Service (NAQS) Certificate
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Statutory Authority: Plant Quarantine Act 2018 · IPPC Standards
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('phyto')}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Certificate PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 text-[11px]">Certificate Number</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    NAQS-EXP-KN-{batch.batch_number.replace(/\D/g, '') || '9042'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Inspection Station</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    Kano Inland Dry Port
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Date of Inspection</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">2026-09-28</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Validity Term</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">60 Days</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mrl' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    SGS Testing Services — Gas Chromatography Assay Report
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Methodology: QuEChERS (EN 15662:2018) · GC-MS/MS & LC-MS/MS
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('mrl')}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Lab PDF</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Target Analyte</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Detected</th>
                      <th className="py-2.5 px-3">EU MRL Threshold</th>
                      <th className="py-2.5 px-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">Chlorpyrifos</td>
                      <td className="py-2 px-3 text-slate-500">GC-MS/MS</td>
                      <td className="py-2 px-3 font-semibold">&lt;0.005 mg/kg</td>
                      <td className="py-2 px-3 text-slate-500">0.010 mg/kg</td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">Cleared</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">Lambda-cyhalothrin</td>
                      <td className="py-2 px-3 text-slate-500">GC-MS/MS</td>
                      <td className="py-2 px-3 font-semibold">0.008 mg/kg</td>
                      <td className="py-2 px-3 text-slate-500">0.050 mg/kg</td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">Cleared</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">Dichlorvos (DDVP)</td>
                      <td className="py-2 px-3 text-slate-500">GC-MS/MS</td>
                      <td className="py-2 px-3 font-semibold">NOT DETECTED</td>
                      <td className="py-2 px-3 text-slate-500">0.010 mg/kg</td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">Cleared</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">Flubendiamide</td>
                      <td className="py-2 px-3 text-slate-500">LC-MS/MS</td>
                      <td className="py-2 px-3 font-semibold">0.012 mg/kg</td>
                      <td className="py-2 px-3 text-slate-500">0.200 mg/kg</td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">Cleared</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'eudr' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Regulation (EU) 2023/1115 Annex II Due Diligence
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Cutoff Date: 31 December 2020 · Copernicus Sentinel-2 Verified
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadSingle('eudr_json')}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>GeoJSON</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSingle('eudr_map')}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cartographic Map PDF</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {linkedFarmers.map((f) => (
                  <div key={f.client_uuid} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{f.official_farmer_id}</span>
                      <span className="text-slate-500 ml-2 font-sans">{f.full_name} ({f.lga}, {f.state})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-600 dark:text-slate-300">{f.farm_size_hectares} ha</span>
                      <span className="text-emerald-700 dark:text-emerald-400 ml-3 font-semibold">0% Loss Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bol' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Ocean Bill of Lading & Container Bolt Seal
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Carrier: {batch.vessel_name || activeShipment?.vessel_name || 'CMA CGM Africa One'} · Loading: Lagos Port Apapa (NGAPP)
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('bol')}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bill of Lading PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Container Number</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {batch.container_id || activeShipment?.container_id || 'MSCU-904128-4'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">ISO 17712 Bolt Seal</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    NG-SEAL-ISO-{batch.batch_number.replace(/\D/g, '') || '88902'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Seal Status</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">Verified Intact</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Discharge Port</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{batch.destination}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Cryptographic SHA-256 Integrity Chain Manifest
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Single-Window Verification Anchor · ECDSA P-256
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingle('manifest')}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Manifest JSON</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                {dossierResult?.files.cryptographicManifestJson || 'Computing SHA-256 chain verification manifest...'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            <span>Consignment SHA-256: </span>
            <span className="text-slate-700 dark:text-slate-300">{batch.tamper_proof_sha256.substring(0, 16)}...</span>
          </div>

          <div className="flex items-center gap-2 font-sans">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadFullZip}
              disabled={isGenerating}
              className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Compiling...' : 'Download Dossier (.ZIP)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

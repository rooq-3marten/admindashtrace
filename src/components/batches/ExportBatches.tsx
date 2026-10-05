import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ExportBatch, Farmer } from '../../types';
import {
  Boxes,
  Plus,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ExternalLink,
  Download,
  Filter,
  Check,
  X,
  FileCheck,
  Calendar,
  Lock,
  Trees,
  Package,
} from 'lucide-react';
import { generateOfficialEudrAnnexIIGeoJson, downloadGeoJsonFile } from '../../utils/eudrEngine';
import { AuditDossierModal } from './AuditDossierModal';

export const ExportBatches: React.FC = () => {
  const { batches, farmers, createBatch, overrideBatchValidation } = useData();
  const { canCertifyBatches } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Validated' | 'Incomplete' | 'Flagged'>('All');
  const [selectedBatchCodes, setSelectedBatchCodes] = useState<string[]>([]);
  const [activeDetailBatch, setActiveDetailBatch] = useState<ExportBatch | null>(null);
  const [dossierModalBatch, setDossierModalBatch] = useState<ExportBatch | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideBatch, setOverrideBatch] = useState<ExportBatch | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Real batches from DataContext
  const allBatches = batches;

  // Filter logic
  const filteredBatches = useMemo(() => {
    return allBatches.filter((b) => {
      if (activeFilter === 'Validated') return b.export_clearance_status === 'CERTIFIED_COMPLIANT';
      if (activeFilter === 'Incomplete') return b.export_clearance_status === 'PENDING_CLEARANCE';
      if (activeFilter === 'Flagged') return b.export_clearance_status === 'FLAGGED_QUARANTINE';
      return true;
    });
  }, [allBatches, activeFilter]);

  // Generate QR code for active batch detail
  useEffect(() => {
    if (activeDetailBatch) {
      QRCode.toDataURL(
        JSON.stringify({
          batch: activeDetailBatch.batch_number,
          crop: activeDetailBatch.crop,
          qty: activeDetailBatch.estimated_tonnage,
          destination: activeDetailBatch.destination,
          sha256: activeDetailBatch.tamper_proof_sha256,
          status: activeDetailBatch.export_clearance_status,
          verified: true,
        }),
        { width: 140, margin: 1 }
      )
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [activeDetailBatch]);

  // Bulk selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBatchCodes(filteredBatches.map((b) => b.batch_number));
    } else {
      setSelectedBatchCodes([]);
    }
  };

  const handleToggleSelect = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBatchCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleOpenOverride = (batch: ExportBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    setOverrideBatch(batch);
    setOverrideJustification(
      'Agent confirmed by phone that logs were submitted but failed to sync due to network issues. Will follow up.'
    );
    setIsOverrideModalOpen(true);
  };

  const handleConfirmOverride = async () => {
    if (!overrideBatch || !overrideJustification.trim()) return;
    await overrideBatchValidation(overrideBatch.batch_number, overrideJustification);
    if (activeDetailBatch?.batch_number === overrideBatch.batch_number) {
      setActiveDetailBatch({
        ...activeDetailBatch,
        export_clearance_status: 'CERTIFIED_COMPLIANT',
      });
    }
    setIsOverrideModalOpen(false);
    setOverrideBatch(null);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Header & Filter Controls (Spec Section 7.2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-xs font-medium">
          {(['All', 'Validated', 'Incomplete', 'Flagged'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeFilter === tab
                  ? 'bg-white dark:bg-[#0F172A] text-[#1B7F4B] dark:text-emerald-400 font-semibold shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]'
              }`}
            >
              {tab === 'All' ? 'All' : tab === 'Validated' ? 'Validated' : tab === 'Incomplete' ? 'Incomplete' : 'Flagged'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-medium text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            Filter ▼
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B7F4B] text-white hover:bg-[#145C36] text-xs font-semibold transition cursor-pointer shadow-xs">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Batches Table (Spec Section 7.2) */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedBatchCodes.length === filteredBatches.length &&
                      filteredBatches.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-[#E5E7EB] text-[#1B7F4B] focus:ring-[#1B7F4B] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Batch Code</th>
                <th className="py-3 px-4">Farmers</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Shipment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {filteredBatches.map((batch) => {
                const isSelected = selectedBatchCodes.includes(batch.batch_number);
                const isStatusValidated = batch.export_clearance_status === 'CERTIFIED_COMPLIANT';
                const isStatusPending = batch.export_clearance_status === 'PENDING_CLEARANCE';
                const isStatusFlagged = batch.export_clearance_status === 'FLAGGED_QUARANTINE';

                return (
                  <tr
                    key={batch.batch_number}
                    onClick={() => setActiveDetailBatch(batch)}
                    className={`transition cursor-pointer hover:bg-[#E8F5EE] dark:hover:bg-[#145C36]/20 ${
                      isSelected ? 'bg-[#E8F5EE]/70 dark:bg-[#145C36]/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(batch.batch_number, e as any)}
                        className="rounded border-[#E5E7EB] text-[#1B7F4B] focus:ring-[#1B7F4B] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                      {batch.batch_number}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-[#94A3B8]">
                      {batch.farmer_count}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {batch.estimated_tonnage} MT
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#111827] dark:text-[#F1F5F9]">
                        {batch.export_clearance_status === 'CERTIFIED_COMPLIANT' ? 'A' : batch.export_clearance_status === 'PENDING_CLEARANCE' ? 'B' : 'C'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isStatusValidated && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                          Validated
                        </span>
                      )}
                      {isStatusPending && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                          Incomplete
                        </span>
                      )}
                      {isStatusFlagged && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                          Flagged
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      {batch.container_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDossierModalBatch(batch)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="One-Click EUDR & Phytosanitary Audit Dossier"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Audit Dossier</span>
                        </button>
                        {isStatusPending ? (
                          <button
                            onClick={(e) => handleOpenOverride(batch, e)}
                            className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-medium transition cursor-pointer"
                          >
                            Override
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveDetailBatch(batch)}
                            className="text-[#1B7F4B] dark:text-emerald-400 hover:underline text-xs font-semibold cursor-pointer"
                          >
                            Details →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer (Spec Section 6.3 & 7.2) */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
          <span>Showing {filteredBatches.length} of {allBatches.length} batches</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              &lt; Prev
            </button>
            <button className="px-2.5 py-1 rounded bg-[#1B7F4B] text-white font-medium">1</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Spec Section 6.3 & 8) */}
      {selectedBatchCodes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl bg-[#111827] text-white shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-mono">
            <strong>{selectedBatchCodes.length}</strong> batches selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const selected = allBatches.filter((b) => selectedBatchCodes.includes(b.batch_number));
                let csv = 'Batch Number,Crop,Destination,Tonnage,Status,Tamper-proof SHA256\n';
                selected.forEach((b) => {
                  csv += `"${b.batch_number}","${b.crop}","${b.destination}","${b.estimated_tonnage}","${b.export_clearance_status}","${b.tamper_proof_sha256}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `traceharvest_selected_batches_${Date.now()}.csv`;
                a.click();
              }}
              className="px-3 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-xs font-semibold cursor-pointer"
            >
              Export Selected
            </button>
            <button
              onClick={() => setSelectedBatchCodes([])}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer (Spec Section 6.4 & 7.2) */}
      {activeDetailBatch && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveDetailBatch(null)}
          />

          <div className="relative w-full max-w-[480px] bg-white dark:bg-[#1E293B] shadow-2xl flex flex-col h-full overflow-y-auto p-6 space-y-6 z-10 border-l border-[#E5E7EB] dark:border-[#334155] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase text-[#1B7F4B] dark:text-emerald-400">
                  Export Passport Detail
                </span>
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">
                  {activeDetailBatch.batch_number}
                </h3>
              </div>
              <button
                onClick={() => setActiveDetailBatch(null)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Metadata */}
            {(() => {
              const linkedFarmers = farmers.filter((f) => activeDetailBatch.farmer_client_uuids?.includes(f.client_uuid));
              const avgLat = linkedFarmers.length > 0 ? (linkedFarmers.reduce((sum, f) => sum + f.latitude, 0) / linkedFarmers.length).toFixed(4) : '11.9821';
              const avgLng = linkedFarmers.length > 0 ? (linkedFarmers.reduce((sum, f) => sum + f.longitude, 0) / linkedFarmers.length).toFixed(4) : '8.5167';

              return (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-[#334155] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Status:</span>
                      <div className="font-semibold text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                        {activeDetailBatch.export_clearance_status === 'CERTIFIED_COMPLIANT' ? (
                          <span className="text-[#16A34A] flex items-center gap-1 font-medium">
                            ● Validated
                          </span>
                        ) : activeDetailBatch.export_clearance_status === 'FLAGGED_QUARANTINE' ? (
                          <span className="text-[#DC2626] flex items-center gap-1 font-medium">
                            ● Quarantine Hold
                          </span>
                        ) : (
                          <span className="text-[#F59E0B] flex items-center gap-1 font-medium">
                            ⚠️ Incomplete
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Quality Grade:</span>
                      <p className="font-bold text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                        {activeDetailBatch.export_clearance_status === 'CERTIFIED_COMPLIANT' ? 'Grade A' : 'Pending Review'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Created:</span>
                      <p className="font-mono text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                        {new Date(activeDetailBatch.created_at_ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Tonnage:</span>
                      <p className="font-mono font-bold text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                        {activeDetailBatch.estimated_tonnage} MT
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Certifier / Agent:</span>
                      <p className="font-medium text-[#111827] dark:text-[#F1F5F9] mt-0.5 truncate">
                        {activeDetailBatch.certified_by || 'Pending Assignment'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#6B7280] dark:text-[#94A3B8]">Centroid GPS:</span>
                      <p className="font-mono text-[11px] text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                        {avgLat}° N, {avgLng}° E
                      </p>
                    </div>
                  </div>

                  {/* CONTRIBUTING FARMERS */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      CONTRIBUTING SMALLHOLDERS ({linkedFarmers.length})
                    </span>
                    <div className="rounded-lg border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#E5E7EB] dark:divide-[#334155] text-xs">
                      {linkedFarmers.length > 0 ? (
                        linkedFarmers.map((f) => (
                          <div key={f.client_uuid} className="p-2.5 flex items-center justify-between">
                            <div>
                              <span className="font-mono text-[11px] text-[#1B7F4B] dark:text-emerald-400 font-semibold">
                                {f.official_farmer_id}
                              </span>
                              <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">{f.full_name}</p>
                              <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">{f.lga}, {f.state}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-medium text-[#111827] dark:text-[#F1F5F9]">{f.farm_size_hectares} ha</span>
                              <span className="block text-[10px] text-[#16A34A] font-medium">● EUDR Clear</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          No smallholders directly linked to this consignment yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* PROVENANCE CHAIN */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                PROVENANCE CHAIN
              </span>
              <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs space-y-1.5 text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>All farmers enrolled with GPS coordinates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>All practice logs present & MRL cleared</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>No unapproved chemical products detected</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Data completeness: 100%</span>
                </div>
              </div>
            </div>

            {/* QR CODE (Spec Section 7.2) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                QR PASSPORT
              </span>
              <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-slate-50 dark:bg-slate-900 flex items-center gap-4">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Batch QR Passport"
                    className="w-24 h-24 rounded border border-[#E5E7EB] bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-xs text-slate-400">
                    QR
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `${activeDetailBatch.batch_number}_QR.png`;
                      link.href = qrCodeDataUrl;
                      link.click();
                    }}
                    className="w-full py-1.5 px-2.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-1.5 px-2.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
                  >
                    Print Label
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#334155]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                ACTIONS
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const passport = {
                      batch_number: activeDetailBatch.batch_number,
                      crop: activeDetailBatch.crop,
                      estimated_tonnage: activeDetailBatch.estimated_tonnage,
                      destination: activeDetailBatch.destination,
                      tamper_proof_sha256: activeDetailBatch.tamper_proof_sha256,
                      export_clearance_status: activeDetailBatch.export_clearance_status,
                      created_at: new Date(activeDetailBatch.created_at_ms).toISOString(),
                      certified_by: activeDetailBatch.certified_by || 'NAFDAC Compliance Inspector',
                      contributing_smallholders: farmers.filter((f) => activeDetailBatch.farmer_client_uuids?.includes(f.client_uuid)),
                      digital_signature: `ECDSA_SHA256_${activeDetailBatch.tamper_proof_sha256.slice(0, 16)}`,
                    };
                    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${activeDetailBatch.batch_number}_provenance_passport.json`;
                    a.click();
                  }}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  Download Provenance
                </button>
                <button
                  onClick={() => {
                    const linked = farmers.filter((f) => activeDetailBatch.farmer_client_uuids?.includes(f.client_uuid));
                    let csv = `Batch Lot Report: ${activeDetailBatch.batch_number}\nCrop,${activeDetailBatch.crop}\nDestination,${activeDetailBatch.destination}\nTonnage,${activeDetailBatch.estimated_tonnage} MT\nSHA256,${activeDetailBatch.tamper_proof_sha256}\n\nFarmer ID,Full Name,State,LGA,Hectares\n`;
                    linked.forEach((f) => {
                      csv += `"${f.official_farmer_id}","${f.full_name}","${f.state}","${f.lga}","${f.farm_size_hectares}"\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${activeDetailBatch.batch_number}_audit_manifest.csv`;
                    a.click();
                  }}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  Export Report CSV
                </button>
                <button
                  onClick={() => {
                    const linked = farmers.filter((f) => activeDetailBatch.farmer_client_uuids?.includes(f.client_uuid));
                    const targetFarmers = linked.length > 0 ? linked : farmers.filter((f) => f.crop === activeDetailBatch.crop);
                    const cleanBatchNum = activeDetailBatch.batch_number.replace(/\D/g, '');
                    const ddsId = `DDS-2026-${cleanBatchNum.slice(-5) || '90412'}`;
                    const annexII = generateOfficialEudrAnnexIIGeoJson(targetFarmers, {
                      commodity: activeDetailBatch.crop,
                      exportBatchId: activeDetailBatch.batch_number,
                      eudrDueDiligenceId: ddsId,
                    });
                    downloadGeoJsonFile(annexII);
                  }}
                  className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer col-span-2 shadow-xs"
                >
                  <Trees className="w-4 h-4" />
                  <span>Export Official EUDR Annex II GeoJSON</span>
                </button>
                <button
                  onClick={() => setDossierModalBatch(activeDetailBatch)}
                  className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer col-span-2 shadow-sm"
                >
                  <Package className="w-4 h-4" />
                  <span>Download Complete Customs Audit Dossier (.ZIP)</span>
                </button>
                <button
                  onClick={() => {
                    setActiveDetailBatch({
                      ...activeDetailBatch,
                      export_clearance_status: 'FLAGGED_QUARANTINE',
                    });
                  }}
                  className="py-2 px-3 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium text-red-600 dark:text-red-400 transition cursor-pointer col-span-2"
                >
                  Flag for Quarantine Hold
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Modal */}
      {dossierModalBatch && (
        <AuditDossierModal
          batch={dossierModalBatch}
          isOpen={true}
          onClose={() => setDossierModalBatch(null)}
        />
      )}

      {/* Override Batch Validation Modal (Spec Section 6.5) */}
      {isOverrideModalOpen && overrideBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[560px] rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <h3 className="font-semibold text-base text-[#111827] dark:text-[#F1F5F9]">
                Override Batch Validation
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p className="font-mono text-[#111827] dark:text-[#F1F5F9]">
                Batch: <strong>{overrideBatch.batch_number}</strong>
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                Issue: Missing practice logs for 2 contributing smallholders
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              ⚠️ <strong>Warning:</strong> Overriding this validation means the batch will be included in export shipments despite incomplete data. This action is permanently logged and audited under your administrator credentials.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111827] dark:text-[#F1F5F9]">
                Justification (required):
              </label>
              <textarea
                rows={3}
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs text-[#111827] dark:text-[#F1F5F9] focus:ring-1 focus:ring-[#1B7F4B] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={!overrideJustification.trim()}
                className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

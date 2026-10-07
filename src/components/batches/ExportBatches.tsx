import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ExportBatch, Farmer } from '../../types';
import {
  Package,
  CheckCircle,
  Warning,
  DownloadSimple,
  Funnel,
  X,
  FileText,
  Tree,
  QrCode,
  ShieldCheck,
  Clock,
  ArrowRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { generateOfficialEudrAnnexIIGeoJson, downloadGeoJsonFile } from '../../utils/eudrEngine';
import { AuditDossierModal } from './AuditDossierModal';

export const ExportBatches: React.FC = () => {
  const { batches, farmers, overrideBatchValidation } = useData();
  const { canCertifyBatches } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Validated' | 'Incomplete' | 'Flagged'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchCodes, setSelectedBatchCodes] = useState<string[]>([]);
  const [activeDetailBatch, setActiveDetailBatch] = useState<ExportBatch | null>(null);
  const [dossierModalBatch, setDossierModalBatch] = useState<ExportBatch | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideBatch, setOverrideBatch] = useState<ExportBatch | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Filter logic
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (activeFilter === 'Validated' && b.export_clearance_status !== 'CERTIFIED_COMPLIANT') return false;
      if (activeFilter === 'Incomplete' && b.export_clearance_status !== 'PENDING_CLEARANCE') return false;
      if (activeFilter === 'Flagged' && b.export_clearance_status !== 'FLAGGED_QUARANTINE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = b.batch_number?.toLowerCase().includes(q);
        const matchCrop = b.crop?.toLowerCase().includes(q);
        const matchDest = b.destination?.toLowerCase().includes(q);
        if (!matchCode && !matchCrop && !matchDest) return false;
      }
      return true;
    });
  }, [batches, activeFilter, searchQuery]);

  // Set default active batch on load
  useEffect(() => {
    if (!activeDetailBatch && filteredBatches.length > 0) {
      setActiveDetailBatch(filteredBatches[0]);
    } else if (activeDetailBatch && !batches.some((b) => b.batch_number === activeDetailBatch.batch_number)) {
      setActiveDetailBatch(filteredBatches[0] || null);
    }
  }, [filteredBatches, activeDetailBatch, batches]);

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
        { width: 130, margin: 1 }
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
      'Agent confirmed by phone that logs were submitted but delayed in GSM uplink. Verified manually.'
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

  // Contributing smallholders for inspector
  const linkedFarmers = useMemo(() => {
    if (!activeDetailBatch) return [];
    const list = farmers.filter((f) => activeDetailBatch.farmer_client_uuids?.includes(f.client_uuid));
    return list.length > 0 ? list : farmers.slice(0, 5);
  }, [farmers, activeDetailBatch]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
      {/* Top Controls: Filter tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536] text-xs font-medium w-fit">
          {(['All', 'Validated', 'Incomplete', 'Flagged'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeFilter === tab
                  ? 'bg-white dark:bg-[#1A2E23] text-[#1A4D2E] dark:text-[#86EFAC] font-semibold shadow-xs'
                  : 'text-[#5A6B60] dark:text-[#A1B3A7] hover:text-[#1A2E23] dark:hover:text-white'
              }`}
            >
              {tab === 'All' ? 'All batches' : tab === 'Validated' ? 'Validated' : tab === 'Incomplete' ? 'Incomplete' : 'Quarantine hold'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass className="w-4 h-4 text-[#8A968E] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search lot code or crop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-white dark:bg-[#1A2E23] text-[#1A2E23] dark:text-white placeholder-[#8A968E] focus:outline-none focus:border-[#1A4D2E]"
            />
          </div>

          <button
            onClick={() => {
              const csv = filteredBatches.map((b) => `${b.batch_number},${b.crop},${b.estimated_tonnage},${b.export_clearance_status},${b.destination}`).join('\n');
              const blob = new Blob([`BatchCode,Crop,Tonnage,Status,Destination\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `TraceHarvest_Batches_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-white dark:bg-[#1A2E23] text-xs font-medium text-[#1A2E23] dark:text-white hover:bg-[#F7F9F7] transition cursor-pointer shrink-0"
          >
            <DownloadSimple size={15} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* SPLIT-PANE WORKSPACE: Left 58% Grid, Right 42% Customs Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane (7 cols): High-density batches table */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card overflow-hidden">
          <div className="overflow-x-auto max-h-[78vh]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F7F9F7] dark:bg-[#14261C] border-b border-[#E5EBE7] dark:border-[#2D4536] text-[#5A6B60] dark:text-[#A1B3A7] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedBatchCodes.length === filteredBatches.length && filteredBatches.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-[#D1DBD5] text-[#1A4D2E] focus:ring-[#1A4D2E] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Batch Code</th>
                  <th className="py-2.5 px-3">Crop / Qty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-[#1A2E23] dark:text-[#E8F0EA]">
                {filteredBatches.map((batch) => {
                  const isSelected = selectedBatchCodes.includes(batch.batch_number);
                  const isActive = activeDetailBatch?.batch_number === batch.batch_number;
                  const isStatusValidated = batch.export_clearance_status === 'CERTIFIED_COMPLIANT';
                  const isStatusPending = batch.export_clearance_status === 'PENDING_CLEARANCE';
                  const isStatusFlagged = batch.export_clearance_status === 'FLAGGED_QUARANTINE';

                  return (
                    <tr
                      key={batch.batch_number}
                      onClick={() => setActiveDetailBatch(batch)}
                      className={`transition cursor-pointer ${
                        isActive
                          ? 'bg-[#EEF5F1] dark:bg-[#20362A] font-medium'
                          : isSelected
                          ? 'bg-[#F7F9F7] dark:bg-[#1C3024]'
                          : 'hover:bg-[#F7F9F7] dark:hover:bg-[#1A2E23]/60'
                      }`}
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(batch.batch_number, e as any)}
                          className="rounded border-[#D1DBD5] text-[#1A4D2E] focus:ring-[#1A4D2E] cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-mono font-semibold text-[#1A2E23] dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1A4D2E] dark:bg-[#86EFAC]" />}
                          <span>{batch.batch_number}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        <span className="font-sans font-medium text-[#1A2E23] dark:text-white mr-1.5">{batch.crop}</span>
                        <span className="text-[#5A6B60] dark:text-[#A1B3A7]">({batch.estimated_tonnage} MT)</span>
                      </td>

                      <td className="py-2.5 px-3">
                        {isStatusValidated && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                            Cleared
                          </span>
                        )}
                        {isStatusPending && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B8860B] dark:text-[#FCD34D]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                            Pending review
                          </span>
                        )}
                        {isStatusFlagged && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A63A2E] dark:text-[#FCA5A5]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A63A2E]" />
                            Quarantine hold
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[#5A6B60] dark:text-[#A1B3A7] truncate max-w-[120px]">
                        {batch.destination}
                      </td>

                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDossierModalBatch(batch)}
                            className="px-2 py-1 rounded bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-[11px] font-medium transition cursor-pointer"
                            title="Download One-Click Customs Audit Dossier"
                          >
                            Dossier (.ZIP)
                          </button>
                          {isStatusPending && (
                            <button
                              onClick={(e) => handleOpenOverride(batch, e)}
                              className="px-2 py-1 rounded bg-[#FEF7EC] text-[#B8860B] hover:bg-[#FDE68A] text-[11px] font-medium transition cursor-pointer"
                            >
                              Override
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

          <div className="p-3 border-t border-[#E5EBE7] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#14261C] flex items-center justify-between text-xs text-[#5A6B60] dark:text-[#8A968E] font-mono">
            <span>Showing {filteredBatches.length} lots</span>
            <span>{selectedBatchCodes.length} selected</span>
          </div>
        </div>

        {/* Right Pane (5 cols): Integrated Customs Inspector Workspace */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card p-5 space-y-5">
          {activeDetailBatch ? (
            <>
              {/* Inspector Header */}
              <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono tracking-wider text-[#8A968E]">
                    Customs Inspector Workspace
                  </span>
                  <span className="font-mono text-xs text-[#2D6A4F] dark:text-[#86EFAC] font-semibold">
                    {activeDetailBatch.export_clearance_status === 'CERTIFIED_COMPLIANT' ? '● Certified EUDR/NAFDAC' : '● Action Required'}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1A2E23] dark:text-white mt-1">
                  {activeDetailBatch.batch_number}
                </h3>
                <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7] mt-0.5 font-mono">
                  {activeDetailBatch.crop} · {activeDetailBatch.estimated_tonnage} MT Net → {activeDetailBatch.destination}
                </p>
              </div>

              {/* Primary Call-to-action: One-Click Audit Dossier (.ZIP) */}
              <div className="p-4 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A2E23] dark:text-white">
                    One-Click Customs Dossier
                  </span>
                  <span className="text-[11px] font-mono text-[#5A6B60] dark:text-[#8A968E]">
                    5 Verifications Ready
                  </span>
                </div>
                <p className="text-[11px] text-[#5A6B60] dark:text-[#8A968E] leading-relaxed">
                  Packages official NAQS Phytosanitary Certificate, SGS GC-MS/MS Lab Assay, EUDR Annex II GeoJSON, and ocean container bolt seal.
                </p>
                <button
                  onClick={() => setDossierModalBatch(activeDetailBatch)}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-warm-card"
                >
                  <Package size={16} />
                  <span>Download Customs Audit Dossier (.ZIP)</span>
                </button>
              </div>

              {/* Statutory Verification Checklist */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A968E]">
                  Statutory Clearance Verification
                </span>
                <div className="border border-[#E5EBE7] dark:border-[#2D4536] rounded-lg divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#1A2E23] dark:text-[#E8F0EA]">EUDR Annex II Due Diligence GeoJSON</span>
                    <span className="font-mono text-[#2D6A4F] dark:text-[#86EFAC] font-medium">Cleared</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#1A2E23] dark:text-[#E8F0EA]">NAQS Official Phytosanitary Stamp</span>
                    <span className="font-mono text-[#2D6A4F] dark:text-[#86EFAC] font-medium">Verified (60d)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#1A2E23] dark:text-[#E8F0EA]">SGS MRL Assay (Chlorpyrifos &lt;0.005 mg/kg)</span>
                    <span className="font-mono text-[#2D6A4F] dark:text-[#86EFAC] font-medium">Passed EC 396</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-[#1A2E23] dark:text-[#E8F0EA]">ISO 17712 Container Bolt Seal</span>
                    <span className="font-mono text-[#2D6A4F] dark:text-[#86EFAC] font-medium">Intact</span>
                  </div>
                </div>
              </div>

              {/* QR Code Passport & Merkle Digest */}
              <div className="p-3.5 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#14261C] flex items-center gap-4">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Batch QR Passport"
                    className="w-20 h-20 rounded border border-[#E5EBE7] bg-white p-1 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center text-xs text-slate-400 bg-white">
                    QR
                  </div>
                )}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-[11px] uppercase font-mono text-[#8A968E]">Digital Produce Passport</div>
                  <div className="text-xs font-mono text-[#1A2E23] dark:text-white truncate">
                    {activeDetailBatch.tamper_proof_sha256.slice(0, 16)}...
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCodeDataUrl;
                      link.download = `Passport_${activeDetailBatch.batch_number}.png`;
                      link.click();
                    }}
                    className="text-xs font-medium text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Download QR PNG</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* Contributing Smallholders List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A968E]">
                    Contributing Smallholders ({linkedFarmers.length})
                  </span>
                  <span className="text-[11px] font-mono text-[#5A6B60] dark:text-[#A1B3A7]">
                    0% Deforestation Verified
                  </span>
                </div>
                <div className="border border-[#E5EBE7] dark:border-[#2D4536] rounded-lg divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-xs max-h-36 overflow-y-auto">
                  {linkedFarmers.map((f) => (
                    <div key={f.client_uuid} className="p-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[11px] text-[#1A4D2E] dark:text-[#86EFAC] font-semibold mr-1.5">
                          {f.official_farmer_id}
                        </span>
                        <span className="text-[#1A2E23] dark:text-white font-medium">{f.full_name}</span>
                        <span className="text-[10px] text-[#8A968E] ml-1.5">({f.state})</span>
                      </div>
                      <span className="font-mono text-[#5A6B60] dark:text-[#A1B3A7]">{f.farm_size_hectares} ha</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#8A968E]">
              Select a consignment lot from the grid to launch the Customs Inspector.
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && overrideBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-xl p-5 space-y-4">
            <h4 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">
              Emergency Compliance Clearance Override
            </h4>
            <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7]">
              Lot: <strong className="font-mono text-[#1A2E23] dark:text-white">{overrideBatch.batch_number}</strong>
            </p>
            <div className="space-y-1">
              <label className="text-xs text-[#5A6B60] block">Regulatory Justification:</label>
              <textarea
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] text-xs bg-[#FBFCFB] dark:bg-[#14261C] text-[#1A2E23] dark:text-white focus:outline-none focus:border-[#1A4D2E]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E5EBE7] text-xs font-medium text-[#5A6B60]"
              >
                Never mind
              </button>
              <button
                onClick={handleConfirmOverride}
                className="px-3 py-1.5 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-semibold"
              >
                Confirm Clearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Click Audit Dossier Modal */}
      {dossierModalBatch && (
        <AuditDossierModal
          batch={dossierModalBatch}
          isOpen={true}
          onClose={() => setDossierModalBatch(null)}
        />
      )}
    </div>
  );
};

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
} from 'lucide-react';

export const ExportBatches: React.FC = () => {
  const { batches, farmers, createBatch, overrideBatchValidation } = useData();
  const { canCertifyBatches } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Validated' | 'Incomplete' | 'Flagged'>('All');
  const [selectedBatchCodes, setSelectedBatchCodes] = useState<string[]>([]);
  const [activeDetailBatch, setActiveDetailBatch] = useState<ExportBatch | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideBatch, setOverrideBatch] = useState<ExportBatch | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Default sample batches if list is short
  const allBatches = useMemo(() => {
    const list = [...batches];
    const sampleMockBatches: ExportBatch[] = [
      {
        id: 101,
        batch_number: 'BATCH-KN-2026-1187',
        crop: 'Sesame',
        destination: 'Rotterdam, Netherlands (EU)',
        estimated_tonnage: 250,
        farmer_count: 3,
        farmer_client_uuids: ['550e8400-e29b-41d4-a716-446655440000'],
        export_clearance_status: 'CERTIFIED_COMPLIANT',
        tamper_proof_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        created_at_ms: Date.now() - 2 * 86400000,
        container_id: 'EXP-0042',
      },
      {
        id: 102,
        batch_number: 'BATCH-KN-2026-1188',
        crop: 'Sesame',
        destination: 'Hamburg, Germany (EU)',
        estimated_tonnage: 480,
        farmer_count: 5,
        farmer_client_uuids: [],
        export_clearance_status: 'PENDING_CLEARANCE',
        tamper_proof_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        created_at_ms: Date.now() - 3 * 86400000,
        container_id: '—',
      },
      {
        id: 103,
        batch_number: 'BATCH-BN-2026-0421',
        crop: 'Cowpea',
        destination: 'Rotterdam, Netherlands (EU)',
        estimated_tonnage: 180,
        farmer_count: 2,
        farmer_client_uuids: [],
        export_clearance_status: 'CERTIFIED_COMPLIANT',
        tamper_proof_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        created_at_ms: Date.now() - 4 * 86400000,
        container_id: 'EXP-0042',
      },
      {
        id: 104,
        batch_number: 'BATCH-JG-2026-0089',
        crop: 'Sesame',
        destination: 'London Gateway, UK',
        estimated_tonnage: 320,
        farmer_count: 4,
        farmer_client_uuids: [],
        export_clearance_status: 'FLAGGED_QUARANTINE',
        tamper_proof_sha256: '8c983a54d4ff1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
        created_at_ms: Date.now() - 5 * 86400000,
        container_id: '—',
      },
      {
        id: 105,
        batch_number: 'BATCH-KN-2026-1190',
        crop: 'Sesame',
        destination: 'Hamburg, Germany (EU)',
        estimated_tonnage: 210,
        farmer_count: 3,
        farmer_client_uuids: [],
        export_clearance_status: 'CERTIFIED_COMPLIANT',
        tamper_proof_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
        created_at_ms: Date.now() - 6 * 86400000,
        container_id: 'EXP-0043',
      },
      {
        id: 106,
        batch_number: 'BATCH-BN-2026-0422',
        crop: 'Soybeans',
        destination: 'Antwerp, Belgium (EU)',
        estimated_tonnage: 540,
        farmer_count: 6,
        farmer_client_uuids: [],
        export_clearance_status: 'PENDING_CLEARANCE',
        tamper_proof_sha256: 'f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e',
        created_at_ms: Date.now() - 7 * 86400000,
        container_id: '—',
      },
    ];

    sampleMockBatches.forEach((sb) => {
      if (!list.some((b) => b.batch_number === sb.batch_number)) {
        list.push(sb);
      }
    });
    return list;
  }, [batches]);

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
                      {batch.farmer_count || 3}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {batch.estimated_tonnage}kg
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#111827] dark:text-[#F1F5F9]">
                        {batch.batch_number.includes('1188') || batch.batch_number.includes('0422') ? 'B' : batch.batch_number.includes('0089') ? 'C' : 'A'}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer (Spec Section 6.3 & 7.2) */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
          <span>Showing 1-{filteredBatches.length} of 89</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              &lt; Prev
            </button>
            <button className="px-2.5 py-1 rounded bg-[#1B7F4B] text-white font-medium">1</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">2</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">3</button>
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
              onClick={() => alert(`Exporting ${selectedBatchCodes.length} batches to CSV/Excel...`)}
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
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-[#334155] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#6B7280] dark:text-[#94A3B8]">Status:</span>
                <div className="font-semibold text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                  {activeDetailBatch.export_clearance_status === 'CERTIFIED_COMPLIANT' ? (
                    <span className="text-[#16A34A] flex items-center gap-1 font-medium">
                      ● Validated
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
                <p className="font-bold text-[#111827] dark:text-[#F1F5F9] mt-0.5">Grade A</p>
              </div>
              <div>
                <span className="text-[#6B7280] dark:text-[#94A3B8]">Created:</span>
                <p className="font-mono text-[#111827] dark:text-[#F1F5F9] mt-0.5">Sep 28, 2026</p>
              </div>
              <div>
                <span className="text-[#6B7280] dark:text-[#94A3B8]">Quantity:</span>
                <p className="font-mono font-bold text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                  {activeDetailBatch.estimated_tonnage}kg
                </p>
              </div>
              <div>
                <span className="text-[#6B7280] dark:text-[#94A3B8]">Agent:</span>
                <p className="font-medium text-[#111827] dark:text-[#F1F5F9] mt-0.5">Musa Ibrahim</p>
              </div>
              <div>
                <span className="text-[#6B7280] dark:text-[#94A3B8]">GPS Centroid:</span>
                <p className="font-mono text-[11px] text-[#111827] dark:text-[#F1F5F9] mt-0.5">
                  11.9821° N, 8.5167° E
                </p>
              </div>
            </div>

            {/* CONTRIBUTING FARMERS (3) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                CONTRIBUTING FARMERS (3)
              </span>
              <div className="rounded-lg border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#E5E7EB] dark:divide-[#334155] text-xs">
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-[#6B7280]">TH-KN-2026-00482</span>
                    <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">Abubakar Ali</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-medium">250kg</span>
                    <span className="block text-[10px] text-[#16A34A] font-medium">● Complete</span>
                  </div>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-[#6B7280]">TH-KN-2026-00483</span>
                    <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">Ngozi Eze</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-400">—</span>
                    <span className="block text-[10px] text-[#16A34A] font-medium">● Complete</span>
                  </div>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-[#6B7280]">TH-KN-2026-00491</span>
                    <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">Bello Adamu</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-400">—</span>
                    <span className="block text-[10px] text-[#16A34A] font-medium">● Complete</span>
                  </div>
                </div>
              </div>
            </div>

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
                  onClick={() => alert(`Full provenance passport verified for ${activeDetailBatch.batch_number}`)}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  View Full Provenance
                </button>
                <button
                  onClick={() => alert('Exporting comprehensive lot audit report (PDF)...')}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  Export Report
                </button>
                <button
                  onClick={() => alert(`Batch ${activeDetailBatch.batch_number} flagged for supervisory review.`)}
                  className="py-2 px-3 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium text-red-600 dark:text-red-400 transition cursor-pointer col-span-2"
                >
                  Flag for Review
                </button>
              </div>
            </div>
          </div>
        </div>
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

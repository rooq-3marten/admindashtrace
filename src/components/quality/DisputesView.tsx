import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Dispute } from '../../types';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  MapPin,
  User,
  Check,
} from 'lucide-react';

export const DisputesView: React.FC = () => {
  const { disputes, resolveDispute } = useData();

  const [activeDisputeForModal, setActiveDisputeForModal] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const handleOpenResolve = (d: Dispute) => {
    setActiveDisputeForModal(d);
    setResolutionText('Moisture re-measurement confirmed 6.5% standard via accredited terminal lab. Price deduction reversed.');
  };

  const handleConfirmResolution = () => {
    if (!activeDisputeForModal || !resolutionText.trim()) return;
    resolveDispute(activeDisputeForModal.id, resolutionText);
    setActiveDisputeForModal(null);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Smallholder Disputes & Quality Arbitration
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Arbitrate weighbridge weight variances, moisture deduction claims, and grade classification disputes between farmers and aggregators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            {disputes.filter((d) => d.status === 'Open').length} Open Disputes
          </span>
        </div>
      </div>

      {/* Disputes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disputes.map((dispute) => (
          <div
            key={dispute.id}
            className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#1B7F4B] dark:text-emerald-400">
                  {dispute.farmer_id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    dispute.status === 'Open'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {dispute.status === 'Open' ? '🔴 Open' : '✓ Resolved'}
                </span>
              </div>

              <h3 className="font-bold text-base text-[#111827] dark:text-[#F1F5F9] mt-1">
                {dispute.issue}
              </h3>

              <div className="flex items-center gap-3 text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> {dispute.farmer_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {dispute.region}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> {dispute.date}
                </span>
              </div>

              <p className="text-xs text-[#111827] dark:text-[#F1F5F9] mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155] leading-relaxed">
                {dispute.details}
              </p>

              {dispute.resolution && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300">
                  <strong>Resolution:</strong> {dispute.resolution}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex justify-end">
              {dispute.status === 'Open' ? (
                <button
                  onClick={() => handleOpenResolve(dispute)}
                  className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer"
                >
                  Resolve Dispute →
                </button>
              ) : (
                <span className="text-xs text-[#16A34A] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Arbitration Closed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dispute Resolution Modal (Spec Section 6.5) */}
      {activeDisputeForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[560px] rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <h3 className="font-semibold text-base text-[#111827] dark:text-[#F1F5F9]">
                Resolve Smallholder Dispute
              </h3>
              <button
                onClick={() => setActiveDisputeForModal(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                {activeDisputeForModal.issue}
              </p>
              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                Farmer: {activeDisputeForModal.farmer_name} ({activeDisputeForModal.farmer_id}) · {activeDisputeForModal.region}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111827] dark:text-[#F1F5F9]">
                Arbitration Judgment & Resolution Action:
              </label>
              <textarea
                rows={3}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs text-[#111827] dark:text-[#F1F5F9] focus:ring-1 focus:ring-[#1B7F4B] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
              <button
                onClick={() => setActiveDisputeForModal(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolution}
                disabled={!resolutionText.trim()}
                className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

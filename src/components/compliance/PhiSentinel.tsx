import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PracticeLog } from '../../types';
import {
  AlertOctagon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Search,
  Filter,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const PhiSentinel: React.FC = () => {
  const { practices, updatePracticeRisk, stats } = useData();
  const { canFlagPractices } = useAuth();

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAuditPractice, setActiveAuditPractice] = useState<PracticeLog | null>(null);
  const [auditNotes, setAuditNotes] = useState<string>('');

  // Update clock every 5 seconds for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Format remaining time
  const getRemainingTime = (safeHarvestMs: number) => {
    const diff = safeHarvestMs - currentTime;
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  // Filtered practice logs
  const filteredPractices = useMemo(() => {
    return practices.filter((p) => {
      const applied = p.date_applied_epoch_ms;
      const phiDays = p.pre_harvest_interval_days || 0;
      const safeHarvest = p.safe_harvest_date_ms || applied + phiDays * 86400000;
      const isCleared = currentTime >= safeHarvest;

      let matchStatus = true;
      if (filterStatus === 'ACTIVE_HOLD') {
        matchStatus = !isCleared && p.risk_level !== 'FLAGGED_HIGH_RISK';
      } else if (filterStatus === 'CLEARED') {
        matchStatus = isCleared && p.risk_level === 'COMPLIANT';
      } else if (filterStatus === 'FLAGGED') {
        matchStatus = p.risk_level === 'FLAGGED_HIGH_RISK' || !p.nafdac_approved;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.product_name?.toLowerCase().includes(q) ||
        p.farmer_code?.toLowerCase().includes(q) ||
        p.active_ingredient?.toLowerCase().includes(q) ||
        p.nafdac_reg_no?.toLowerCase().includes(q) ||
        p.agent_id?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [practices, filterStatus, searchQuery, currentTime]);

  const handleSaveAudit = async (newRisk: 'COMPLIANT' | 'FLAGGED_HIGH_RISK' | 'UNDER_REVIEW') => {
    if (!activeAuditPractice) return;
    await updatePracticeRisk(activeAuditPractice.client_uuid, newRisk, auditNotes);
    setActiveAuditPractice(null);
    setAuditNotes('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-semibold">
              NAFDAC Regulatory Sentinel
            </span>
            <span className="text-xs text-[#6B7280] dark:text-slate-400 font-mono">Maximum Residue Limit (MRL) Enforcement</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight">Pre-Harvest Interval (PHI) Compliance Sentinel</h2>
          <p className="text-sm text-[#6B7280] dark:text-slate-400 max-w-2xl mt-0.5">
            Automated countdown tracking preventing premature smallholder harvesting before agrochemical residues degrade to safe export thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-[#E5E7EB] dark:border-slate-800 text-right">
            <span className="text-[10px] uppercase font-mono text-[#6B7280] dark:text-slate-400">Quarantine Holds</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.activePhiHolds} Active</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
        <div className="md:col-span-7 relative">
          <Search className="w-4 h-4 text-[#9CA3AF] dark:text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            aria-label="Search by product name, active ingredient, farmer code, or NAFDAC Reg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs text-[#111827] dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-5 flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Logs ({practices.length})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE_HOLD')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterStatus === 'ACTIVE_HOLD'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold'
                : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Active Holds ({stats.activePhiHolds})
          </button>
          <button
            onClick={() => setFilterStatus('CLEARED')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterStatus === 'CLEARED'
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold'
                : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Cleared
          </button>
          <button
            onClick={() => setFilterStatus('FLAGGED')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterStatus === 'FLAGGED'
                ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 font-semibold'
                : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Flagged ({stats.flaggedPractices})
          </button>
        </div>
      </div>

      {/* Practices Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPractices.map((practice) => {
          const applied = practice.date_applied_epoch_ms;
          const phiDays = practice.pre_harvest_interval_days || 0;
          const safeHarvest = practice.safe_harvest_date_ms || applied + phiDays * 86400000;
          const countdown = getRemainingTime(safeHarvest);
          const isCleared = !countdown;
          const isFlagged = practice.risk_level === 'FLAGGED_HIGH_RISK' || !practice.nafdac_approved;

          return (
            <div
              key={practice.client_uuid}
              className={`p-4 rounded-xl border transition-all ${
                isFlagged
                  ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-800/60 shadow-xs'
                  : !isCleared
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs'
                  : 'bg-white dark:bg-slate-900/90 border-[#E5E7EB] dark:border-slate-800 shadow-xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111827] dark:text-white text-base">{practice.product_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-700">
                      {practice.farmer_code}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">{practice.practice_type}</p>
                </div>

                {/* Status Badge */}
                {isFlagged ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-300 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 shrink-0">
                    <XCircle className="w-3.5 h-3.5" /> High Risk Flagged
                  </span>
                ) : !isCleared ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 shrink-0">
                    <Clock className="w-3.5 h-3.5 animate-spin" /> PHI Active Hold
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Harvest Safe
                  </span>
                )}
              </div>

              {/* Chemical Specifications Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 border-y border-[#E5E7EB] dark:border-slate-800/80">
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono uppercase">Active Ingredient</span>
                  <div className="font-semibold text-[#111827] dark:text-slate-200 mt-0.5 truncate">{practice.active_ingredient}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono uppercase">Applied Dosage</span>
                  <div className="font-semibold text-[#111827] dark:text-slate-200 mt-0.5">
                    {practice.dosage} ({practice.quantity_used} {practice.quantity_unit})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono uppercase">NAFDAC Reg No</span>
                  <div className="font-mono text-[#111827] dark:text-slate-200 mt-0.5">{practice.nafdac_reg_no}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-mono uppercase">Field Agent</span>
                  <div className="font-mono text-[#111827] dark:text-slate-200 mt-0.5">{practice.agent_id}</div>
                </div>
              </div>

              {/* Countdown or Cleared Box */}
              {!isCleared && countdown ? (
                <div className="p-3 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 uppercase font-mono font-semibold">
                      Countdown Until Safe Harvest:
                    </span>
                    <div className="flex items-center gap-2 font-mono text-amber-900 dark:text-amber-200 font-bold text-sm">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>
                        {countdown.days}d {countdown.hours}h {countdown.minutes}m Remaining
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-800 dark:text-amber-400/80 font-mono text-right">
                    Safe Date:
                    <br />
                    {new Date(safeHarvest).toLocaleDateString()}
                  </span>
                </div>
              ) : isCleared && !isFlagged ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                    Pre-Harvest Interval Elapsed ({phiDays} days). Residue within EU/US MRL limits.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-xs text-red-800 dark:text-red-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>RESTRICTED AGROCHEMICAL DETECTED</span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-200">
                    {practice.notes || 'Chemical is prohibited for export commodities under European Union Annex II.'}
                  </p>
                </div>
              )}

              {/* Compliance Officer Audit Actions */}
              {canFlagPractices && (
                <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280] dark:text-slate-500 font-mono">
                    Applied: {new Date(practice.date_applied_epoch_ms).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => {
                      setActiveAuditPractice(practice);
                      setAuditNotes(practice.notes || '');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-[#111827] dark:text-slate-300 hover:text-black dark:hover:text-white font-medium border border-[#E5E7EB] dark:border-slate-700 transition cursor-pointer"
                  >
                    Audit / Flag Status
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit Action Modal */}
      {activeAuditPractice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">NAFDAC Regulatory Audit</h3>
                <p className="text-xs text-[#6B7280] dark:text-slate-400">
                  {activeAuditPractice.product_name} ({activeAuditPractice.farmer_code})
                </p>
              </div>
              <button
                onClick={() => setActiveAuditPractice(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[#111827] dark:text-slate-300 font-medium block">Compliance Audit Notes / Directive:</label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                aria-label="Regulatory justification notes"
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-[#111827] dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-slate-800">
              <button
                onClick={() => setActiveAuditPractice(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-slate-300 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveAudit('FLAGGED_HIGH_RISK')}
                  className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 text-xs font-semibold cursor-pointer"
                >
                  Flag High Risk / Quarantine
                </button>
                <button
                  onClick={() => handleSaveAudit('COMPLIANT')}
                  className="px-3 py-1.5 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Clear & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

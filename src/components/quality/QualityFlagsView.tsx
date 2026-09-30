import React from 'react';
import { useData } from '../../context/DataContext';
import { Flag, AlertTriangle, ShieldCheck, CheckCircle2, Download, AlertOctagon } from 'lucide-react';

export const QualityFlagsView: React.FC = () => {
  const { practices, updatePracticeRisk } = useData();

  const flagged = practices.filter(
    (p) => !p.nafdac_approved || p.risk_level === 'FLAGGED_HIGH_RISK'
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Active Compliance & Agrochemical Flags
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Prohibited active ingredients, Pre-Harvest Interval (PHI) violations, and pending consignment quarantine holds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            {flagged.length} Active High-Risk Flags
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Farmer Code</th>
                <th className="py-3 px-4">Practice / Chemical Product</th>
                <th className="py-3 px-4">Active Ingredient</th>
                <th className="py-3 px-4">Date Applied</th>
                <th className="py-3 px-4">PHI Status</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {flagged.map((p) => (
                <tr key={p.client_uuid} className="hover:bg-red-50/50 dark:hover:bg-red-950/20">
                  <td className="py-3.5 px-4 font-mono font-semibold">
                    {p.farmer_code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-red-600 dark:text-red-400">
                    {p.product_name}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B7280] dark:text-[#94A3B8]">
                    {p.active_ingredient}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {new Date(p.date_applied_epoch_ms).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.phi_cleared ? (
                      <span className="text-[#16A34A] font-semibold">● Cleared</span>
                    ) : (
                      <span className="text-[#DC2626] font-semibold">● Active Hold ({p.pre_harvest_interval_days}d)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                      FLAGGED HIGH RISK
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => updatePracticeRisk(p.client_uuid, 'COMPLIANT', 'Cleared after laboratory residue verification.')}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-[#1B7F4B] hover:text-white transition text-xs font-semibold cursor-pointer"
                    >
                      Clear Flag
                    </button>
                  </td>
                </tr>
              ))}
              {flagged.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No active high-risk flags detected across current crop cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

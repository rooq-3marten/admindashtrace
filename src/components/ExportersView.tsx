import React from 'react';
import { Briefcase, Building, CheckCircle2, ShieldCheck, ExternalLink, MapPin } from 'lucide-react';

export const ExportersView: React.FC = () => {
  const exporters: {
    id: string; name: string; terminal: string; commodities: string[];
    license: string; status: string; contact: string; totalBatches: number;
  }[] = [];

  const [selectedExporter, setSelectedExporter] = React.useState<typeof exporters[0] | null>(null);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Certified Exporters & Trading Houses
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Registered international off-takers and commodity trading conglomerates authorized to purchase EUDR/NAFDAC certified consignment passports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {exporters.length === 0 && (
          <div className="md:col-span-3 p-8 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-center text-sm text-[#6B7280] dark:text-[#94A3B8]">
            No exporters registered yet.
          </div>
        )}
        {exporters.map((exp) => (
          <div
            key={exp.id}
            className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#1B7F4B] dark:text-emerald-400">
                  {exp.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {exp.status}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#111827] dark:text-[#F1F5F9] mt-2">
                {exp.name}
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#1B7F4B]" />
                {exp.terminal}
              </p>
              <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155] text-xs space-y-1">
                <p className="text-[#6B7280] dark:text-[#94A3B8]">
                  License: <strong className="font-mono text-[#111827] dark:text-[#F1F5F9]">{exp.license}</strong>
                </p>
                <p className="text-[#6B7280] dark:text-[#94A3B8]">
                  Commodities: <span className="text-[#111827] dark:text-[#F1F5F9]">{exp.commodities.join(', ')}</span>
                </p>
                <p className="text-[#6B7280] dark:text-[#94A3B8]">
                  Contact: <span className="font-mono text-[#111827] dark:text-[#F1F5F9]">{exp.contact}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                {exp.totalBatches} Lots Sourced
              </span>
              <button
                onClick={() => setSelectedExporter(exp)}
                className="text-[#1B7F4B] dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                View Account →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Exporter Account Modal */}
      {selectedExporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#1B7F4B]" />
                <h3 className="font-bold text-lg text-[#111827] dark:text-[#F1F5F9]">
                  {selectedExporter.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExporter(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">NEPC Active Export Clearance Verified</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155]">
                <div>
                  <span className="text-[#6B7280]">Account Code:</span>
                  <p className="font-mono font-bold text-[#111827] dark:text-[#F1F5F9]">{selectedExporter.id}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Export Terminal:</span>
                  <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">{selectedExporter.terminal}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Official License:</span>
                  <p className="font-mono text-[#111827] dark:text-[#F1F5F9]">{selectedExporter.license}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Batches Sourced:</span>
                  <p className="font-mono font-bold text-[#1B7F4B]">{selectedExporter.totalBatches} Lots</p>
                </div>
              </div>

              <div>
                <span className="text-[#6B7280] block mb-1">Approved Commodities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedExporter.commodities.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-[#F1F5F9] font-medium text-[11px]">
                      🌾 {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex justify-end">
              <button
                onClick={() => setSelectedExporter(null)}
                className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { BarChart3, FileText, Download, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const reportsList = [
    {
      id: 'REP-2026-EUDR',
      title: 'EUDR Deforestation Due Diligence Statement',
      category: 'Regulatory Compliance',
      date: 'Sep 30, 2026',
      scope: 'Northern Corridor Sesame & Soybean Smallholders',
      status: 'Ready for Submission',
    },
    {
      id: 'REP-2026-NAFDAC',
      title: 'NAFDAC Agrochemical MRL Clearance Digest',
      category: 'Phytosanitary',
      date: 'Sep 29, 2026',
      scope: 'Active PHI clearance & banned substance screening',
      status: 'Certified',
    },
    {
      id: 'REP-2026-TRACE',
      title: 'Chain of Custody & Smallholder Aggregation Report',
      category: 'Export Provenance',
      date: 'Sep 28, 2026',
      scope: 'Batches BATCH-KN-2026-1187 through 1192',
      status: 'Cryptographically Sealed',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Regulatory & Provenance Reports
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Official compliance packages generated for EU competent authorities, port authorities, and NAFDAC export certifiers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reportsList.map((rep) => (
          <div
            key={rep.id}
            className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#1B7F4B] dark:text-emerald-400 font-semibold">
                  {rep.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {rep.status}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#111827] dark:text-[#F1F5F9] mt-2">
                {rep.title}
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
                {rep.scope}
              </p>
              <div className="mt-3 text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                <span>Category: <strong>{rep.category}</strong></span> • <span>Generated: {rep.date}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
              <button
                onClick={() => alert(`Downloading verified report ${rep.id} (PDF & GeoJSON bundle)...`)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report Package
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

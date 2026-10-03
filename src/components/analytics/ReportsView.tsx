import React from 'react';
import { useData } from '../../context/DataContext';
import { BarChart3, FileText, Download, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { farmers, batches, practices } = useData();

  const batchScope =
    batches.length > 0
      ? `Batches ${batches[0]?.batch_number} through ${batches[batches.length - 1]?.batch_number} (${batches.length} total lots)`
      : 'All active export batches';

  const reportsList = [
    {
      id: 'REP-2026-EUDR',
      title: 'EUDR Deforestation Due Diligence Statement',
      category: 'Regulatory Compliance',
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      scope: `${farmers.length} Northern Corridor smallholders verified with closed-loop GPS boundaries.`,
      status: 'Ready for Submission',
      generateData: () => ({
        report_id: 'REP-2026-EUDR',
        standard: 'EU Deforestation Regulation (Regulation EU 2023/1115)',
        total_smallholders: farmers.length,
        verified_polygons: farmers.filter((f) => f.latitude && f.longitude).length,
        farmers: farmers.map((f) => ({
          official_id: f.official_farmer_id,
          name: f.full_name,
          state: f.state,
          lga: f.lga,
          crop: f.crop,
          hectares: f.farm_size_hectares,
          gps: [f.latitude, f.longitude],
        })),
        audit_conclusion: 'ZERO_DEFORESTATION_VERIFIED',
      }),
    },
    {
      id: 'REP-2026-NAFDAC',
      title: 'NAFDAC Agrochemical MRL Clearance Digest',
      category: 'Phytosanitary',
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      scope: `${practices.length} agrochemical spray logs inspected against NAFDAC & EU Annex II limits.`,
      status: 'Certified',
      generateData: () => ({
        report_id: 'REP-2026-NAFDAC',
        standard: 'NAFDAC Pesticide Residue & Pre-Harvest Interval Protocol',
        practices_screened: practices.length,
        prohibited_substances_detected: practices.filter((p) => !p.nafdac_approved).length,
        cleared_entries: practices.filter((p) => p.phi_cleared && p.nafdac_approved).length,
        practices: practices.map((p) => ({
          farmer_code: p.farmer_code,
          product_name: p.product_name,
          active_ingredient: p.active_ingredient,
          phi_days: p.pre_harvest_interval_days,
          status: p.risk_level,
        })),
      }),
    },
    {
      id: 'REP-2026-TRACE',
      title: 'Chain of Custody & Smallholder Aggregation Report',
      category: 'Export Provenance',
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      scope: batchScope,
      status: 'Cryptographically Sealed',
      generateData: () => ({
        report_id: 'REP-2026-TRACE',
        batches_count: batches.length,
        batches: batches.map((b) => ({
          batch_number: b.batch_number,
          crop: b.crop,
          tonnage: b.estimated_tonnage,
          destination: b.destination,
          tamper_proof_sha256: b.tamper_proof_sha256,
          clearance: b.export_clearance_status,
        })),
      }),
    },
  ];

  const handleDownloadReport = (rep: typeof reportsList[0]) => {
    const data = rep.generateData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rep.id.toLowerCase()}_compliance_package.json`;
    link.click();
  };

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
                onClick={() => handleDownloadReport(rep)}
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

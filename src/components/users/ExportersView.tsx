import React from 'react';
import { Briefcase, Building, CheckCircle2, ShieldCheck, ExternalLink, MapPin } from 'lucide-react';

export const ExportersView: React.FC = () => {
  const exporters = [
    {
      id: 'EXP-HO-01',
      name: 'Olam Agri Nigeria Ltd',
      terminal: 'Lagos Apapa Port',
      commodities: ['Sesame', 'Soybeans', 'Cocoa'],
      license: 'NEPC-CERT-2026-0814',
      status: 'Active Certified Exporter',
      contact: 'export-ops@olam.com',
      totalBatches: 24,
    },
    {
      id: 'EXP-HO-02',
      name: 'WACOT Limited (Tropical General Investments)',
      terminal: 'Tin Can Island Port',
      commodities: ['Sesame', 'Soybeans', 'Raw Cashew Nuts'],
      license: 'NEPC-CERT-2026-1190',
      status: 'Active Certified Exporter',
      contact: 'trade@wacot.com',
      totalBatches: 18,
    },
    {
      id: 'EXP-HO-03',
      name: 'Outspan Nigeria Limited',
      terminal: 'Lagos Apapa Port',
      commodities: ['Ginger', 'Sesame'],
      license: 'NEPC-CERT-2026-0422',
      status: 'Active Certified Exporter',
      contact: 'compliance@outspan.com',
      totalBatches: 12,
    },
  ];

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
                onClick={() => alert(`Opening trading house profile for ${exp.name}...`)}
                className="text-[#1B7F4B] dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                View Account →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

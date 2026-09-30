import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
  AlertOctagon,
  Users,
  Radio,
  Download,
  Send,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';

export const DataQualityDashboard: React.FC = () => {
  const { farmers, practices, batches, agents } = useData();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState('');

  const handleAction = (title: string, actionDesc: string) => {
    setModalMessage(actionDesc);
    setActiveModal(title);
  };

  const handleExportQualityList = (category: string) => {
    const csv = `Category,Issue,Generated At\n"${category}","TraceHarvest Quality Audit",${new Date().toISOString()}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `traceharvest_quality_${category.toLowerCase().replace(/\s+/g, '_')}.csv`);
    link.click();
  };

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Data Quality & Integrity Sentinel
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Automated anomaly detection across smallholder enrollments, GPS polygon bounds, and agrochemical audits.
          </p>
        </div>
        <button
          onClick={() => handleExportQualityList('All_Data_Gaps')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export All Quality Gaps
        </button>
      </div>

      {/* Quality Gap Card 1: Missing GPS Coordinates (🔴 Error) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              MISSING GPS COORDINATES
            </h3>
          </div>
          <button
            onClick={() => handleAction('Missing GPS Coordinates', 'Detailed audit list of 12 farmers without verified GPS centroids or polygons.')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            12 farmers enrolled without GPS
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Regions: Kano (7), Jigawa (3), Benue (2)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Notify Agents', 'SMS broadcast dispatched to assigned enumerators in Kano, Jigawa, and Benue to capture plot polygons.')}
            className="px-3.5 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-medium transition cursor-pointer"
          >
            Notify Agents
          </button>
          <button
            onClick={() => handleExportQualityList('Missing_GPS')}
            className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
          >
            Export List
          </button>
        </div>
      </div>

      {/* Quality Gap Card 2: Missing Practice Logs (🟡 Warning) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              MISSING PRACTICE LOGS
            </h3>
          </div>
          <button
            onClick={() => handleAction('Missing Practice Logs', '8 export batches require agrochemical spraying logs from contributing smallholders before clearance.')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            8 batches have contributing farmers with no logs
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Regions: Kano (5), Benue (2), Jigawa (1)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Request Follow-up', 'Follow-up task created in Android field queue for batch supervisors in Kano, Benue, and Jigawa.')}
            className="px-3.5 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-medium transition cursor-pointer"
          >
            Request Follow-up
          </button>
          <button
            onClick={() => handleExportQualityList('Missing_Practice_Logs')}
            className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
          >
            Export List
          </button>
        </div>
      </div>

      {/* Quality Gap Card 3: Unapproved Products Detected (🔴 Error) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              UNAPPROVED PRODUCTS DETECTED
            </h3>
          </div>
          <button
            onClick={() => handleAction('Unapproved Products Detected', 'Critical MRL alert: Prohibited chemical active ingredients reported in smallholder logs.')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            5 pesticide logs reference products not on approved list
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Products: "Unknown Brand X" (3), "Generic Y" (2)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Flag Batches', 'Associated export batches placed under automatic regulatory quarantine pending chemical residue re-testing.')}
            className="px-3.5 py-1.5 rounded-md bg-[#DC2626] hover:bg-red-700 text-white text-xs font-medium transition cursor-pointer"
          >
            Flag Batches
          </button>
          <button
            onClick={() => handleExportQualityList('Unapproved_Products')}
            className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
          >
            Export List
          </button>
        </div>
      </div>

      {/* Quality Gap Card 4: Duplicate Farmer Records (🟡 Warning) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              DUPLICATE FARMER RECORDS
            </h3>
          </div>
          <button
            onClick={() => handleAction('Duplicate Farmer Records', 'Phone number conflicts detected across multiple smallholder enrollment profiles.')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            3 phone numbers appear in multiple farmer records
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Records: +234 803 451 2991 (2 entries), +234 802 883 4412 (2 entries)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Merge Records', 'Duplicate deduplication wizard opened. Records merged under primary official registration.')}
            className="px-3.5 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-medium transition cursor-pointer"
          >
            Merge Records
          </button>
          <button
            onClick={() => handleExportQualityList('Duplicate_Farmers')}
            className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
          >
            Export List
          </button>
        </div>
      </div>

      {/* Quality Gap Card 5: Stale Agent Sync (🟡 Warning) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              STALE AGENT SYNC
            </h3>
          </div>
          <button
            onClick={() => handleAction('Stale Agent Sync', 'Field devices holding offline SQLite backlogs without upstream transmission for >48 hours.')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            2 agents haven't synced in 48+ hours
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Agents: Fatima S. (3 days), Emeka N. (2 days)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Send Notification', 'Push notification and SMS wake-up dispatched to agents Fatima S. and Emeka N.')}
            className="px-3.5 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-medium transition cursor-pointer"
          >
            Send Notification
          </button>
          <button
            onClick={() => handleExportQualityList('Stale_Sync')}
            className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-[#111827] dark:text-[#F1F5F9] font-medium transition cursor-pointer"
          >
            Export List
          </button>
        </div>
      </div>

      {/* Action Feedback Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                <h3 className="font-semibold text-base text-[#111827] dark:text-[#F1F5F9]">
                  {activeModal}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
              {modalMessage}
            </p>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

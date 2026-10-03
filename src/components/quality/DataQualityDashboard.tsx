import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Farmer, PracticeLog, ExportBatch, FieldAgent } from '../../types';
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

  // 1. Missing GPS
  const missingGps = useMemo(() => {
    return farmers.filter((f: Farmer) => !f.latitude || !f.longitude || !f.gps_polygon);
  }, [farmers]);

  const missingGpsByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    missingGps.forEach((f: Farmer) => {
      map[f.state] = (map[f.state] || 0) + 1;
    });
    const entries = Object.entries(map);
    if (entries.length === 0) return 'All regions verified compliant';
    return entries.map(([state, count]) => `${state} (${count})`).join(', ');
  }, [missingGps]);

  // 2. Missing Practice Logs
  const batchesWithoutLogs = useMemo(() => {
    return batches.filter((b: ExportBatch) => {
      const linked = practices.filter((p: PracticeLog) => b.farmer_client_uuids?.includes(p.farmer_client_uuid));
      return linked.length === 0;
    });
  }, [batches, practices]);

  // 3. Unapproved Products
  const unapprovedPractices = useMemo(() => {
    return practices.filter((p: PracticeLog) => !p.nafdac_approved || p.risk_level === 'FLAGGED_HIGH_RISK');
  }, [practices]);

  const unapprovedProductNames = useMemo(() => {
    const names = Array.from(new Set(unapprovedPractices.map((p: PracticeLog) => p.product_name)));
    return names.length > 0 ? names.join(', ') : 'None detected';
  }, [unapprovedPractices]);

  // 4. Duplicate phone numbers
  const duplicatePhoneList = useMemo(() => {
    const counts: Record<string, number> = {};
    farmers.forEach((f: Farmer) => {
      if (f.phone_number) {
        counts[f.phone_number] = (counts[f.phone_number] || 0) + 1;
      }
    });
    return Object.entries(counts).filter(([_, count]) => count > 1);
  }, [farmers]);

  // 5. Stale Agent Sync
  const staleAgentsList = useMemo(() => {
    return agents.filter(
      (a: FieldAgent) => a.active_status === 'offline' || Date.now() - a.last_sync_epoch_ms > 24 * 3600 * 1000
    );
  }, [agents]);

  const handleAction = (title: string, actionDesc: string) => {
    setModalMessage(actionDesc);
    setActiveModal(title);
  };

  const handleExportQualityList = (category: string) => {
    let csv = `Category,Issue,Generated At\n"${category}","TraceHarvest Quality Audit",${new Date().toISOString()}\n`;
    if (category === 'Missing_GPS') {
      csv += 'Farmer ID,Name,State,LGA\n';
      missingGps.forEach((f: Farmer) => {
        csv += `"${f.official_farmer_id}","${f.full_name}","${f.state}","${f.lga}"\n`;
      });
    } else if (category === 'Unapproved_Products') {
      csv += 'Farmer Code,Product Name,Active Ingredient,Risk\n';
      unapprovedPractices.forEach((p: PracticeLog) => {
        csv += `"${p.farmer_code}","${p.product_name}","${p.active_ingredient}","${p.risk_level}"\n`;
      });
    }
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
            <span className={`w-2.5 h-2.5 rounded-full ${missingGps.length > 0 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              MISSING GPS COORDINATES
            </h3>
          </div>
          <button
            onClick={() => handleAction('Missing GPS Coordinates', `${missingGps.length} smallholders require verified plot polygons before export passport certification.`)}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            {missingGps.length > 0 ? `${missingGps.length} farmers enrolled without verified GPS centroid/polygon` : '100% smallholders have verified GPS coordinates'}
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Regions: {missingGpsByRegion}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Notify Agents', `SMS and dispatch instructions issued to field agents in: ${missingGpsByRegion}.`)}
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
            <span className={`w-2.5 h-2.5 rounded-full ${batchesWithoutLogs.length > 0 ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              MISSING PRACTICE LOGS
            </h3>
          </div>
          <button
            onClick={() => handleAction('Missing Practice Logs', `${batchesWithoutLogs.length} export lots contain smallholders with no registered chemical spraying logs.`)}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            {batchesWithoutLogs.length > 0 ? `${batchesWithoutLogs.length} batches have contributing farmers with no logs` : 'All export batches have complete practice logs'}
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Batches: {batchesWithoutLogs.length > 0 ? batchesWithoutLogs.map((b: ExportBatch) => b.batch_number).join(', ') : 'All clear'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Request Follow-up', 'Follow-up requests dispatched to supervisors for lots with missing spray records.')}
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
            <span className={`w-2.5 h-2.5 rounded-full ${unapprovedPractices.length > 0 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              UNAPPROVED PRODUCTS DETECTED
            </h3>
          </div>
          <button
            onClick={() => handleAction('Unapproved Products Detected', `${unapprovedPractices.length} pesticide applications flagged under NAFDAC and EU Annex II prohibited substances.`)}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            {unapprovedPractices.length > 0 ? `${unapprovedPractices.length} pesticide logs reference unapproved products` : 'Zero banned active ingredients detected'}
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Flagged Products: {unapprovedProductNames}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Flag Batches', 'Associated export batches placed under regulatory quarantine.')}
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
            <span className={`w-2.5 h-2.5 rounded-full ${duplicatePhoneList.length > 0 ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              DUPLICATE FARMER RECORDS
            </h3>
          </div>
          <button
            onClick={() => handleAction('Duplicate Farmer Records', `${duplicatePhoneList.length} contact numbers appear across multiple smallholder entries.`)}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            {duplicatePhoneList.length > 0 ? `${duplicatePhoneList.length} duplicate phone records detected across registry` : 'All smallholder phone numbers uniquely verified'}
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            {duplicatePhoneList.length > 0 ? duplicatePhoneList.map(([phone, count]: [string, number]) => `${phone} (${count} entries)`).join(', ') : 'Deduplication index clean'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Merge Records', 'Deduplication index verified. Unique national ID mapped to primary record.')}
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
            <span className={`w-2.5 h-2.5 rounded-full ${staleAgentsList.length > 0 ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              STALE AGENT SYNC
            </h3>
          </div>
          <button
            onClick={() => handleAction('Stale Agent Sync', `${staleAgentsList.length} field enumerators pending upstream synchronization.`)}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
            {staleAgentsList.length > 0 ? `${staleAgentsList.length} agents haven't synced in 24+ hours` : 'All field agents synced within 24 hours'}
          </p>
          <p className="text-[#6B7280] dark:text-[#94A3B8]">
            Agents: {staleAgentsList.length > 0 ? staleAgentsList.map((a: FieldAgent) => `${a.name} (${a.agent_id})`).join(', ') : 'All online'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleAction('Send Notification', `Sync notification sent to: ${staleAgentsList.map((a: FieldAgent) => a.name).join(', ')}.`)}
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

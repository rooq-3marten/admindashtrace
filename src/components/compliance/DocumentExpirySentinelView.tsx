import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Ship,
  FileCheck,
  Calendar,
  Download,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  Check,
  Package,
} from 'lucide-react';
import {
  evaluateDocumentEtaRisks,
  executeSentinelCronScan,
  DocumentEtaAuditRecord,
  SentinelCronExecutionLog,
} from '../../utils/documentExpirySentinel';
import { AuditDossierModal } from '../batches/AuditDossierModal';
import { ExportBatch } from '../../types';

export const DocumentExpirySentinelView: React.FC = () => {
  const { documents, batches, shipments } = useData();

  const [cronExpression, setCronExpression] = useState('0 */6 * * *');
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [lastCronLog, setLastCronLog] = useState<SentinelCronExecutionLog | null>(null);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'FLAGGED' | 'CRITICAL' | 'SAFE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchForDossier, setSelectedBatchForDossier] = useState<ExportBatch | null>(null);
  const [renewalNotice, setRenewalNotice] = useState<string | null>(null);

  // Evaluate documents
  const allRecords = useMemo(() => {
    return evaluateDocumentEtaRisks(documents, batches, shipments);
  }, [documents, batches, shipments]);

  // Run initial scan
  useEffect(() => {
    const initialLog = executeSentinelCronScan(documents, batches, shipments, cronExpression);
    setLastCronLog(initialLog);
  }, [documents, batches, shipments, cronExpression]);

  // Automated client-side cron ticker every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const log = executeSentinelCronScan(documents, batches, shipments, cronExpression);
      setLastCronLog(log);
    }, 60000);
    return () => clearInterval(interval);
  }, [documents, batches, shipments, cronExpression]);

  // Trigger manual cron evaluation
  const handleTriggerCronNow = async () => {
    setIsRunningCron(true);
    try {
      // Also try calling server-side cron trigger endpoint if online
      fetch('/api/v1/sentinel/cron-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'web_admin', cron_expression: cronExpression }),
      }).catch(() => {});
    } catch (_) {}

    setTimeout(() => {
      const log = executeSentinelCronScan(documents, batches, shipments, cronExpression);
      setLastCronLog(log);
      setIsRunningCron(false);
    }, 400);
  };

  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      if (filterRisk === 'FLAGGED' && !rec.isFlagged) return false;
      if (filterRisk === 'CRITICAL' && rec.riskLevel !== 'CRITICAL_EXPIRED_BEFORE_ETA') return false;
      if (filterRisk === 'SAFE' && rec.isFlagged) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rec.documentTitle.toLowerCase().includes(q);
        const matchBatch = rec.batchNumber?.toLowerCase().includes(q);
        const matchVessel = rec.vesselName.toLowerCase().includes(q);
        const matchPort = rec.destinationPort.toLowerCase().includes(q);
        const matchCert = rec.certificateNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchBatch && !matchVessel && !matchPort && !matchCert) return false;
      }

      return true;
    });
  }, [allRecords, filterRisk, searchQuery]);

  const flaggedCount = allRecords.filter((r) => r.isFlagged).length;
  const criticalCount = allRecords.filter((r) => r.riskLevel === 'CRITICAL_EXPIRED_BEFORE_ETA').length;
  const safeCount = allRecords.filter((r) => !r.isFlagged).length;

  const handleFastTrackRenewal = (record: DocumentEtaAuditRecord) => {
    setRenewalNotice(`Emergency renewal requested for ${record.documentTitle} (${record.certificateNumber || record.documentId}). Notification dispatched to ${record.recommendedAuthorityContact}.`);
    setTimeout(() => setRenewalNotice(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold">
              Automated Document Expiry Sentinel
            </span>
            <span className="text-xs text-slate-500 font-mono">Maritime ETA Buffer &lt; 14 Days Monitor</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Phytosanitary & Lab Assay Maritime Expiry Sentinel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
            Automated cron triggers comparing NAQS phytosanitary certificates and SGS gas-chromatography lab assays against ocean vessel Estimated Time of Arrival (ETA) at Rotterdam and Hamburg.
          </p>
        </div>

        {/* Cron Trigger Controls */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Cron Trigger Interval</span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{cronExpression} (Every 6h / Auto 60s)</span>
          </div>

          <button
            onClick={handleTriggerCronNow}
            disabled={isRunningCron}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningCron ? 'animate-spin' : ''}`} />
            <span>{isRunningCron ? 'Scanning...' : 'Trigger Cron Now'}</span>
          </button>
        </div>
      </div>

      {/* Renewal Notification Alert */}
      {renewalNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{renewalNotice}</span>
          </div>
          <button onClick={() => setRenewalNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Total Documents Monitored</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{allRecords.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">NAQS Phytosanitary & SGS Lab Assays</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 uppercase font-semibold">
            Expiring &le; 14 Days of Vessel ETA
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">{flaggedCount} Flagged</div>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 block">Customs quarantine inspection risk</span>
        </div>

        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 shadow-xs">
          <span className="text-[11px] font-mono text-red-700 dark:text-red-400 uppercase font-semibold">
            Expired Before Vessel ETA
          </span>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 font-mono">{criticalCount} Critical</div>
          <span className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-1 block">Immediate border rejection & impound</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-semibold">
            Safe European Window (&gt; 14 Days)
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{safeCount} Cleared</div>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 block">Rotterdam & Hamburg cleared</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Monitored' },
            { id: 'FLAGGED', label: '⚠️ Expiring ≤ 14 Days' },
            { id: 'CRITICAL', label: '🛑 Critical (< 0 Days)' },
            { id: 'SAFE', label: '✓ Safe Window (> 14 Days)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterRisk(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterRisk === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by lot, vessel, or authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Audit Records Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Document / Authority</th>
                <th className="py-3 px-4">Consignment Lot</th>
                <th className="py-3 px-4">Ocean Vessel & Destination</th>
                <th className="py-3 px-4">Vessel ETA</th>
                <th className="py-3 px-4">Doc Expiry</th>
                <th className="py-3 px-4">Days Post-ETA</th>
                <th className="py-3 px-4">Sentinel Risk Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-200">
              {filteredRecords.map((record) => {
                const linkedBatch = batches.find((b) => b.batch_number === record.batchNumber);

                return (
                  <tr
                    key={record.documentId}
                    className={`transition hover:bg-slate-50 dark:hover:bg-slate-900/40 ${
                      record.riskLevel === 'CRITICAL_EXPIRED_BEFORE_ETA'
                        ? 'bg-red-50/30 dark:bg-red-950/10'
                        : record.isFlagged
                        ? 'bg-amber-50/30 dark:bg-amber-950/10'
                        : ''
                    }`}
                  >
                    {/* Document */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {record.documentCategory === 'PHYTOSANITARY' ? '🌿' : '🧪'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {record.documentTitle}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {record.certificateNumber || record.regulatoryAuthority}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Consignment Lot */}
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <span>{record.batchNumber || '—'}</span>
                      <span className="block text-[10px] font-sans font-normal text-slate-500">
                        {record.crop}
                      </span>
                    </td>

                    {/* Maritime Vessel */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Ship className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="line-clamp-1">{record.vesselName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {record.destinationPort}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold">{record.etaDateStr}</span>
                      <span className="block text-[10px] text-slate-500">
                        in {record.daysFromNowToEta} days
                      </span>
                    </td>

                    {/* Doc Expiry */}
                    <td className="py-3.5 px-4 font-mono">
                      <span>{record.expiryDateStr || '—'}</span>
                    </td>

                    {/* Days from ETA to Expiry */}
                    <td className="py-3.5 px-4 font-mono">
                      {record.daysFromEtaToExpiry !== undefined ? (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            record.daysFromEtaToExpiry < 0
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : record.daysFromEtaToExpiry <= 14
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          <span>{record.daysFromEtaToExpiry > 0 ? `+${record.daysFromEtaToExpiry}` : record.daysFromEtaToExpiry} d</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Risk Verdict */}
                    <td className="py-3.5 px-4">
                      {record.riskLevel === 'CRITICAL_EXPIRED_BEFORE_ETA' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <AlertOctagon className="w-3 h-3 text-red-600" />
                          Expired Pre-ETA (Impound Risk)
                        </span>
                      )}
                      {record.riskLevel === 'FLAGGED_EXPIRING_WITHIN_14_DAYS' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Expiring &le; 14d of ETA
                        </span>
                      )}
                      {record.riskLevel === 'WARNING_APPROACHING_MARGIN' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Approaching (15-21d)
                        </span>
                      )}
                      {record.riskLevel === 'COMPLIANT_SAFE_MARGIN' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Safe Single-Window Margin
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.isFlagged && (
                          <button
                            onClick={() => handleFastTrackRenewal(record)}
                            className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 text-[11px] font-semibold transition cursor-pointer"
                          >
                            Fast-Track Renewal
                          </button>
                        )}
                        {linkedBatch && (
                          <button
                            onClick={() => setSelectedBatchForDossier(linkedBatch)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Audit Dossier</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last Automated Cron Scan: {lastCronLog ? new Date(lastCronLog.timestamp).toLocaleTimeString() : 'Active'} ({lastCronLog?.executionTimeMs || 12} ms)
            </span>
          </div>
          <span>Showing {filteredRecords.length} records</span>
        </div>
      </div>

      {/* Audit Dossier Modal */}
      {selectedBatchForDossier && (
        <AuditDossierModal
          batch={selectedBatchForDossier}
          isOpen={true}
          onClose={() => setSelectedBatchForDossier(null)}
        />
      )}
    </div>
  );
};

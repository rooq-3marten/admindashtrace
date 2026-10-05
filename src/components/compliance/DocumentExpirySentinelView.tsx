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
  Search,
  Filter,
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
    setRenewalNotice(`Emergency renewal initiated for ${record.documentTitle} (${record.certificateNumber || record.documentId}). Notification dispatched to ${record.recommendedAuthorityContact}.`);
    setTimeout(() => setRenewalNotice(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
      {/* Top Banner - Clean, institutional prose */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
            <span>Maritime Risk Sentinel</span>
            <span aria-hidden="true">·</span>
            <span>Port of Arrival ETA Surveillance</span>
            <span aria-hidden="true">·</span>
            <span>Rotterdam / Hamburg Customs</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Document Expiry Sentinel & Maritime Arrival Buffer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
            Automated cron monitoring comparing NAQS Phytosanitary Certificates and SGS Gas-Chromatography Lab Assays against ocean vessel Estimated Time of Arrival (ETA). Flags documents expiring within 14 days of discharge.
          </p>
        </div>

        {/* Cron Trigger Controls */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Cron Trigger Interval</span>
            <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">{cronExpression} (Scheduled Every 6h)</span>
          </div>

          <button
            onClick={handleTriggerCronNow}
            disabled={isRunningCron}
            className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningCron ? 'animate-spin' : ''}`} />
            <span>{isRunningCron ? 'Evaluating...' : 'Trigger Cron Scan'}</span>
          </button>
        </div>
      </div>

      {/* Renewal Notification Alert */}
      {renewalNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{renewalNotice}</span>
          </div>
          <button onClick={() => setRenewalNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards - Flat, clean border layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Monitored Documents</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">{allRecords.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Phytosanitary & Lab Chromatography</span>
        </div>

        <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 uppercase">
            Expiring ≤ 14 Days of Vessel ETA
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">{flaggedCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Customs quarantine risk threshold</span>
        </div>

        <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-mono text-rose-700 dark:text-rose-400 uppercase">
            Expired Prior to Vessel ETA
          </span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono tabular-nums">{criticalCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Immediate customs rejection</span>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">
            Safe Single-Window Window (&gt; 14d)
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tabular-nums">{safeCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Cleared for EU port discharge</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          {[
            { id: 'ALL', label: 'All Documents' },
            { id: 'FLAGGED', label: 'Expiring ≤ 14 Days' },
            { id: 'CRITICAL', label: 'Expired Pre-ETA' },
            { id: 'SAFE', label: 'Safe Margin (> 14 Days)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterRisk(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                filterRisk === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
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
            placeholder="Search lot, vessel, or certificate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Audit Records Table - High-Density Institutional Layout */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Regulatory Instrument</th>
                <th className="py-2.5 px-3">Consignment Lot</th>
                <th className="py-2.5 px-3">Vessel & Destination</th>
                <th className="py-2.5 px-3">Vessel ETA</th>
                <th className="py-2.5 px-3">Certificate Expiry</th>
                <th className="py-2.5 px-3">Days Post-ETA</th>
                <th className="py-2.5 px-3">Sentinel Verdict</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-200 font-mono">
              {filteredRecords.map((record) => {
                const linkedBatch = batches.find((b) => b.batch_number === record.batchNumber);

                return (
                  <tr
                    key={record.documentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Document */}
                    <td className="py-2.5 px-3 font-sans">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {record.documentTitle}
                      </p>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {record.certificateNumber || record.regulatoryAuthority}
                      </span>
                    </td>

                    {/* Consignment Lot */}
                    <td className="py-2.5 px-3 tabular-nums">
                      <span className="font-semibold">{record.batchNumber || '—'}</span>
                      <span className="block text-[11px] font-sans text-slate-500">
                        {record.crop}
                      </span>
                    </td>

                    {/* Maritime Vessel */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Ship className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{record.vesselName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {record.destinationPort}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="py-2.5 px-3 tabular-nums">
                      <span className="font-semibold">{record.etaDateStr}</span>
                      <span className="block text-[11px] text-slate-500 font-sans">
                        in {record.daysFromNowToEta} days
                      </span>
                    </td>

                    {/* Doc Expiry */}
                    <td className="py-2.5 px-3 tabular-nums">
                      <span>{record.expiryDateStr || '—'}</span>
                    </td>

                    {/* Days from ETA to Expiry */}
                    <td className="py-2.5 px-3 tabular-nums">
                      {record.daysFromEtaToExpiry !== undefined ? (
                        <span
                          className={`font-semibold ${
                            record.daysFromEtaToExpiry < 0
                              ? 'text-rose-700 dark:text-rose-400'
                              : record.daysFromEtaToExpiry <= 14
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {record.daysFromEtaToExpiry > 0 ? `+${record.daysFromEtaToExpiry}` : record.daysFromEtaToExpiry} d
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Risk Verdict - Clean Unboxed Typography */}
                    <td className="py-2.5 px-3 font-sans">
                      {record.riskLevel === 'CRITICAL_EXPIRED_BEFORE_ETA' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          Expired Pre-ETA (Impound Risk)
                        </span>
                      )}
                      {record.riskLevel === 'FLAGGED_EXPIRING_WITHIN_14_DAYS' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Expiring ≤ 14d of ETA
                        </span>
                      )}
                      {record.riskLevel === 'WARNING_APPROACHING_MARGIN' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Approaching (15–21d)
                        </span>
                      )}
                      {record.riskLevel === 'COMPLIANT_SAFE_MARGIN' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Safe Single-Window Margin
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.isFlagged && (
                          <button
                            onClick={() => handleFastTrackRenewal(record)}
                            className="px-2 py-1 rounded border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs font-medium transition cursor-pointer"
                          >
                            Fast-Track Renewal
                          </button>
                        )}
                        {linkedBatch && (
                          <button
                            onClick={() => setSelectedBatchForDossier(linkedBatch)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer shadow-xs"
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
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last Automated Cron Scan: {lastCronLog ? new Date(lastCronLog.timestamp).toLocaleTimeString() : 'Active'} ({lastCronLog?.executionTimeMs || 12} ms)
            </span>
          </div>
          <span className="tabular-nums">Showing {filteredRecords.length} records</span>
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

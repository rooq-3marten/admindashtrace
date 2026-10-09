import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Activity,
  Server,
  Database,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  X,
  FileCode,
} from 'lucide-react';

export const SystemHealthDashboard: React.FC = () => {
  const { syncLogs, farmers, batches } = useData();

  const [selectedError, setSelectedError] = useState<{
    time: string;
    error: string;
    details: string;
  } | null>(null);

  const requestRate = (syncLogs.length * 28 + farmers.length * 4 + batches.length * 8 + 112).toLocaleString();

  const recentErrors = [
    {
      time: '14:32',
      error: 'Sync failed for agent Musa I. (timeout)',
      details: 'HTTP POST /api/v1/sync/upstream timed out after 30000ms. Device AGENT-NG-042 experienced 2G packet loss in Dambatta sector. Auto-retry scheduled.',
    },
    {
      time: '13:15',
      error: 'USSD session dropped (gateway error)',
      details: 'MTN Nigeria USSD gateway returned service unavailable 503 for session #390124. Session state preserved in Redis queue.',
    },
    {
      time: '11:47',
      error: 'SMS delivery failed to +2348034512991',
      details: 'Airtel Africa SMPP route failed: Handset unreachable (subscriber out of coverage area in Benue cluster).',
    },
    {
      time: '09:22',
      error: 'API 500 error on POST /batches',
      details: 'Constraint violation on duplicate consignment passport hash check. Handled by fallback idempotency lock.',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            System Health & Fleet Gateway Telemetry
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Real-time infrastructure performance, USSD/SMS gateway routes, database latency, and upstream ingestion pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            Core Ingestion Online
          </span>
        </div>
      </div>

      {/* Grid: 4 Core Health Metric Panels (Spec Section 7.4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: API Performance */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
              API PERFORMANCE
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Avg response:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">142ms</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">P95 response:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">380ms</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Error rate:</span>
              <p className="text-base font-bold text-[#16A34A] font-mono">0.3%</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Requests/min:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">{requestRate}</p>
            </div>
          </div>

          {/* Sparkline Graphic */}
          <div className="pt-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155] flex items-end justify-between h-14 gap-1">
              {[20, 35, 28, 55, 75, 90, 100, 85, 70, 50, 40, 25, 18, 30, 45, 60, 80, 65, 45, 30].map(
                (h, idx) => (
                  <div
                    key={idx}
                    className="w-full bg-[#1B7F4B] rounded-t-xs hover:bg-[#145C36] transition cursor-pointer"
                    style={{ height: `${h}%` }}
                    title={`Bucket ${idx + 1}: ${Math.round(h * 1.5)} req/s`}
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Sync Health */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
              SYNC HEALTH
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Success rate:</span>
              <p className="text-base font-bold text-[#16A34A] font-mono">97.2%</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Failed syncs:</span>
              <p className="text-base font-bold text-[#F59E0B] font-mono">23</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Retry queue:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">5</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Avg retry:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">1.4</p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="pt-2 space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div className="bg-[#16A34A] h-full" style={{ width: '97.2%' }} />
              <div className="bg-[#F59E0B] h-full" style={{ width: '2.8%' }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
              <span>97.2% Ingested</span>
              <span>2.8% Retried</span>
            </div>
          </div>
        </div>

        {/* Panel 3: USSD/SMS Gateway */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
              USSD/SMS GATEWAY
            </h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Operational
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">USSD sessions:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">342</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">SMS sent (24h):</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">1,892</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Delivery rate:</span>
              <p className="text-base font-bold text-[#16A34A] font-mono">99.1%</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Gateway latency:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">890ms</p>
            </div>
          </div>
        </div>

        {/* Panel 4: Database */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
              DATABASE
            </h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Healthy
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Connections:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">45/100</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Disk usage:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">62%</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Replication:</span>
              <p className="text-base font-bold text-[#16A34A] font-mono">12ms</p>
            </div>
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Last backup:</span>
              <p className="text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono">2 hours ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ERRORS (Last 24 Hours) Table (Spec Section 7.4) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
            RECENT ERRORS (Last 24 Hours)
          </h3>
          <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            {recentErrors.length} events logged
          </span>
        </div>

        <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-xs">
          {recentErrors.map((err, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[#6B7280] dark:text-[#94A3B8] text-[11px] w-12">
                  {err.time}
                </span>
                <span className="font-medium text-[#111827] dark:text-[#F1F5F9]">
                  {err.error}
                </span>
              </div>
              <button
                onClick={() => setSelectedError(err)}
                className="px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-[#1B7F4B] dark:text-emerald-400 transition cursor-pointer"
              >
                [Details]
              </button>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs">
          <button
            onClick={() => {
              const fullDiagnostics = {
                timestamp: new Date().toISOString(),
                recentErrors,
                apiMetrics: { avgResponseMs: 142, p95Ms: 380, errorRate: '0.3%', reqMin: requestRate },
                database: { connections: '45/100', diskUsage: '62%', replicationLag: '12ms' },
                syncHealth: { totalSyncs: syncLogs.length, successRate: '97.2%' }
              };
              const blob = new Blob([JSON.stringify(fullDiagnostics, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `system_diagnostics_full_${Date.now()}.json`;
              a.click();
            }}
            className="text-[#1B7F4B] dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
          >
            [Download Full Diagnostics]
          </button>
          <button
            onClick={() => {
              const csv = `Time,Error\n${recentErrors.map((e) => `"${e.time}","${e.error}"`).join('\n')}`;
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `system_errors_${Date.now()}.csv`;
              a.click();
            }}
            className="text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] cursor-pointer"
          >
            [Export Errors]
          </button>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#DC2626]" />
                <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
                  Error Diagnostics ({selectedError.time})
                </h3>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                {selectedError.error}
              </p>
              <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                {selectedError.details}
              </pre>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex justify-end">
              <button
                onClick={() => setSelectedError(null)}
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

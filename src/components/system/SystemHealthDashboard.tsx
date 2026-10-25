import React, { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, Warning } from '@phosphor-icons/react';
import { apiFetch } from '../../lib/apiFetch';

// Shape of GET /api/v1/sync/status. Nothing outside these fields is shown as a measured value.
interface SyncStatusResponse {
  status?: string;
  mode?: string;
  server_timestamp_ms?: number;
  last_sync_timestamp_ms?: number;
  counts?: {
    farmers?: number;
    practices?: number;
    batches?: number;
    agents?: number;
    sync_logs?: number;
  };
  latest_event?: {
    id?: string;
    agent_id?: string;
    server_timestamp_ms?: number;
    status?: string;
    message?: string;
  } | null;
}

const REFRESH_MS = 30_000;

const lagosFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function formatMs(ms: number | undefined | null): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return 'Not available';
  return `${lagosFormatter.format(new Date(ms))} WAT`;
}

const NOT_MONITORED = [
  { title: 'API performance', items: ['Average and P95 response time', 'Error rate', 'Requests per minute'] },
  { title: 'USSD / SMS gateway', items: ['USSD sessions', 'SMS sent and delivery rate', 'Gateway latency'] },
  { title: 'Database', items: ['Connections', 'Disk usage', 'Replication', 'Last backup'] },
];

type LoadState = 'loading' | 'ready' | 'error';

export const SystemHealthDashboard: React.FC = () => {
  const [data, setData] = useState<SyncStatusResponse | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    try {
      const res = await apiFetch('/api/v1/sync/status');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `The server could not return sync status (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as SyncStatusResponse;
      setData(json);
      setFetchedAt(Date.now());
      setErrorMessage('');
      setState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not reach the server.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = data?.counts;
  const latest = data?.latest_event ?? null;
  const card =
    'p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-4';
  const heading = 'font-semibold text-xs uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]';
  const label = 'text-[#6B7280] dark:text-[#94A3B8]';
  const value = 'text-base font-bold text-[#111827] dark:text-[#F1F5F9] font-mono';

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">System Health</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Values reported by the sync service. Anything the platform does not measure is marked “Not monitored”.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]" aria-live="polite">
            {fetchedAt ? `Checked ${formatMs(fetchedAt)}` : ''}
          </span>
          <button
            type="button"
            onClick={() => load()}
            disabled={state === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B7F4B]"
          >
            <ArrowClockwise size={14} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {state === 'loading' && !data && (
        <div role="status" className="p-10 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
          Loading sync status…
        </div>
      )}

      {state === 'error' && (
        <div role="alert" className="p-5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] dark:bg-red-950/30 dark:border-red-900 space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#B91C1C] dark:text-red-300">
            <Warning size={16} weight="bold" aria-hidden="true" />
            Error: sync status is unavailable
          </p>
          <p className="text-xs text-[#7F1D1D] dark:text-red-200">{errorMessage}</p>
          {data && <p className="text-xs text-[#7F1D1D] dark:text-red-200">The figures below are from the last successful check and may be out of date.</p>}
          <button
            type="button"
            onClick={() => load()}
            className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B7F4B]"
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className={card} aria-labelledby="sh-sync">
            <h3 id="sh-sync" className={`${heading} pb-3 border-b border-[#E5E7EB] dark:border-[#334155]`}>
              Sync service
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className={label}>Status reported by server</dt>
                <dd className={value}>{data.status || 'Not available'}</dd>
              </div>
              <div>
                <dt className={label}>Mode</dt>
                <dd className={value}>{data.mode || 'Not available'}</dd>
              </div>
              <div className="col-span-2">
                <dt className={label}>Last sync event</dt>
                <dd className={value}>{latest ? formatMs(data.last_sync_timestamp_ms) : 'No sync events recorded yet'}</dd>
              </div>
              <div className="col-span-2">
                <dt className={label}>Server time</dt>
                <dd className={value}>{formatMs(data.server_timestamp_ms)}</dd>
              </div>
            </dl>
          </section>

          <section className={card} aria-labelledby="sh-counts">
            <h3 id="sh-counts" className={`${heading} pb-3 border-b border-[#E5E7EB] dark:border-[#334155]`}>
              Records on the server
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              {([
                ['Farmers', counts?.farmers],
                ['Practice logs', counts?.practices],
                ['Batches', counts?.batches],
                ['Agents', counts?.agents],
                ['Sync events', counts?.sync_logs],
              ] as [string, number | undefined][]).map(([name, n]) => (
                <div key={name}>
                  <dt className={label}>{name}</dt>
                  <dd className={value}>{typeof n === 'number' ? n.toLocaleString('en-NG') : 'Not available'}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={`${card} md:col-span-2`} aria-labelledby="sh-latest">
            <h3 id="sh-latest" className={`${heading} pb-3 border-b border-[#E5E7EB] dark:border-[#334155]`}>
              Latest sync event
            </h3>
            {latest ? (
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <dt className={label}>Time</dt>
                  <dd className="font-mono text-[#111827] dark:text-[#F1F5F9]">{formatMs(latest.server_timestamp_ms)}</dd>
                </div>
                <div>
                  <dt className={label}>Agent</dt>
                  <dd className="font-mono text-[#111827] dark:text-[#F1F5F9]">{latest.agent_id || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt className={label}>Result</dt>
                  <dd className="font-mono text-[#111827] dark:text-[#F1F5F9]">{latest.status || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt className={label}>Message</dt>
                  <dd className="font-mono text-[#111827] dark:text-[#F1F5F9]">{latest.message || 'Not recorded'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">No sync events have been recorded yet.</p>
            )}
          </section>

          {NOT_MONITORED.map((panel) => (
            <section key={panel.title} className={card} aria-labelledby={`sh-${panel.title.replace(/[^a-z]+/gi, '-').toLowerCase()}`}>
              <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
                <h3 id={`sh-${panel.title.replace(/[^a-z]+/gi, '-').toLowerCase()}`} className={heading}>
                  {panel.title}
                </h3>
                <span className="text-xs font-semibold text-[#4B5563] dark:text-[#94A3B8]">Not monitored</span>
              </div>
              <ul className="text-xs text-[#6B7280] dark:text-[#94A3B8] space-y-1 list-disc pl-4">
                {panel.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

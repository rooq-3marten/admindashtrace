import React, { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';
import { apiFetch } from '../../lib/apiFetch';

interface AccessLog {
  id: string;
  email: string | null;
  event: string;
  result_code: string | null;
  ip: string | null;
  created_at: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  sign_in: 'Signed in',
  sign_in_rejected: 'Sign-in rejected',
  sign_out: 'Signed out',
};

const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'medium' });

function formatLagos(iso: string | null): string {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Not recorded' : `${formatter.format(d)} WAT`;
}

/** Administrator sign-ins, rejected sign-ins and sign-outs, newest first. */
export const AdminSignInLog: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await apiFetch('/api/v1/admin/access-logs?limit=200');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `The server could not return the sign-in log (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('The server returned an unexpected response for the sign-in log.');
      setLogs(data as AccessLog[]);
      setState('ready');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The sign-in log could not be loaded.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section aria-labelledby="admin-signin-heading" className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="admin-signin-heading" className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">Administrator sign-ins</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Who signed in to this control center, who was refused, and from which address.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1D5DB] dark:border-[#334155] text-xs font-medium text-[#374151] dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
        >
          <ArrowClockwise size={14} />
          Refresh
        </button>
      </div>

      {state === 'loading' && <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]" role="status">Loading sign-in log…</p>}
      {state === 'error' && <p role="alert" className="text-xs text-[#A63A2E]">{message}</p>}
      {state === 'ready' && logs.length === 0 && (
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">No sign-ins have been recorded yet.</p>
      )}
      {state === 'ready' && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-[#334155]">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Administrator sign-in events, newest first</caption>
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="py-3 px-4">Time (Africa/Lagos)</th>
                <th scope="col" className="py-3 px-4">Account</th>
                <th scope="col" className="py-3 px-4">Event</th>
                <th scope="col" className="py-3 px-4">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="py-3 px-4 font-mono text-[#4B5563] dark:text-[#94A3B8] whitespace-nowrap">{formatLagos(l.created_at)}</td>
                  <td className="py-3 px-4">{l.email || 'Unverified account'}</td>
                  <td className="py-3 px-4">
                    {EVENT_LABELS[l.event] || l.event}
                    {l.result_code && <span className="block font-mono text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{l.result_code}</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#4B5563] dark:text-[#94A3B8]">{l.ip || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

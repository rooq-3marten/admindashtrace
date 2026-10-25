import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ArrowClockwise, Warning, Info } from '@phosphor-icons/react';
import { apiFetch } from '../../lib/apiFetch';
import { AgentAuditLog } from '../../types';

const FETCH_LIMIT = 500;

const ACTION_LABELS: Record<string, string> = {
  self_register: 'Self-registered',
  approve: 'Approved',
  reject: 'Rejected',
  suspend: 'Suspended',
  reinstate: 'Reinstated',
  profile_update: 'Profile updated',
};

const lagosFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function formatLagos(iso: string | null | undefined): string {
  if (!iso) return 'Not recorded';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return `${lagosFormatter.format(date)} WAT`;
}

function describeDetails(log: AgentAuditLog): string {
  const d = (log.details || {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (d.from_status && d.to_status) parts.push(`${d.from_status} → ${d.to_status}`);
  else if (d.status) parts.push(`status: ${d.status}`);
  if (d.rejection_reason) parts.push(`rejection reason: ${d.rejection_reason}`);
  if (d.reason) parts.push(`reason: ${d.reason}`);
  if (d.reviewed_by) parts.push(`reviewed by ${d.reviewed_by}`);
  if (d.association) parts.push(`association: ${d.association}`);
  return parts.length > 0 ? parts.join(' · ') : 'No further details recorded';
}

// Neutralise spreadsheet formula injection and quote every cell.
function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

type LoadState = 'loading' | 'ready' | 'error';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AgentAuditLog[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Fetched here (not from the shared DataContext list) because the context list is replaced by a
  // single-agent list whenever an agent's detail panel is opened on the Pending Agents screen.
  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      const res = await apiFetch(`/api/v1/admin/agent-audit-logs?limit=${FETCH_LIMIT}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `The server could not return the audit trail (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('The server returned an unexpected response for the audit trail.');
      }
      setLogs(data as AgentAuditLog[]);
      setState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not reach the server.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>(Object.keys(ACTION_LABELS));
    logs.forEach((l) => set.add(l.action));
    return Array.from(set);
  }, [logs]);

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.target_agent_id) map.set(l.target_agent_id, l.target_agent_name || l.target_agent_id);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const visible = useMemo(
    () =>
      logs.filter(
        (l) =>
          (actionFilter === 'all' || l.action === actionFilter) &&
          (agentFilter === 'all' || l.target_agent_id === agentFilter)
      ),
    [logs, actionFilter, agentFilter]
  );

  const exportCsv = () => {
    const header = ['Audit ID', 'Time (Africa/Lagos)', 'Actor', 'Action', 'Target agent ID', 'Target agent', 'Details'];
    const rows = visible.map((l) => [
      l.id,
      formatLagos(l.created_at as unknown as string),
      l.actor_name || l.actor_id,
      ACTION_LABELS[l.action] || l.action,
      l.target_agent_id,
      l.target_agent_name || '',
      describeDetails(l),
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traceharvest_agent_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtersActive = actionFilter !== 'all' || agentFilter !== 'all';
  const selectClass =
    'px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs text-[#111827] dark:text-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B7F4B]';
  const buttonFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B7F4B]';

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">Agent Audit Trail</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Record of field-agent registrations and administrator review actions, as stored by the server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={state === 'loading'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-60 ${buttonFocus}`}
          >
            <ArrowClockwise size={14} aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B7F4B] text-white hover:bg-[#145C36] text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${buttonFocus}`}
          >
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-action-filter" className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Action
          </label>
          <select id="audit-action-filter" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectClass}>
            <option value="all">All actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-agent-filter" className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Agent
          </label>
          <select id="audit-agent-filter" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={selectClass}>
            <option value="all">All agents</option>
            {agentOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name === id ? id : `${name} (${id})`}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setActionFilter('all');
              setAgentFilter('all');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer ${buttonFocus}`}
          >
            Clear filters
          </button>
        )}
        <p className="sm:ml-auto text-xs text-[#6B7280] dark:text-[#94A3B8]" aria-live="polite">
          {state === 'ready' ? `Showing ${visible.length} of ${logs.length} events` : ''}
        </p>
      </div>

      {state === 'ready' && logs.length >= FETCH_LIMIT && (
        <p className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
          <Info size={14} aria-hidden="true" />
          Only the latest {FETCH_LIMIT} events are loaded. Older events exist on the server.
        </p>
      )}

      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        {state === 'loading' && (
          <div role="status" className="py-12 px-4 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Loading audit trail…
          </div>
        )}

        {state === 'error' && (
          <div role="alert" className="py-10 px-4 text-center space-y-3">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#B91C1C] dark:text-red-400">
              <Warning size={16} weight="bold" aria-hidden="true" />
              Error: the audit trail could not be loaded
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{errorMessage}</p>
            <button
              type="button"
              onClick={load}
              className={`px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold cursor-pointer ${buttonFocus}`}
            >
              Try again
            </button>
          </div>
        )}

        {state === 'ready' && visible.length === 0 && (
          <div className="py-12 px-4 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
            {logs.length === 0 ? 'No audit events have been recorded yet.' : 'No events match the selected filters.'}
          </div>
        )}

        {state === 'ready' && visible.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Agent registration and review events, newest first</caption>
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Time (Africa/Lagos)</th>
                  <th scope="col" className="py-3 px-4">Actor</th>
                  <th scope="col" className="py-3 px-4">Action</th>
                  <th scope="col" className="py-3 px-4">Target agent</th>
                  <th scope="col" className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
                {visible.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                    <td className="py-3.5 px-4 font-mono text-[#4B5563] dark:text-[#94A3B8] whitespace-nowrap">
                      {formatLagos(l.created_at as unknown as string)}
                    </td>
                    <td className="py-3.5 px-4 font-medium">{l.actor_name || l.actor_id || 'Unknown'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md border border-[#1B7F4B] text-[11px] font-semibold text-[#14532D] dark:text-emerald-300 dark:border-emerald-700">
                        {ACTION_LABELS[l.action] || l.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium">{l.target_agent_name || l.target_agent_id}</span>
                      {l.target_agent_name && (
                        <span className="block font-mono text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{l.target_agent_id}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#4B5563] dark:text-[#94A3B8]">{describeDetails(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

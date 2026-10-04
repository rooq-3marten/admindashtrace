import React from 'react';
import { History, Shield, Download, Filter, Search } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const auditEntries: {
    id: string; timestamp: string; actor: string; action: string;
    resource: string; reason: string; status: string; ip: string;
  }[] = [];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Cryptographic Audit Trail
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Immutable, non-repudiable log of all administrative overrides, batch certifications, and upstream mobile syncs.
          </p>
        </div>
        <button
          onClick={() => {
            let csv = 'Audit ID,Timestamp (UTC),Operator,Action,Target Resource,Justification,Status,Client IP\n';
            auditEntries.forEach((a) => {
              csv += `"${a.id}","${a.timestamp}","${a.actor}","${a.action}","${a.resource}","${a.reason}","${a.status}","${a.ip}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `traceharvest_audit_trail_${Date.now()}.csv`;
            link.click();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B7F4B] text-white hover:bg-[#145C36] text-xs font-semibold transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export Audit Trail
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Justification / Reason</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {auditEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-[#6B7280] dark:text-[#94A3B8]">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
              {auditEntries.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-mono font-semibold">
                    {a.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6B7280] dark:text-[#94A3B8]">
                    {a.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    {a.actor}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-[#1B7F4B] dark:text-emerald-400">
                    {a.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {a.resource}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B7280] dark:text-[#94A3B8]">
                    {a.reason}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-[#F1F5F9]">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

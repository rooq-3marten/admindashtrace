import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Key,
  ShieldAlert,
  Sparkles,
  Users,
  Fingerprint,
} from 'lucide-react';

export const RbacManagement: React.FC = () => {
  const { role, userProfile, switchRole, currentUser, canManageRoles } = useAuth();

  const permissionsMatrix = [
    {
      action: 'View Real-Time Dashboard & Analytics',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: true,
      inspector: true,
    },
    {
      action: 'View GIS Farm Plots & EUDR Polygons',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: true,
      inspector: true,
    },
    {
      action: 'Export Regulatory Smallholder CSVs',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: true,
      inspector: true,
    },
    {
      action: 'Simulate & Ingest Mobile Field Syncs',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: true,
      inspector: true,
    },
    {
      action: 'Audit & Flag Agrochemical PHI Practices',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: false,
      inspector: false,
    },
    {
      action: 'Assemble & Certify Export Consignments',
      super_admin: true,
      compliance_officer: true,
      fleet_manager: false,
      inspector: false,
    },
    {
      action: 'Assign Field Agent Corridors & Manage Fleet',
      super_admin: true,
      compliance_officer: false,
      fleet_manager: true,
      inspector: false,
    },
    {
      action: 'Delete Records & Modify RBAC Privileges',
      super_admin: true,
      compliance_officer: false,
      fleet_manager: false,
      inspector: false,
    },
  ];

  const roles = [
    {
      id: 'super_admin' as UserRole,
      title: 'Super Admin',
      badge: 'All Permissions',
      desc: 'Platform governance, database security rules, system administration & full audit overrides.',
      color: 'border-purple-800 bg-purple-950/40 text-purple-300',
    },
    {
      id: 'compliance_officer' as UserRole,
      title: 'Compliance Officer (NAFDAC / EUDR)',
      badge: 'Regulatory Certifier',
      desc: 'Reviews good agricultural practices, manages chemical PHI holds, and issues export certifications.',
      color: 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
    },
    {
      id: 'fleet_manager' as UserRole,
      title: 'Fleet Operations Manager',
      badge: 'Field Ops',
      desc: 'Monitors Android field agents, offline sync queues, enumerator battery levels, and regional coverage.',
      color: 'border-blue-800 bg-blue-950/40 text-blue-300',
    },
    {
      id: 'inspector' as UserRole,
      title: 'Customs & Port Inspector',
      badge: 'Read-Only Verification',
      desc: 'Scans provenance QR passports, inspects consignment smallholder lots, and performs dock audits.',
      color: 'border-amber-800 bg-amber-950/40 text-amber-300',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-semibold">
            Security & ABAC Architecture
          </span>
          <span className="text-xs text-[#6B7280] dark:text-slate-400 font-mono">Zero-Trust Firestore & Role-Based Access Control</span>
        </div>
        <h2 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight">Role-Based Access Control (RBAC) Management</h2>
        <p className="text-sm text-[#6B7280] dark:text-slate-400 max-w-2xl mt-0.5">
          Fine-grained permission gating safeguarding sensitive export clearances, agrochemical audit logs, and farmer identities.
        </p>
      </div>

      {/* Active User Security Identity Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[#6B7280] dark:text-slate-400 font-semibold">Active Authentication Principal</span>
              <h3 className="text-base font-bold text-[#111827] dark:text-white">{userProfile.displayName}</h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 font-mono">{userProfile.email}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-[#6B7280] dark:text-slate-400 font-semibold">Active Role</span>
            <div className="text-sm font-bold text-[#1B7F4B] dark:text-emerald-400 font-mono uppercase">{role}</div>
            <span className="text-[10px] text-[#6B7280] dark:text-slate-400">{userProfile.agency}</span>
          </div>
        </div>
      </div>

      {/* Role Emulation / Switcher Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
          Interactive Role Switcher (Test As Any Role)
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400">
          Switch roles instantly to experience how permissions adapt across the application interface:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isSelected = role === r.id;

            return (
              <div
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/60 dark:bg-slate-900 border-[#1B7F4B] dark:border-emerald-500 shadow-sm ring-1 ring-[#1B7F4B] dark:ring-emerald-500'
                    : 'bg-white dark:bg-slate-950/60 border-[#E5E7EB] dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#111827] dark:text-white text-sm">{r.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">{r.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#E5E7EB] dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-[#6B7280] dark:text-slate-500">
                    {isSelected ? '✓ CURRENTLY ACTIVE' : 'CLICK TO EMULATE'}
                  </span>
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-[#1B7F4B] dark:text-emerald-400' : 'text-[#6B7280] dark:text-slate-400'}`}>
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#111827] dark:text-white">Role Permission Matrix</h3>
          <p className="text-xs text-[#6B7280] dark:text-slate-400">Enforced synchronously both on frontend actions and in backend Firestore ABAC rules</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-[#6B7280] dark:text-slate-400 font-mono uppercase text-[11px] border-b border-[#E5E7EB] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Action / System Capability</th>
                <th className="py-3 px-3 text-center">Super Admin</th>
                <th className="py-3 px-3 text-center">Compliance</th>
                <th className="py-3 px-3 text-center">Fleet Manager</th>
                <th className="py-3 px-3 text-center">Customs Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800/80 text-[#111827] dark:text-slate-300">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-[#111827] dark:text-white">{row.action}</td>
                  <td className="py-3 px-3 text-center">
                    {row.super_admin ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.compliance_officer ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.fleet_manager ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.inspector ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 mx-auto" />
                    )}
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

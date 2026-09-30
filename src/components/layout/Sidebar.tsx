import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileSpreadsheet,
  Boxes,
  Truck,
  MapPin,
  AlertTriangle,
  Flag,
  Scale,
  Shield,
  Briefcase,
  Activity,
  History,
  Smartphone,
  BarChart3,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export type TabType =
  | 'dashboard'
  | 'fleet'
  | 'farmers'
  | 'phi_sentinel'
  | 'batches'
  | 'shipments'
  | 'gis_map'
  | 'data_quality'
  | 'flags'
  | 'disputes'
  | 'rbac'
  | 'exporters'
  | 'system_health'
  | 'audit_log'
  | 'mobile_guide'
  | 'reports'
  | 'exports';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { role, userProfile } = useAuth();
  const { stats, disputes, batches } = useData();

  const handleNavClick = (tab: TabType) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const pendingBatchesCount = batches.filter((b) => b.export_clearance_status === 'PENDING_CLEARANCE').length || 3;
  const activeDisputesCount = disputes.filter((d) => d.status === 'Open').length || 2;

  const sections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'fleet' as TabType, label: 'Agents', icon: UserCheck, badge: `${stats.activeAgentsCount || 5}` },
        { id: 'farmers' as TabType, label: 'Farmers', icon: Users, badge: stats.totalFarmers ? `${stats.totalFarmers}` : undefined },
        { id: 'phi_sentinel' as TabType, label: 'Practice Logs', icon: FileSpreadsheet, badge: stats.activePhiHolds > 0 ? `${stats.activePhiHolds} PHI` : undefined },
        { id: 'batches' as TabType, label: 'Batches', icon: Boxes, badge: `${pendingBatchesCount}` },
        { id: 'shipments' as TabType, label: 'Shipments', icon: Truck, badge: `${stats.totalShipmentsInTransit || 1}` },
        { id: 'gis_map' as TabType, label: 'GIS Farm Plots', icon: MapPin, badge: 'EUDR' },
      ],
    },
    {
      title: 'QUALITY',
      items: [
        { id: 'data_quality' as TabType, label: 'Data Gaps', icon: AlertTriangle, badge: '8', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' },
        { id: 'flags' as TabType, label: 'Flags', icon: Flag, badge: `${stats.flaggedPractices || 5}`, badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300' },
        { id: 'disputes' as TabType, label: 'Disputes', icon: Scale, badge: `${activeDisputesCount}`, badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300' },
      ],
    },
    {
      title: 'USERS',
      items: [
        { id: 'rbac' as TabType, label: 'Admin Users', icon: Shield },
        { id: 'exporters' as TabType, label: 'Exporters', icon: Briefcase },
        { id: 'fleet' as TabType, label: 'Agents Roster', icon: Users },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'system_health' as TabType, label: 'Sync Health', icon: Activity },
        { id: 'audit_log' as TabType, label: 'Audit Log', icon: History },
        { id: 'mobile_guide' as TabType, label: 'Mobile Linking', icon: Smartphone, badge: 'v1.0' },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'reports' as TabType, label: 'Reports', icon: BarChart3 },
        { id: 'exports' as TabType, label: 'Exports', icon: Download },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Fixed 240px Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[240px] bg-white dark:bg-[#0F172A] border-r border-[#E5E7EB] dark:border-[#334155] flex flex-col shrink-0 transition-transform duration-200 md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1B7F4B] text-white font-bold text-base shadow-sm">
            🌾
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-[#111827] dark:text-[#F1F5F9]">
              TraceHarvest
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] dark:text-[#94A3B8] leading-none">
              Admin Portal
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map((sec, secIdx) => (
            <div key={sec.title} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-[#6B7280] dark:text-[#94A3B8]">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id + (item.label || '')}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] font-medium transition cursor-pointer text-left ${
                        isActive
                          ? 'border-l-[3px] border-[#1B7F4B] text-[#1B7F4B] dark:text-emerald-400 bg-[#E8F5EE] dark:bg-emerald-950/30 font-semibold'
                          : 'text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#1B7F4B] dark:text-emerald-400' : 'text-[#6B7280] dark:text-[#94A3B8]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                            item.badgeColor ||
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom System Status Indicator (Spec Section 5) */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#334155] bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-xs font-medium text-[#111827] dark:text-[#F1F5F9]">
                System Healthy
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
              v1.2.4
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

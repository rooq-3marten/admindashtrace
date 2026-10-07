import React from 'react';
import {
  House,
  Users,
  UserCheck,
  FileText,
  Package,
  Truck,
  MapPin,
  Warning,
  Flag,
  Scales,
  ShieldCheck,
  Briefcase,
  Pulse,
  ClockCounterClockwise,
  DeviceMobile,
  ChartBar,
  DownloadSimple,
  Tree,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BrandLogo } from '../common/BrandLogo';

export type TabType =
  | 'dashboard'
  | 'fleet'
  | 'farmers'
  | 'phi_sentinel'
  | 'batches'
  | 'documents'
  | 'shipments'
  | 'gis_map'
  | 'eudr_engine'
  | 'expiry_sentinel'
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

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; weight?: any }>;
  badge?: string;
  badgeType?: 'count' | 'warning' | 'error' | 'eudr';
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { stats, disputes, batches, qualityAlerts, documents } = useData();

  const handleNavClick = (tab: TabType) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const pendingBatchesCount = batches.filter((b) => b.export_clearance_status === 'PENDING_CLEARANCE').length;
  const pendingDocsCount = (documents || []).filter((d) => d.verification_status === 'PENDING_REVIEW').length;
  const activeDisputesCount = disputes.filter((d) => d.status === 'Open').length;
  const totalGapsCount = qualityAlerts?.length || 0;

  const sections: SidebarSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard' as TabType, label: 'Overview', icon: House },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'fleet' as TabType, label: 'Field Agents', icon: UserCheck, badge: `${stats.activeAgentsCount}`, badgeType: 'count' },
        { id: 'farmers' as TabType, label: 'Farmers Enrolled', icon: Users, badge: stats.totalFarmers > 0 ? `${stats.totalFarmers}` : undefined, badgeType: 'count' },
        { id: 'phi_sentinel' as TabType, label: 'Practice Logs', icon: FileText, badge: stats.activePhiHolds > 0 ? `${stats.activePhiHolds} PHI` : undefined, badgeType: 'warning' },
        { id: 'batches' as TabType, label: 'Export Batches', icon: Package, badge: pendingBatchesCount > 0 ? `${pendingBatchesCount}` : undefined, badgeType: 'warning' },
        { id: 'documents' as TabType, label: 'Customs Vault', icon: FileText, badge: pendingDocsCount > 0 ? `${pendingDocsCount} Review` : `${documents?.length || 0}`, badgeType: pendingDocsCount > 0 ? 'warning' : 'count' },
        { id: 'shipments' as TabType, label: 'Maritime Cargo', icon: Truck, badge: stats.totalShipmentsInTransit > 0 ? `${stats.totalShipmentsInTransit}` : undefined, badgeType: 'count' },
        { id: 'gis_map' as TabType, label: 'GIS Farm Plots', icon: MapPin, badge: 'EUDR', badgeType: 'eudr' },
        { id: 'eudr_engine' as TabType, label: 'EUDR Engine', icon: Tree, badge: 'Annex II', badgeType: 'eudr' },
        { id: 'expiry_sentinel' as TabType, label: 'Expiry Sentinel', icon: Clock, badge: 'ETA ≤ 14d', badgeType: 'warning' },
      ],
    },
    {
      title: 'QUALITY & COMPLIANCE',
      items: [
        { id: 'data_quality' as TabType, label: 'Needs Attention', icon: Warning, badge: totalGapsCount > 0 ? `${totalGapsCount}` : undefined, badgeType: 'warning' },
        { id: 'flags' as TabType, label: 'Compliance Flags', icon: Flag, badge: stats.flaggedPractices > 0 ? `${stats.flaggedPractices}` : undefined, badgeType: 'error' },
        { id: 'disputes' as TabType, label: 'Farmer Disputes', icon: Scales, badge: activeDisputesCount > 0 ? `${activeDisputesCount}` : undefined, badgeType: 'error' },
      ],
    },
    {
      title: 'PEOPLE & EXPORTERS',
      items: [
        { id: 'rbac' as TabType, label: 'Admin Users', icon: ShieldCheck },
        { id: 'exporters' as TabType, label: 'Commodity Exporters', icon: Briefcase },
      ],
    },
    {
      title: 'SYSTEM & LOGS',
      items: [
        { id: 'system_health' as TabType, label: 'System Health', icon: Pulse },
        { id: 'audit_log' as TabType, label: 'Audit Trail', icon: ClockCounterClockwise },
        { id: 'mobile_guide' as TabType, label: 'Mobile Sync Guide', icon: DeviceMobile },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'reports' as TabType, label: 'Reports', icon: ChartBar },
        { id: 'exports' as TabType, label: 'Data Downloads', icon: DownloadSimple },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Fixed 240px White Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[240px] bg-white dark:bg-[#1A2E23] border-r border-[#E5EBE7] dark:border-[#2D4536] flex flex-col shrink-0 transition-transform duration-200 md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[#E5EBE7] dark:border-[#2D4536] flex items-center shrink-0 bg-white dark:bg-[#1A2E23]">
          <BrandLogo size="md" />
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-[#8A968E] dark:text-[#7A8E80]">
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-[14px] transition cursor-pointer text-left rounded-r-md ${
                        isActive
                          ? 'border-l-[3px] border-[#1A4D2E] dark:border-[#4A8A6A] text-[#1A4D2E] dark:text-white bg-[#EEF5F1] dark:bg-[#243D2F] font-semibold'
                          : 'text-[#5A6B60] dark:text-[#C5D4CB] hover:bg-[#F7F9F7] dark:hover:bg-[#20362A] hover:text-[#1A2E23] dark:hover:text-white font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          size={18}
                          weight={isActive ? 'bold' : 'regular'}
                          className={`shrink-0 ${
                            isActive ? 'text-[#1A4D2E] dark:text-[#D8E8DE]' : 'text-[#8A968E] dark:text-[#7A8E80]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium ${
                            item.badgeType === 'error'
                              ? 'bg-[#FDEEEC] text-[#A63A2E] dark:bg-[#3D1E1B] dark:text-[#FCA5A5]'
                              : item.badgeType === 'warning'
                              ? 'bg-[#FEF7EC] text-[#B8860B] dark:bg-[#3D2F1B] dark:text-[#FCD34D]'
                              : item.badgeType === 'eudr'
                              ? 'bg-[#EEF5F1] text-[#1A4D2E] dark:bg-[#1E382A] dark:text-[#86EFAC]'
                              : 'bg-[#F7F9F7] text-[#5A6B60] dark:bg-[#243D2F] dark:text-[#C5D4CB]'
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

        {/* Bottom System Health Indicator */}
        <div className="p-3.5 border-t border-[#E5E7EB] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#14261C]">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
              <span className="text-xs font-medium text-[#1A2E23] dark:text-[#E8F0EA]">
                System health: normal
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#8A968E]">
              30s ago
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

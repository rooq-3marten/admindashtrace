import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import { TabType } from './Sidebar';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  LogIn,
  LogOut,
  Building,
  Menu,
  RefreshCw,
  Smartphone,
  X,
  Boxes,
  Users,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenSimulator: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSimulator,
  onToggleMobileMenu,
}) => {
  const { userProfile, role, switchRole, signInWithGoogle, signOut, currentUser } = useAuth();
  const {
    farmers,
    batches,
    shipments,
    isSyncing,
    syncWithMobileBackend,
    liveSyncStatus,
    lastServerSyncTime,
  } = useData();
  const { theme, toggleTheme } = useTheme();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await syncWithMobileBackend(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getPageTitle = (tab: TabType) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'fleet':
        return 'Field Agents';
      case 'farmers':
        return 'Farmers';
      case 'phi_sentinel':
        return 'Practice Logs';
      case 'batches':
        return 'Batches';
      case 'shipments':
        return 'Shipments';
      case 'gis_map':
        return 'GIS Farm Plots';
      case 'data_quality':
        return 'Data Quality';
      case 'flags':
        return 'Quality Flags';
      case 'disputes':
        return 'Disputes';
      case 'rbac':
        return 'Admin Users';
      case 'exporters':
        return 'Exporters';
      case 'system_health':
        return 'System Health';
      case 'audit_log':
        return 'Audit Log';
      case 'mobile_guide':
        return 'Mobile Linking & Android Sync';
      case 'reports':
        return 'Reports';
      case 'exports':
        return 'Exports';
      default:
        return 'Overview';
    }
  };

  // Search Results Grouped by entity
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { farmers: [], batches: [], shipments: [] };

    const matchingFarmers = farmers
      .filter(
        (f) =>
          f.full_name?.toLowerCase().includes(q) ||
          f.official_farmer_id?.toLowerCase().includes(q) ||
          f.phone_number?.includes(q)
      )
      .slice(0, 4);

    const matchingBatches = batches
      .filter(
        (b) =>
          b.batch_number?.toLowerCase().includes(q) ||
          b.crop?.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchingShipments = shipments
      .filter(
        (s) =>
          s.shipment_code?.toLowerCase().includes(q) ||
          s.destination?.toLowerCase().includes(q) ||
          s.vessel_name?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return {
      farmers: matchingFarmers,
      batches: matchingBatches,
      shipments: matchingShipments,
    };
  }, [searchQuery, farmers, batches, shipments]);

  const hasSearchResults =
    searchResults.farmers.length > 0 ||
    searchResults.batches.length > 0 ||
    searchResults.shipments.length > 0;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155] px-4 lg:px-8 flex items-center justify-between">
        {/* Left: Page Title & Last Updated */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="font-semibold text-xl lg:text-2xl text-[#111827] dark:text-[#F1F5F9] tracking-tight">
              {getPageTitle(activeTab)}
            </h1>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Last updated: {Math.max(1, Math.round((Date.now() - lastServerSyncTime) / 60000))} minutes ago
            </p>
          </div>
        </div>

        {/* Center: Live Mobile Fleet Sync Radar */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155] text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#16A34A]" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
            </span>
            <span className="font-mono text-[11px] font-medium text-[#111827] dark:text-[#F1F5F9]">
              {isSyncing ? 'Ingesting Batch...' : 'Mobile Agent Sync Active'}
            </span>
          </div>
          <span className="text-[#9CA3AF] dark:text-[#64748B]">|</span>
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="p-0.5 rounded hover:text-[#1B7F4B] transition cursor-pointer"
            title="Poll mobile fleet immediately"
          >
            <RefreshCw className={`w-3 h-3 text-[#6B7280] dark:text-[#94A3B8] ${isRefreshing ? 'animate-spin text-[#1B7F4B]' : ''}`} />
          </button>
        </div>

        {/* Right: Search, Notifications, Theme, User Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Global Search Button [🔍] */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Search farmers, batches, shipments (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8]" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              /
            </kbd>
          </button>

          {/* Notifications Bell [🔔] */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative p-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Action Required Items"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#DC2626]" />
            </button>

            {/* Notification Dropdown Panel */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#111827] dark:text-[#F1F5F9]">
                      ⚠️ Action Required
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold">
                      4 ITEMS
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('data_quality');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Alert 1 */}
                  <div
                    onClick={() => {
                      setActiveTab('batches');
                      setIsNotificationsOpen(false);
                    }}
                    className="p-2.5 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100/70 transition cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-300">
                        🔴 3 batches have missing practice logs
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                        Kano region · 2 hours ago
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 shrink-0">Review →</span>
                  </div>

                  {/* Alert 2 */}
                  <div
                    onClick={() => {
                      setActiveTab('fleet');
                      setIsNotificationsOpen(false);
                    }}
                    className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100/70 transition cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-300">
                        🟡 2 agents haven't synced in 48 hours
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                        Fatima S., Emeka N. · 1 day ago
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 shrink-0">Notify →</span>
                  </div>

                  {/* Alert 3 */}
                  <div
                    onClick={() => {
                      setActiveTab('disputes');
                      setIsNotificationsOpen(false);
                    }}
                    className="p-2.5 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100/70 transition cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-300">
                        🔴 1 dispute pending resolution
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                        Farmer TH-KN-2026-00482 · 2 days ago
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 shrink-0">Resolve →</span>
                  </div>

                  {/* Alert 4 */}
                  <div
                    onClick={() => {
                      setActiveTab('data_quality');
                      setIsNotificationsOpen(false);
                    }}
                    className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100/70 transition cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-300">
                        🟡 5 farmers enrolled without GPS
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                        Jigawa region · 3 days ago
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 shrink-0">View →</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Menu [👤] */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#1B7F4B] text-white flex items-center justify-center font-bold text-xs">
                {userProfile.displayName ? userProfile.displayName.charAt(0) : 'A'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#94A3B8] hidden sm:block" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xl z-50 p-3 space-y-2 animate-in fade-in duration-150">
                <div className="pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">
                  <p className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9] truncate">
                    {userProfile.displayName}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] truncate">
                    {userProfile.email}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {role.toUpperCase()}
                  </span>
                </div>

                {/* Role Switcher */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase">
                    Switch Active Role
                  </span>
                  {(['super_admin', 'compliance_officer', 'fleet_manager', 'inspector'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition cursor-pointer ${
                        role === r
                          ? 'bg-[#E8F5EE] text-[#1B7F4B] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                          : 'text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {r.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] space-y-1">
                  <button
                    onClick={() => {
                      onOpenSimulator();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#1B7F4B]" />
                    Test Field Agent Sync
                  </button>

                  {currentUser ? (
                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[#1B7F4B] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer font-medium"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal [🔍] */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Search Input Bar */}
            <div className="p-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#6B7280] dark:text-[#94A3B8]" />
              <input
                type="text"
                autoFocus
                placeholder="Search across farmers, batches, shipments, and agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#111827] dark:text-[#F1F5F9] placeholder-[#9CA3AF] focus:outline-hidden"
              />
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 rounded text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Grouped by Category */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!searchQuery && (
                <div className="text-center py-8 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  Type a farmer name, registration code, batch passport, or container number.
                </div>
              )}

              {searchQuery && !hasSearchResults && (
                <div className="text-center py-8 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  No matching records found for "{searchQuery}".
                </div>
              )}

              {/* Farmers Group */}
              {searchResults.farmers.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold uppercase text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Farmers ({searchResults.farmers.length})
                  </span>
                  {searchResults.farmers.map((f) => (
                    <div
                      key={f.client_uuid}
                      onClick={() => {
                        setActiveTab('farmers');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
                          {f.full_name}
                        </span>
                        <span className="text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] ml-2">
                          {f.official_farmer_id}
                        </span>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          {f.crop} • {f.farm_size_hectares} ha • {f.lga}, {f.state}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  ))}
                </div>
              )}

              {/* Batches Group */}
              {searchResults.batches.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold uppercase text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" /> Batches ({searchResults.batches.length})
                  </span>
                  {searchResults.batches.map((b) => (
                    <div
                      key={b.batch_number}
                      onClick={() => {
                        setActiveTab('batches');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
                          {b.batch_number}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] ml-2">
                          {b.crop} • {b.estimated_tonnage}t
                        </span>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          {b.destination}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  ))}
                </div>
              )}

              {/* Shipments Group */}
              {searchResults.shipments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold uppercase text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Shipments ({searchResults.shipments.length})
                  </span>
                  {searchResults.shipments.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveTab('shipments');
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
                          {s.shipment_code}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] ml-2">
                          {s.vessel_name} ({s.container_id})
                        </span>
                        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                          {s.destination} • {s.status}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

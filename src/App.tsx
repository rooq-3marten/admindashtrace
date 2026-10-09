/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/layout/Header';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { GisMapViewer } from './components/gis/GisMapViewer';
import { EudrEngineView } from './components/eudr/EudrEngineView';
import { FarmersRegistry } from './components/farmers/FarmersRegistry';
import { PhiSentinel } from './components/compliance/PhiSentinel';
import { ExportBatches } from './components/batches/ExportBatches';
import { ShipmentsView } from './components/batches/ShipmentsView';
import { DocumentsVault } from './components/documents/DocumentsVault';
import { FleetMonitor } from './components/fleet/FleetMonitor';
import { DataQualityDashboard } from './components/quality/DataQualityDashboard';
import { QualityFlagsView } from './components/quality/QualityFlagsView';
import { DisputesView } from './components/quality/DisputesView';
import { SystemHealthDashboard } from './components/system/SystemHealthDashboard';
import { AuditLogView } from './components/system/AuditLogView';
import { MobileIntegrationGuide } from './components/guide/MobileIntegrationGuide';
import { RbacManagement } from './components/admin/RbacManagement';
import { PendingAgentsView } from './components/admin/PendingAgentsView';
import { ExportersView } from './components/users/ExportersView';
import { ReportsView } from './components/analytics/ReportsView';
import { ExportsView } from './components/analytics/ExportsView';
import { MobileSyncSimulator } from './components/simulator/MobileSyncSimulator';
import { DocumentExpirySentinelView } from './components/compliance/DocumentExpirySentinelView';
import { LandingPage } from './components/landing/LandingPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const TAB_PATH_MAP: Record<TabType, string> = {
  dashboard: '/dashboard',
  pending_agents: '/dashboard/pending-agents',
  fleet: '/dashboard/agents',
  farmers: '/dashboard/farmers',
  phi_sentinel: '/dashboard/practice-logs',
  batches: '/dashboard/batches',
  documents: '/dashboard/customs-vault',
  shipments: '/dashboard/shipments',
  gis_map: '/dashboard/gis-map',
  eudr_engine: '/dashboard/eudr-engine',
  expiry_sentinel: '/dashboard/expiry-sentinel',
  data_quality: '/dashboard/data-quality',
  flags: '/dashboard/flags',
  disputes: '/dashboard/disputes',
  rbac: '/dashboard/rbac',
  exporters: '/dashboard/exporters',
  system_health: '/dashboard/system-health',
  audit_log: '/dashboard/audit-log',
  mobile_guide: '/dashboard/mobile-guide',
  reports: '/dashboard/reports',
  exports: '/dashboard/exports',
};

const PATH_TAB_MAP: Record<string, TabType> = {
  '': 'dashboard',
  'overview': 'dashboard',
  'dashboard': 'dashboard',
  'pending-agents': 'pending_agents',
  'pending_agents': 'pending_agents',
  'agents': 'fleet',
  'fleet': 'fleet',
  'farmers': 'farmers',
  'practice-logs': 'phi_sentinel',
  'phi-sentinel': 'phi_sentinel',
  'batches': 'batches',
  'customs-vault': 'documents',
  'documents': 'documents',
  'shipments': 'shipments',
  'gis-map': 'gis_map',
  'eudr-engine': 'eudr_engine',
  'expiry-sentinel': 'expiry_sentinel',
  'data-quality': 'data_quality',
  'flags': 'flags',
  'disputes': 'disputes',
  'rbac': 'rbac',
  'exporters': 'exporters',
  'system-health': 'system_health',
  'audit-log': 'audit_log',
  'mobile-guide': 'mobile_guide',
  'reports': 'reports',
  'exports': 'exports',
};

interface MainAppProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

function MainApp({ activeTab, setActiveTab }: MainAppProps) {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFCFB] dark:bg-[#0F1F17] text-[#1A2E23] dark:text-[#E8F0EA] flex flex-col transition-colors duration-150">
      {/* Google Maps Platform Quota Defense Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between">
          <div className="flex-1 text-center">
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </div>
          <button
            onClick={() => setQuotaExceeded(false)}
            className="text-amber-700 hover:text-amber-900 ml-3 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Application Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* Main App Layout Shell: Fixed Sidebar (240px) + Scrollable Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <ErrorBoundary fallbackTitle="Dashboard Module Error">
            {activeTab === 'dashboard' && (
              <AnalyticsDashboard
                setActiveTab={setActiveTab}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
              />
            )}

            {activeTab === 'pending_agents' && (
              <PendingAgentsView />
            )}

            {activeTab === 'gis_map' && (
              <GisMapViewer onSelectFarmer={() => {}} />
            )}

            {activeTab === 'eudr_engine' && (
              <EudrEngineView />
            )}

            {activeTab === 'farmers' && (
              <FarmersRegistry />
            )}

            {activeTab === 'phi_sentinel' && (
              <PhiSentinel />
            )}

            {activeTab === 'expiry_sentinel' && (
              <DocumentExpirySentinelView />
            )}

            {activeTab === 'batches' && (
              <ExportBatches />
            )}

            {activeTab === 'documents' && (
              <DocumentsVault />
            )}

            {activeTab === 'shipments' && (
              <ShipmentsView />
            )}

            {activeTab === 'data_quality' && (
              <DataQualityDashboard />
            )}

            {activeTab === 'flags' && (
              <QualityFlagsView />
            )}

            {activeTab === 'disputes' && (
              <DisputesView />
            )}

            {activeTab === 'fleet' && (
              <FleetMonitor onOpenSimulator={() => setIsSimulatorOpen(true)} />
            )}

            {activeTab === 'system_health' && (
              <SystemHealthDashboard />
            )}

            {activeTab === 'audit_log' && (
              <AuditLogView />
            )}

            {activeTab === 'mobile_guide' && (
              <MobileIntegrationGuide />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'exports' && (
              <ExportsView />
            )}

            {activeTab === 'exporters' && (
              <ExportersView />
            )}

            {activeTab === 'rbac' && (
              <RbacManagement />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Android Field Sync Simulator Modal - Rule 3: Disabled unless VITE_ENABLE_SIMULATOR is true */}
      {import.meta.env.VITE_ENABLE_SIMULATOR === 'true' && (
        <MobileSyncSimulator
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          onNavigateToDocuments={() => setActiveTab('documents')}
        />
      )}
    </div>
  );
}

function RootRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const segments = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (segments[0] === 'dashboard') {
      const sub = segments[1] || '';
      return PATH_TAB_MAP[sub] || 'dashboard';
    }
    return 'dashboard';
  });

  // Listen to popstate (back/forward history events)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      const segments = path.replace(/^\/+|\/+$/g, '').split('/');
      if (segments[0] === 'dashboard') {
        const sub = segments[1] || '';
        setActiveTab(PATH_TAB_MAP[sub] || 'dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle tab switch inside the dashboard with URL update
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    const targetPath = TAB_PATH_MAP[newTab] || '/dashboard';
    window.history.pushState(null, '', targetPath);
    setCurrentPath(targetPath);
  };

  // Handle successful login from Landing Page
  const handleLoginSuccess = () => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    let target = '/dashboard';
    if (redirectParam && redirectParam.startsWith('/dashboard')) {
      target = redirectParam;
    }
    window.history.pushState(null, '', target);
    setCurrentPath(target);
    const segments = target.replace(/^\/+|\/+$/g, '').split('/');
    const sub = segments[1] || '';
    setActiveTab(PATH_TAB_MAP[sub] || 'dashboard');
  };

  // Loading state with warm earthy branding
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFCFB] flex flex-col items-center justify-center p-6 text-[#1A2E23]">
        <div className="w-12 h-12 rounded-xl bg-[#1A4D2E] flex items-center justify-center text-white font-serif font-bold text-2xl mb-4 shadow-sm animate-pulse">
          T
        </div>
        <h2 className="font-serif font-bold text-xl text-[#1A2E23]">TraceHarvest</h2>
        <p className="text-xs text-[#5A6B60] mt-1.5 font-mono">Verifying administrative security session…</p>
      </div>
    );
  }

  // Check if current route is a dashboard route
  const isDashboardRoute = currentPath.startsWith('/dashboard');

  // Route Protection: if visiting /dashboard/* while unauthenticated, redirect to "/" with ?redirect=...
  if (isDashboardRoute && !isAuthenticated) {
    const redirectUrl = `/?redirect=${encodeURIComponent(currentPath)}`;
    if (window.location.pathname !== '/' || !window.location.search.includes('redirect=')) {
      window.history.replaceState(null, '', redirectUrl);
    }
    return <LandingPage onSuccessLogin={handleLoginSuccess} />;
  }

  // Public Landing surface at "/"
  if (!isDashboardRoute) {
    return <LandingPage onSuccessLogin={handleLoginSuccess} />;
  }

  // Authenticated Dashboard surface at "/dashboard/*"
  return (
    <MainApp
      activeTab={activeTab}
      setActiveTab={handleTabChange}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <RootRouter />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

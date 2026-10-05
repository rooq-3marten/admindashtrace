/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
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
import { ExportersView } from './components/users/ExportersView';
import { ReportsView } from './components/analytics/ReportsView';
import { ExportsView } from './components/analytics/ExportsView';
import { MobileSyncSimulator } from './components/simulator/MobileSyncSimulator';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F172A] text-[#111827] dark:text-[#F1F5F9] flex flex-col transition-colors duration-150">
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

      {/* Top Application Bar (Spec Section 5) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* Main App Layout Shell: Fixed Sidebar (240px) + Scrollable Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Spec Section 5) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content View Area (max-width: 1440px, padding: 32px per spec) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <AnalyticsDashboard
              setActiveTab={setActiveTab}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
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
        </main>
      </div>

      {/* Android Field Sync Simulator Modal */}
      <MobileSyncSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onNavigateToDocuments={() => setActiveTab('documents')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

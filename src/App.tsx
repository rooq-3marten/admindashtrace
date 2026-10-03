/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/layout/Header';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { GisMapViewer } from './components/gis/GisMapViewer';
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F172A] text-[#111827] dark:text-[#F1F5F9] flex flex-col transition-colors duration-150">
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

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Shipment, ExportBatch } from '../../types';
import {
  Truck,
  Package,
  CheckCircle,
  Warning,
  DownloadSimple,
  Clock,
  ArrowRight,
  Anchor,
  X,
} from '@phosphor-icons/react';
import { AuditDossierModal } from './AuditDossierModal';
import { evaluateDocumentEtaRisks } from '../../utils/documentExpirySentinel';
import { generateBillOfLadingPdf, downloadFile } from '../../utils/auditDossierGenerator';

export const ShipmentsView: React.FC = () => {
  const { shipments, batches, documents } = useData();

  const [activeTab, setActiveTab] = useState<'All' | 'In Transit' | 'Pending' | 'Delivered'>('All');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [dossierBatch, setDossierBatch] = useState<ExportBatch | null>(null);

  // Sentinel records mapping
  const sentinelRecords = useMemo(() => {
    return evaluateDocumentEtaRisks(documents, batches, shipments);
  }, [documents, batches, shipments]);

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      if (activeTab === 'All') return true;
      return s.status === activeTab;
    });
  }, [shipments, activeTab]);

  // Default active shipment
  useEffect(() => {
    if (!selectedShipment && filtered.length > 0) {
      setSelectedShipment(filtered[0]);
    }
  }, [filtered, selectedShipment]);

  const getBatchForShipment = (ship: Shipment): ExportBatch => {
    return (
      batches.find(
        (b) =>
          b.container_id === ship.container_id ||
          b.vessel_name === ship.vessel_name ||
          b.destination.toLowerCase().includes(ship.destination.toLowerCase().split(',')[0])
      ) || batches[0]
    );
  };

  const selectedSentinelAlert = useMemo(() => {
    if (!selectedShipment) return null;
    return sentinelRecords.find(
      (r) => r.containerId === selectedShipment.container_id && r.isFlagged
    );
  }, [selectedShipment, sentinelRecords]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
      {/* Top Banner: Warm & Informational */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card">
        <div>
          <h2 className="font-serif font-bold text-xl text-[#1A2E23] dark:text-white">
            Maritime Logistics & Export Cargo
          </h2>
          <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7] mt-0.5">
            Real-time customs clearance, high-security mechanical bolt seals, and European arrival surveillance.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536] text-xs font-medium">
          {(['All', 'In Transit', 'Pending', 'Delivered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-white dark:bg-[#1A2E23] text-[#1A4D2E] dark:text-[#86EFAC] font-semibold shadow-xs'
                  : 'text-[#5A6B60] dark:text-[#A1B3A7] hover:text-[#1A2E23] dark:hover:text-white'
              }`}
            >
              {tab === 'All' ? 'All routes' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* SPLIT-PANE WORKSPACE: Left 58% Grid, Right 42% Maritime Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane (7 cols): Cargo Table */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card overflow-hidden">
          <div className="overflow-x-auto max-h-[78vh]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F7F9F7] dark:bg-[#14261C] border-b border-[#E5EBE7] dark:border-[#2D4536] text-[#5A6B60] dark:text-[#A1B3A7] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Cargo Code</th>
                  <th className="py-2.5 px-3">Vessel & Container</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">ETA Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-[#1A2E23] dark:text-[#E8F0EA]">
                {filtered.map((ship) => {
                  const isActive = selectedShipment?.id === ship.id;
                  const flagged = sentinelRecords.find(
                    (r) => r.containerId === ship.container_id && r.isFlagged
                  );

                  return (
                    <tr
                      key={ship.id}
                      onClick={() => setSelectedShipment(ship)}
                      className={`transition cursor-pointer ${
                        isActive
                          ? 'bg-[#EEF5F1] dark:bg-[#20362A] font-medium'
                          : 'hover:bg-[#F7F9F7] dark:hover:bg-[#1A2E23]/60'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#1A2E23] dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1A4D2E] dark:bg-[#86EFAC]" />}
                          <span>{ship.shipment_code}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-sans font-medium text-[#1A2E23] dark:text-white line-clamp-1">{ship.vessel_name}</div>
                        <span className="font-mono text-[11px] text-[#5A6B60] dark:text-[#A1B3A7]">{ship.container_id}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {ship.total_tonnage} MT
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums text-[#5A6B60] dark:text-[#A1B3A7]">
                        {ship.estimated_arrival}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          {ship.status === 'In Transit' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A6FA5] dark:text-[#93C5FD]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6FA5]" />
                              In Transit
                            </span>
                          ) : ship.status === 'Delivered' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                              Discharged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B8860B] dark:text-[#FCD34D]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                              Berth pending
                            </span>
                          )}

                          {flagged && (
                            <span className="block text-[10px] font-mono text-[#B8860B] dark:text-[#FCD34D]">
                              Doc expiry ≤ 14d
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const batch = getBatchForShipment(ship);
                            setDossierBatch(batch);
                          }}
                          className="px-2 py-1 rounded bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-[11px] font-medium transition cursor-pointer shadow-warm-card"
                          title="Generate Complete Customs Audit Dossier"
                        >
                          Dossier (.ZIP)
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-[#E5EBE7] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#14261C] flex items-center justify-between text-xs text-[#5A6B60] dark:text-[#8A968E] font-mono">
            <span>Showing {filtered.length} cargo consignments</span>
            <span>Port of Discharge: Maasvlakte / Hamburg</span>
          </div>
        </div>

        {/* Right Pane (5 cols): Maritime Customs Inspector */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card p-5 space-y-5">
          {selectedShipment ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono tracking-wider text-[#8A968E]">
                    Maritime Cargo Passport
                  </span>
                  <span className="font-mono text-xs text-[#4A6FA5] dark:text-[#93C5FD] font-semibold">
                    {selectedShipment.status}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1A2E23] dark:text-white mt-1">
                  {selectedShipment.vessel_name}
                </h3>
                <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7] mt-0.5 font-mono">
                  Voyage: {selectedShipment.shipment_code} · Container {selectedShipment.container_id}
                </p>
              </div>

              {/* Sentinel Alert Warning (if applicable) */}
              {selectedSentinelAlert && (
                <div className="p-3.5 rounded-lg bg-[#FEF7EC] dark:bg-[#3D2F1B] border border-[#FDE68A] dark:border-[#78350F] text-xs space-y-1">
                  <div className="font-semibold text-[#B8860B] dark:text-[#FCD34D] flex items-center gap-1.5">
                    <Warning size={15} />
                    <span>Document Expiry Alert: {selectedSentinelAlert.documentCategory}</span>
                  </div>
                  <p className="text-[#854D0E] dark:text-[#FDE68A] text-[11px]">
                    {selectedSentinelAlert.flagReason}
                  </p>
                </div>
              )}

              {/* Primary Call-to-action */}
              <div className="p-4 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A2E23] dark:text-white">
                    European Port Clearance Package
                  </span>
                  <span className="text-[11px] font-mono text-[#2D6A4F] dark:text-[#86EFAC]">
                    Customs Verified
                  </span>
                </div>
                <p className="text-[11px] text-[#5A6B60] dark:text-[#A1B3A7] leading-relaxed">
                  Generates bundled archive including official Clean Ocean Bill of Lading, mechanical seal verification, and lab chromatography reports.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const batch = getBatchForShipment(selectedShipment);
                      setDossierBatch(batch);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-warm-card"
                  >
                    <Package size={15} />
                    <span>Download Full Dossier (.ZIP)</span>
                  </button>

                  <button
                    onClick={() => {
                      const batch = getBatchForShipment(selectedShipment);
                      const pdf = generateBillOfLadingPdf(batch, selectedShipment);
                      downloadFile(pdf, `Bill_of_Lading_${selectedShipment.shipment_code}.pdf`, 'application/pdf');
                    }}
                    className="py-2 px-3 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-white dark:bg-[#1A2E23] hover:bg-[#F7F9F7] text-xs font-medium text-[#1A2E23] dark:text-white flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <DownloadSimple size={14} />
                    <span>BOL PDF</span>
                  </button>
                </div>
              </div>

              {/* Marine Transport Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#FBFCFB] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536]">
                  <span className="text-[11px] text-[#8A968E] block">Port of Loading</span>
                  <div className="font-semibold text-[#1A2E23] dark:text-white mt-0.5">Lagos Port Apapa (NGAPP)</div>
                </div>
                <div className="p-3 rounded-lg bg-[#FBFCFB] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536]">
                  <span className="text-[11px] text-[#8A968E] block">Discharge Terminal</span>
                  <div className="font-semibold text-[#1A2E23] dark:text-white mt-0.5">{selectedShipment.destination}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#FBFCFB] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536]">
                  <span className="text-[11px] text-[#8A968E] block">Departure Date</span>
                  <div className="font-semibold text-[#1A2E23] dark:text-white mt-0.5">{selectedShipment.departure_date}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#FBFCFB] dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#2D4536]">
                  <span className="text-[11px] text-[#8A968E] block">Arrival Window (ETA)</span>
                  <div className="font-semibold text-[#2D6A4F] dark:text-[#86EFAC] mt-0.5">{selectedShipment.estimated_arrival}</div>
                </div>
              </div>

              {/* Seal Integrity & Security */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A968E]">
                  Container Seal Integrity (ISO 17712)
                </span>
                <div className="p-3 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#14261C] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#8A968E] text-[11px]">Mechanical Bolt Seal #</span>
                    <div className="font-mono font-semibold text-[#1A2E23] dark:text-white">
                      NG-SEAL-ISO-{selectedShipment.container_id.replace(/\D/g, '') || '88902'}
                    </div>
                  </div>
                  <span className="font-mono text-[#2D6A4F] dark:text-[#86EFAC] font-semibold">
                    ● Verified Intact
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#8A968E]">
              Select a shipment from the cargo grid to launch the Maritime Inspector.
            </div>
          )}
        </div>
      </div>

      {/* Audit Dossier Modal */}
      {dossierBatch && (
        <AuditDossierModal
          batch={dossierBatch}
          isOpen={true}
          onClose={() => setDossierBatch(null)}
          shipment={selectedShipment}
        />
      )}
    </div>
  );
};

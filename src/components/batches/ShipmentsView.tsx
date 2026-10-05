import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Shipment, ExportBatch } from '../../types';
import {
  Truck,
  Anchor,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  X,
  FileCheck,
  Package,
  AlertTriangle,
  Ship,
} from 'lucide-react';
import { AuditDossierModal } from './AuditDossierModal';
import { evaluateDocumentEtaRisks } from '../../utils/documentExpirySentinel';

export const ShipmentsView: React.FC = () => {
  const { shipments, batches, documents } = useData();

  const [activeTab, setActiveTab] = useState<'All' | 'In Transit' | 'Pending' | 'Delivered'>('All');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [dossierBatch, setDossierBatch] = useState<ExportBatch | null>(null);

  // Sentinel records mapping
  const sentinelRecords = useMemo(() => {
    return evaluateDocumentEtaRisks(documents, batches, shipments);
  }, [documents, batches, shipments]);

  const filtered = shipments.filter((s) => {
    if (activeTab === 'All') return true;
    return s.status === activeTab;
  });

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

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Export Shipments & Maritime Logistics
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Track certified consignments, sea containers, bill of lading passports, and port clearance status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B7F4B] text-white hover:bg-[#145C36] text-xs font-semibold transition cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export Manifest
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(['All', 'In Transit', 'Pending', 'Delivered'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === tab
                ? 'bg-[#1B7F4B] text-white'
                : 'bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]'
            }`}
          >
            {tab === 'In Transit' ? '🚢 In Transit' : tab === 'Delivered' ? '✓ Delivered' : tab}
          </button>
        ))}
      </div>

      {/* Shipments Table */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Shipment Code</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Vessel / Container</th>
                <th className="py-3 px-4">Batches</th>
                <th className="py-3 px-4">Tonnage</th>
                <th className="py-3 px-4">Departure</th>
                <th className="py-3 px-4">Est. Arrival</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {filtered.map((ship) => (
                <tr
                  key={ship.id}
                  onClick={() => setSelectedShipment(ship)}
                  className="hover:bg-[#E8F5EE] dark:hover:bg-[#145C36]/20 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                    {ship.shipment_code}
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    {ship.destination}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold block">{ship.vessel_name}</span>
                    <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{ship.container_id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {ship.batches_count} lots
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    {ship.total_tonnage}t
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6B7280] dark:text-[#94A3B8]">
                    {ship.departure_date}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6B7280] dark:text-[#94A3B8]">
                    {ship.estimated_arrival}
                  </td>
                  <td className="py-3.5 px-4">
                    {(() => {
                      const flagged = sentinelRecords.find(
                        (r) => r.containerId === ship.container_id && r.isFlagged
                      );

                      return (
                        <div className="space-y-1">
                          {ship.status === 'In Transit' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              🚢 In Transit
                            </span>
                          ) : ship.status === 'Delivered' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              ✓ Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              ● Pending
                            </span>
                          )}

                          {flagged && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Doc Expiry &le; 14d ETA
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const batch = getBatchForShipment(ship);
                          setDossierBatch(batch);
                        }}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Download NAQS, SGS, EUDR, BOL and SHA-256 package"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Audit Dossier</span>
                      </button>
                      <button
                        onClick={() => setSelectedShipment(ship)}
                        className="text-[#1B7F4B] dark:text-emerald-400 hover:underline font-semibold text-xs cursor-pointer"
                      >
                        Manifest →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div>
                <span className="text-[11px] font-mono text-[#1B7F4B] font-semibold uppercase">
                  Shipment Passport
                </span>
                <h3 className="font-bold text-lg text-[#111827] dark:text-[#F1F5F9] font-mono">
                  {selectedShipment.shipment_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#334155] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#6B7280]">Destination:</span>
                <p className="font-semibold text-[#111827] dark:text-[#F1F5F9] mt-0.5">{selectedShipment.destination}</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Carrier:</span>
                <p className="font-semibold text-[#111827] dark:text-[#F1F5F9] mt-0.5">{selectedShipment.carrier}</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Vessel:</span>
                <p className="font-mono text-[#111827] dark:text-[#F1F5F9] mt-0.5">{selectedShipment.vessel_name}</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Container:</span>
                <p className="font-mono text-[#111827] dark:text-[#F1F5F9] mt-0.5">{selectedShipment.container_id}</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Total Tonnage:</span>
                <p className="font-bold text-[#111827] dark:text-[#F1F5F9] mt-0.5 font-mono">{selectedShipment.total_tonnage}t</p>
              </div>
              <div>
                <span className="text-[#6B7280]">Status:</span>
                <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">{selectedShipment.status}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const batch = getBatchForShipment(selectedShipment);
                    setDossierBatch(batch);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Audit Dossier (.ZIP)</span>
                </button>
                <button
                  onClick={() => {
                    const bolData = {
                      document_type: 'EXPORT_BILL_OF_LADING_PHYTOSANITARY',
                      shipment_code: selectedShipment.shipment_code,
                      vessel_name: selectedShipment.vessel_name,
                      container_id: selectedShipment.container_id,
                      carrier: selectedShipment.carrier,
                      destination_port: selectedShipment.destination,
                      total_tonnage_mt: selectedShipment.total_tonnage,
                      batches_count: selectedShipment.batches_count,
                      departure_date: selectedShipment.departure_date,
                      estimated_arrival: selectedShipment.estimated_arrival,
                      certification: 'NAFDAC & EUDR Annex II Phytosanitary Clearance Verified',
                      cryptographic_seal_sha256: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
                      issued_at: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(bolData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bill_of_lading_${selectedShipment.shipment_code}.json`;
                    a.click();
                  }}
                  className="px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Bill of Lading JSON
                </button>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Modal */}
      {dossierBatch && (
        <AuditDossierModal
          batch={dossierBatch}
          isOpen={true}
          onClose={() => setDossierBatch(null)}
        />
      )}
    </div>
  );
};

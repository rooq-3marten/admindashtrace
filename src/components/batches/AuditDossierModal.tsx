import React, { useState, useEffect, useMemo } from 'react';
import { ExportBatch, Shipment } from '../../types';
import { FileText, Download, AlertTriangle, CheckCircle2, X, Package, Clock, Info } from 'lucide-react';
import {
  buildCompleteAuditDossier,
  downloadAuditDossierZip,
  downloadFile,
  AuditDossierResult,
} from '../../utils/auditDossierGenerator';
import { evaluateDocumentEtaRisks } from '../../utils/documentExpirySentinel';
import { useData } from '../../context/DataContext';

interface AuditDossierModalProps {
  batch: ExportBatch;
  isOpen: boolean;
  onClose: () => void;
  shipment?: Shipment | null;
}

const Stat: React.FC<{ label: string; value: string | number; note?: string }> = ({ label, value, note }) => (
  <div className="p-3 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] bg-[#F7F9F7] dark:bg-[#12201A]">
    <div className="text-[10px] uppercase tracking-wide font-mono text-[#5A6B60] dark:text-[#A1B3A7]">{label}</div>
    <div className="text-lg font-bold text-[#1A2E23] dark:text-white">{value}</div>
    {note && <div className="text-[11px] text-[#5A6B60] dark:text-[#A1B3A7]">{note}</div>}
  </div>
);

export const AuditDossierModal: React.FC<AuditDossierModalProps> = ({ batch, isOpen, onClose, shipment }) => {
  const { farmers, practices, shipments, documents } = useData();
  const [isBusy, setIsBusy] = useState(false);
  const [pack, setPack] = useState<AuditDossierResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeShipment = useMemo(() => {
    if (shipment) return shipment;
    return (
      shipments.find(
        (s) =>
          (!!batch.container_id && s.container_id === batch.container_id) ||
          (!!batch.vessel_name && s.vessel_name === batch.vessel_name)
      ) || null
    );
  }, [shipment, shipments, batch]);

  // Only farmers actually linked to this batch. No fallback to "the first few farmers".
  const linkedFarmers = useMemo(
    () => farmers.filter((f) => batch.farmer_client_uuids?.includes(f.client_uuid)),
    [farmers, batch]
  );

  const ctx = useMemo(
    () => ({ farmers, practices, documents, shipment: activeShipment }),
    [farmers, practices, documents, activeShipment]
  );

  const flaggedSentinel = useMemo(() => {
    const records = evaluateDocumentEtaRisks(documents, [batch], activeShipment ? [activeShipment] : shipments);
    return records.find(
      (r) =>
        r.isFlagged &&
        (r.batchNumber === batch.batch_number ||
          (!!batch.container_id && r.containerId === batch.container_id) ||
          (!!r.shipmentCode && r.shipmentCode === activeShipment?.shipment_code))
    );
  }, [documents, batch, activeShipment, shipments]);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    setError(null);
    setIsBusy(true);
    buildCompleteAuditDossier(batch, linkedFarmers, ctx)
      .then((res) => {
        if (live) setPack(res);
      })
      .catch((err) => {
        console.error('Failed to build evidence pack:', err);
        if (live) setError('The evidence pack could not be generated. Check the browser console for details.');
      })
      .finally(() => {
        if (live) setIsBusy(false);
      });
    return () => {
      live = false;
    };
  }, [isOpen, batch, linkedFarmers, ctx]);

  if (!isOpen) return null;

  const handleZip = async () => {
    try {
      setIsBusy(true);
      await downloadAuditDossierZip(batch, linkedFarmers, ctx);
    } catch (err) {
      console.error('Download error:', err);
      setError('The ZIP could not be created.');
    } finally {
      setIsBusy(false);
    }
  };

  const s = pack?.stats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-[#1A2E23] rounded-xl shadow-xl border border-[#E5EBE7] dark:border-[#2D4536] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5EBE7] dark:border-[#2D4536] flex items-start justify-between">
          <div>
            <div className="text-xs text-[#5A6B60] dark:text-[#A1B3A7] font-mono mb-1">Batch evidence pack</div>
            <h3 className="font-serif font-bold text-lg text-[#1A2E23] dark:text-white tracking-tight">
              {batch.batch_number}
            </h3>
            <div className="text-xs text-[#5A6B60] dark:text-[#A1B3A7] mt-1 font-mono">
              {[batch.crop, batch.estimated_tonnage ? `${batch.estimated_tonnage} MT` : null, batch.destination]
                .filter(Boolean)
                .join(' / ')}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md text-[#8A968E] hover:text-[#1A2E23] dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              This pack is assembled from recorded data. TraceHarvest does not issue certificates. Phytosanitary
              certificates, laboratory reports and bills of lading come from the issuing authority or carrier: upload
              them to the Documents Vault against this batch and they are attached here unchanged.
            </p>
          </div>

          {flaggedSentinel && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Document expiry warning: {flaggedSentinel.documentCategory}</div>
                <p className="mt-0.5">{flaggedSentinel.flagReason}</p>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-700 dark:text-red-300">{error}</div>}

          {s && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Farmers" value={s.farmers} note={s.farmers === 0 ? 'None linked' : `${s.farmersWithPolygon} with boundary`} />
              <Stat label="Practices" value={s.practices} note={`${s.practicesNeedingReview} need review`} />
              <Stat label="Loss figure recorded" value={`${s.plotsWithRecordedLossFigure}/${s.farmers}`} note={`${s.plotsOnReviewHold} on hold`} />
              <Stat label="Documents" value={s.documentsAttached} note={`${s.documentsWithFile} with file`} />
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#5A6B60] dark:text-[#A1B3A7] mb-2">Files in this pack</h4>
            <div className="space-y-2">
              {isBusy && !pack && (
                <div className="flex items-center gap-2 text-xs text-[#5A6B60]">
                  <Clock className="w-4 h-4" /> Generating…
                </div>
              )}
              {pack?.files.map((f) => (
                <div key={f.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1A2E23] dark:text-white">
                      <FileText className="w-4 h-4 shrink-0" /> <span className="truncate">{f.label}</span>
                    </div>
                    <p className="text-[11px] text-[#5A6B60] dark:text-[#A1B3A7]">{f.description}</p>
                    <p className="text-[10px] font-mono text-[#8A968E] truncate">SHA-256 {f.sha256}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(f.data, f.name, f.mime)}
                    className="shrink-0 p-2 rounded-md border border-[#E5EBE7] dark:border-[#2D4536] hover:bg-[#F7F9F7] dark:hover:bg-[#12201A] cursor-pointer"
                    aria-label={`Download ${f.label}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#5A6B60] dark:text-[#A1B3A7] mb-2">Uploaded documents for this batch</h4>
            {pack && pack.attached.length === 0 && (
              <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7]">
                None yet. Upload the phytosanitary certificate, laboratory report and bill of lading in the Documents Vault.
              </p>
            )}
            <div className="space-y-2">
              {pack?.attached.map((d) => (
                <div key={d.id} className="p-3 rounded-lg border border-[#E5EBE7] dark:border-[#2D4536] text-xs">
                  <div className="font-semibold text-[#1A2E23] dark:text-white">{d.title}</div>
                  <div className="text-[#5A6B60] dark:text-[#A1B3A7]">
                    {[d.regulatory_authority, d.certificate_number, d.expiry_date ? `expires ${d.expiry_date}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {d.hash_matches === true && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> File matches its stored checksum
                      </span>
                    )}
                    {d.hash_matches === false && (
                      <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-3.5 h-3.5" /> File does not match its stored checksum
                      </span>
                    )}
                    {d.hash_matches === null && (
                      <span className="text-[#5A6B60] dark:text-[#A1B3A7]">
                        {d.included_in_zip ? 'Included, no stored checksum to compare' : 'File content not held here, listed only'}
                      </span>
                    )}
                    <span className="text-[#8A968E]">· vault status: {d.verification_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E5EBE7] dark:border-[#2D4536] flex items-center justify-between gap-3">
          <p className="text-[10px] font-mono text-[#8A968E] truncate">
            {pack ? `Pack checksum ${pack.packChecksum.slice(0, 16)}…` : ''}
          </p>
          <button
            onClick={handleZip}
            disabled={isBusy || !pack}
            className="px-4 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#166B3F] disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" /> Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
};

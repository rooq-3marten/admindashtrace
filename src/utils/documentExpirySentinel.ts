import { RegulatoryDocument, ExportBatch, Shipment } from '../types';

export type ExpiryRiskLevel =
  | 'CRITICAL_EXPIRED_BEFORE_ETA'
  | 'FLAGGED_EXPIRING_WITHIN_14_DAYS'
  | 'WARNING_APPROACHING_MARGIN'
  | 'COMPLIANT_SAFE_MARGIN';

export interface DocumentEtaAuditRecord {
  documentId: string;
  documentTitle: string;
  documentCategory: 'PHYTOSANITARY' | 'LAB_MRL_ANALYSIS' | string;
  certificateNumber?: string;
  regulatoryAuthority: string;
  expiryDateStr?: string;
  expiryTimestampMs?: number;
  
  // Linked Maritime Context
  batchNumber?: string;
  crop?: string;
  shipmentCode?: string;
  vesselName: string;
  containerId: string;
  destinationPort: string;
  departureDateStr: string;
  etaDateStr: string;
  etaTimestampMs: number;

  // Analysis & Calculations
  daysFromNowToEta: number;
  daysFromNowToExpiry?: number;
  daysFromEtaToExpiry?: number; // KEY METRIC: Expiry Date minus Vessel ETA in days
  
  riskLevel: ExpiryRiskLevel;
  riskScore: number; // 0 (safe) to 100 (critical)
  isFlagged: boolean; // true if expiring <= 14 days after ETA or already expired
  
  flagReason: string;
  remediationAction: string;
  recommendedAuthorityContact: string;
}

export interface SentinelCronExecutionLog {
  runId: string;
  timestamp: string;
  cronExpression: string;
  totalDocumentsScanned: number;
  phytosanitaryScanned: number;
  labAssaysScanned: number;
  flaggedCount: number;
  criticalCount: number;
  status: 'SUCCESS' | 'ALERTS_DISPATCHED';
  records: DocumentEtaAuditRecord[];
  executionTimeMs: number;
}

// Helper to parse date string YYYY-MM-DD
function parseDateMs(dateStr?: string): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : parsed;
}

// Normalize batch/shipment codes for matching
function matchDocToShipmentAndBatch(
  doc: RegulatoryDocument,
  batches: ExportBatch[],
  shipments: Shipment[]
): { matchedBatch?: ExportBatch; matchedShipment?: Shipment } {
  let matchedBatch: ExportBatch | undefined;
  let matchedShipment: Shipment | undefined;

  // 1. Direct entity match
  if (doc.entity_type === 'BATCH') {
    matchedBatch = batches.find(
      (b) =>
        b.batch_number === doc.entity_id ||
        doc.entity_id.includes(b.batch_number.replace(/\D/g, '')) ||
        (doc.entity_name && doc.entity_name.includes(b.batch_number))
    );
  } else if (doc.entity_type === 'SHIPMENT') {
    matchedShipment = shipments.find(
      (s) =>
        s.id === doc.entity_id ||
        s.shipment_code === doc.entity_id ||
        (doc.entity_name && doc.entity_name.includes(s.container_id))
    );
  }

  // 2. If we found a batch, find linked shipment
  if (matchedBatch && !matchedShipment) {
    matchedShipment = shipments.find(
      (s) =>
        (matchedBatch?.container_id && s.container_id === matchedBatch.container_id) ||
        (matchedBatch?.vessel_name && s.vessel_name === matchedBatch.vessel_name) ||
        s.destination.toLowerCase().includes(matchedBatch?.destination.toLowerCase().split(',')[0] || '')
    );
  }

  // 3. If we found shipment, find linked batch
  if (matchedShipment && !matchedBatch) {
    matchedBatch = batches.find(
      (b) =>
        (matchedShipment?.container_id && b.container_id === matchedShipment.container_id) ||
        (matchedShipment?.vessel_name && b.vessel_name === matchedShipment.vessel_name)
    );
  }

  return { matchedBatch, matchedShipment };
}

/**
 * Main Evaluation Engine:
 * Compares Phytosanitary & Lab Assay expiry dates against ocean vessel Estimated Time of Arrival (ETA).
 * Flags any document expiring within 14 days of vessel arrival.
 */
export function evaluateDocumentEtaRisks(
  documents: RegulatoryDocument[],
  batches: ExportBatch[],
  shipments: Shipment[],
  currentDateMs: number = Date.now()
): DocumentEtaAuditRecord[] {
  const records: DocumentEtaAuditRecord[] = [];

  const targetDocs = documents.filter(
    (d) => d.category === 'PHYTOSANITARY' || d.category === 'LAB_MRL_ANALYSIS'
  );

  for (const doc of targetDocs) {
    const { matchedBatch, matchedShipment } = matchDocToShipmentAndBatch(doc, batches, shipments);

    // Only evaluate when the shipment's arrival date and the document's expiry date are both recorded.
    // Nothing is assumed or defaulted.
    const etaStr = matchedShipment?.estimated_arrival;
    const expiryStr = doc.expiry_date;
    const etaMs = etaStr ? parseDateMs(etaStr) : null;
    const expiryMs = expiryStr ? parseDateMs(expiryStr) : null;
    if (!matchedShipment || !etaStr || !expiryStr || !etaMs || !expiryMs) continue;

    const daysFromNowToEta = Math.round((etaMs - currentDateMs) / 86400000);
    const daysFromNowToExpiry = Math.round((expiryMs - currentDateMs) / 86400000);
    const daysFromEtaToExpiry = Math.round((expiryMs - etaMs) / 86400000);

    let riskLevel: ExpiryRiskLevel = 'COMPLIANT_SAFE_MARGIN';
    let riskScore = 15;
    let isFlagged = false;
    let flagReason = '';
    let remediationAction = '';

    if (daysFromEtaToExpiry < 0) {
      riskLevel = 'CRITICAL_EXPIRED_BEFORE_ETA';
      riskScore = 98;
      isFlagged = true;
      flagReason = `Certificate expires ${Math.abs(daysFromEtaToExpiry)} days BEFORE vessel arrival at ${matchedShipment.destination}. Likely customs rejection or quarantine hold on arrival.`;
      remediationAction =
        doc.category === 'PHYTOSANITARY'
          ? 'Obtain a reissued certificate from the issuing authority before the vessel arrives.'
          : 'Arrange a new laboratory test and send the result to the destination port.';
    } else if (daysFromEtaToExpiry <= 14) {
      riskLevel = 'FLAGGED_EXPIRING_WITHIN_14_DAYS';
      riskScore = 85;
      isFlagged = true;
      flagReason = `Document expires within ${daysFromEtaToExpiry} days of vessel ETA (${etaStr}). Port inspection delays could cause a detention risk.`;
      remediationAction =
        doc.category === 'PHYTOSANITARY'
          ? 'Ask the issuing authority about an extension or reissue.'
          : 'Ask the laboratory for an updated result.';
    } else if (daysFromEtaToExpiry <= 21) {
      riskLevel = 'WARNING_APPROACHING_MARGIN';
      riskScore = 50;
      isFlagged = false;
      flagReason = `Adequate but narrow buffer: ${daysFromEtaToExpiry} days between ETA and document expiry. Monitor the voyage for delays.`;
      remediationAction = 'Re-check this document a week before arrival.';
    } else {
      riskLevel = 'COMPLIANT_SAFE_MARGIN';
      riskScore = 10;
      isFlagged = false;
      flagReason = `Compliant: ${daysFromEtaToExpiry} days validity remaining after vessel ETA. No expiry risk on current dates.`;
      remediationAction = 'No action needed on expiry timing.';
    }

    records.push({
      documentId: doc.id,
      documentTitle: doc.title,
      documentCategory: doc.category,
      certificateNumber: doc.certificate_number,
      regulatoryAuthority: doc.regulatory_authority,
      expiryDateStr: expiryStr,
      expiryTimestampMs: expiryMs,
      batchNumber: matchedBatch?.batch_number || doc.entity_id,
      crop: matchedBatch?.crop || '',
      shipmentCode: matchedShipment.shipment_code,
      vesselName: matchedShipment.vessel_name,
      containerId: matchedShipment.container_id,
      destinationPort: matchedShipment.destination,
      departureDateStr: matchedShipment.departure_date,
      etaDateStr: etaStr,
      etaTimestampMs: etaMs,
      daysFromNowToEta,
      daysFromNowToExpiry,
      daysFromEtaToExpiry,
      riskLevel,
      riskScore,
      isFlagged,
      flagReason,
      remediationAction,
      recommendedAuthorityContact:
        doc.category === 'PHYTOSANITARY'
          ? 'Nigeria Agricultural Quarantine Service (NAQS) Port Directorate: naqs.exports@quarantine.gov.ng'
          : 'SGS Agricultural Services Testing Desk: ng.agriculture@sgs.com',
    });
  }

  // Sort: highest risk first
  return records.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Execute a complete Sentinel Cron Trigger scan
 */
export function executeSentinelCronScan(
  documents: RegulatoryDocument[],
  batches: ExportBatch[],
  shipments: Shipment[],
  cronExpression: string = '0 */6 * * *'
): SentinelCronExecutionLog {
  const startTime = performance.now();
  const records = evaluateDocumentEtaRisks(documents, batches, shipments);

  const flaggedCount = records.filter((r) => r.isFlagged).length;
  const criticalCount = records.filter((r) => r.riskLevel === 'CRITICAL_EXPIRED_BEFORE_ETA').length;
  const phytosanitaryScanned = records.filter((r) => r.documentCategory === 'PHYTOSANITARY').length;
  const labAssaysScanned = records.filter((r) => r.documentCategory === 'LAB_MRL_ANALYSIS').length;

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    runId: `CRON-SENTINEL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    cronExpression,
    totalDocumentsScanned: records.length,
    phytosanitaryScanned,
    labAssaysScanned,
    flaggedCount,
    criticalCount,
    status: flaggedCount > 0 ? 'ALERTS_DISPATCHED' : 'SUCCESS',
    records,
    executionTimeMs,
  };
}

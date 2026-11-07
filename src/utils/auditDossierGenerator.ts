import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { ExportBatch, Farmer, PracticeLog, RegulatoryDocument, Shipment } from '../types';
import { analyzeRemoteSensingTreeCover, generateOfficialEudrAnnexIIGeoJson } from './eudrEngine';

/**
 * Batch Evidence Pack.
 *
 * Everything in the pack is assembled from records that exist in the system: the batch, its linked
 * farmers, their logged agrochemical practices, and documents that people actually uploaded.
 * TraceHarvest does NOT write phytosanitary certificates, laboratory reports, bills of lading or
 * seal confirmations. Those come from the issuing authority or carrier, are uploaded to the
 * Documents Vault, and are attached here unchanged with their checksums.
 */

export interface PackFile {
  name: string;
  label: string;
  description: string;
  mime: string;
  data: Blob | string;
  sha256: string;
  bytes: number;
}

export interface AttachedDocument {
  id: string;
  title: string;
  category: string;
  file_name: string;
  regulatory_authority: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  verification_status: string;
  verified_by: string;
  stored_sha256: string;
  computed_sha256: string | null; // null when the uploaded file content is not held here
  hash_matches: boolean | null;
  included_in_zip: boolean;
}

export interface PackStats {
  farmers: number;
  farmersWithPolygon: number;
  practices: number;
  practicesNeedingReview: number;
  plotsWithRecordedLossFigure: number;
  plotsOnReviewHold: number;
  documentsAttached: number;
  documentsWithFile: number;
}

export interface AuditDossierResult {
  batchNumber: string;
  generatedAt: string;
  files: PackFile[];
  attached: AttachedDocument[];
  stats: PackStats;
  packChecksum: string;
}

export interface PackContext {
  farmers: Farmer[];
  practices: PracticeLog[];
  documents: RegulatoryDocument[];
  shipment?: Shipment | null;
}

const NOT_RECORDED = 'Not recorded';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Bytes(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', view as unknown as BufferSource);
  return toHex(digest);
}

async function sha256Text(text: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(text));
}

function dateText(value?: string | number | null): string {
  if (value === undefined || value === null || value === '' || value === 0) return NOT_RECORDED;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
}

function polygonPointCount(f: Farmer): number {
  return (f.gps_polygon || '').split(';').filter((p) => p.trim().length > 0).length;
}

function safeName(text: string): string {
  return text.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
}

/** Decodes a base64 data URL. Returns null if the content is not held in that form. */
function dataUrlToBytes(url?: string): Uint8Array | null {
  if (!url || !url.startsWith('data:')) return null;
  const comma = url.indexOf(',');
  if (comma < 0 || !/;base64$/i.test(url.slice(0, comma))) return null;
  try {
    const bin = atob(url.slice(comma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Documents that belong to this batch or its shipment, by the link recorded when they were uploaded. */
export function documentsForBatch(
  batch: ExportBatch,
  documents: RegulatoryDocument[],
  shipment?: Shipment | null
): RegulatoryDocument[] {
  return documents.filter((d) => {
    if (d.entity_type === 'BATCH') return d.entity_id === batch.batch_number || (batch.id !== undefined && d.entity_id === String(batch.id));
    if (d.entity_type === 'SHIPMENT') return !!shipment && (d.entity_id === shipment.id || d.entity_id === shipment.shipment_code);
    return false;
  });
}

// ---------------------------------------------------------------------------
// PDF: Batch Traceability Summary
// ---------------------------------------------------------------------------

type Col = { h: string; w: number };

function drawTable(doc: jsPDF, startY: number, cols: Col[], rows: string[][], emptyText: string): number {
  const x0 = 14;
  const lineH = 5.2;
  let y = startY;
  const header = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(238, 242, 239);
    doc.rect(x0, y - 4, cols.reduce((s, c) => s + c.w, 0), 6, 'F');
    let x = x0 + 1;
    cols.forEach((c) => {
      doc.text(c.h, x, y);
      x += c.w;
    });
    y += 5;
    doc.setFont('helvetica', 'normal');
  };
  header();
  if (rows.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(emptyText, x0 + 1, y + 1);
    doc.setTextColor(0);
    return y + 8;
  }
  doc.setFontSize(8);
  for (const row of rows) {
    if (y > 276) {
      doc.addPage();
      y = 20;
      header();
      doc.setFontSize(8);
    }
    let x = x0 + 1;
    row.forEach((cell, i) => {
      const clipped = doc.splitTextToSize(cell || NOT_RECORDED, cols[i].w - 2)[0] as string;
      doc.text(clipped, x, y);
      x += cols[i].w;
    });
    y += lineH;
  }
  return y + 4;
}

function heading(doc: jsPDF, text: string, y: number): number {
  if (y > 262) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(27, 127, 75);
  doc.text(text, 14, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 7;
}

function buildSummaryPdf(batch: ExportBatch, ctx: PackContext, linked: Farmer[], docs: RegulatoryDocument[], generatedAt: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logs = ctx.practices.filter((p) => linked.some((f) => f.client_uuid === p.farmer_client_uuid));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Batch Traceability Summary', 14, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Batch ${batch.batch_number}`, 14, 24);

  doc.setFillColor(255, 247, 224);
  doc.rect(14, 28, 182, 14, 'F');
  doc.setFontSize(8);
  doc.text(
    doc.splitTextToSize(
      'Compiled by TraceHarvest from recorded data. This is not a certificate and carries no regulatory authority. It does not replace the phytosanitary certificate, laboratory report or bill of lading, which are issued by the relevant authority or carrier and are listed below only if they have been uploaded.',
      178
    ),
    16,
    32
  );

  let y = heading(doc, '1. Batch', 50);
  const shipment = ctx.shipment;
  const facts: [string, string][] = [
    ['Crop', batch.crop || NOT_RECORDED],
    ['Destination', batch.destination || NOT_RECORDED],
    ['Estimated tonnage', batch.estimated_tonnage ? `${batch.estimated_tonnage} MT` : NOT_RECORDED],
    ['Created', dateText(batch.created_at_ms)],
    ['Container', batch.container_id || shipment?.container_id || NOT_RECORDED],
    ['Vessel', batch.vessel_name || shipment?.vessel_name || NOT_RECORDED],
    ['Clearance status set in dashboard', batch.export_clearance_status || NOT_RECORDED],
  ];
  doc.setFontSize(9);
  facts.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v), 70, y);
    y += 5.5;
  });

  y = heading(doc, `2. Contributing farmers (${linked.length})`, y + 4);
  y = drawTable(
    doc,
    y,
    [
      { h: 'Farmer ID', w: 34 },
      { h: 'Name', w: 40 },
      { h: 'Location', w: 44 },
      { h: 'Crop', w: 18 },
      { h: 'Farm (ha)', w: 17 },
      { h: 'Boundary', w: 29 },
    ],
    linked.map((f) => {
      const pts = polygonPointCount(f);
      return [
        f.official_farmer_id || f.client_uuid.slice(0, 8),
        f.full_name,
        [f.community, f.lga, f.state].filter(Boolean).join(', '),
        f.crop,
        f.farm_size_hectares > 0 ? String(f.farm_size_hectares) : NOT_RECORDED,
        pts >= 3 ? `${pts} points` : f.latitude || f.longitude ? 'Single point' : 'None',
      ];
    }),
    'No farmers are linked to this batch.'
  );

  y = heading(doc, '3. Deforestation check (recorded values only)', y);
  const rs = linked.map((f) => analyzeRemoteSensingTreeCover(f));
  const withFigure = rs.filter((r) => r.basis === 'RECORDED_VALUE').length;
  const onHold = rs.filter((r) => r.eudr_compliance_verdict === 'COMPLIANCE_REVIEW_HOLD').length;
  doc.setFontSize(9);
  doc.text(`${withFigure} of ${linked.length} plots have a recorded post-2020 tree-cover-loss figure; ${onHold} above the 0.1 ha review threshold.`, 14, y);
  y += 5;
  doc.setTextColor(110);
  doc.text('No satellite or forest-map source is connected, so no plot is shown as deforestation-free.', 14, y);
  doc.setTextColor(0);
  y += 9;

  y = heading(doc, `4. Agrochemical practice log (${logs.length} entries)`, y);
  y = drawTable(
    doc,
    y,
    [
      { h: 'Date', w: 22 },
      { h: 'Farmer', w: 34 },
      { h: 'Product', w: 44 },
      { h: 'NAFDAC reg. no.', w: 34 },
      { h: 'Approved', w: 20 },
      { h: 'Pre-harvest days', w: 28 },
    ],
    logs.map((p) => {
      const owner = linked.find((f) => f.client_uuid === p.farmer_client_uuid);
      return [
        dateText(p.date_applied_epoch_ms),
        owner?.official_farmer_id || p.farmer_code,
        p.product_name,
        p.nafdac_reg_no,
        p.nafdac_approved ? 'Yes' : 'No',
        String(p.pre_harvest_interval_days ?? ''),
      ];
    }),
    'No practices are logged for these farmers.'
  );

  y = heading(doc, `5. Uploaded documents linked to this batch (${docs.length})`, y);
  y = drawTable(
    doc,
    y,
    [
      { h: 'Document', w: 50 },
      { h: 'Issuer', w: 38 },
      { h: 'Certificate no.', w: 32 },
      { h: 'Expires', w: 24 },
      { h: 'Status in vault', w: 38 },
    ],
    docs.map((d) => [d.title, d.regulatory_authority, d.certificate_number || '', dateText(d.expiry_date), d.verification_status]),
    'No documents have been uploaded for this batch yet.'
  );

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Generated ${generatedAt} by TraceHarvest from recorded data`, 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' });
    doc.setTextColor(0);
  }
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Pack assembly
// ---------------------------------------------------------------------------

export async function buildCompleteAuditDossier(
  batch: ExportBatch,
  linked: Farmer[],
  ctx: PackContext
): Promise<AuditDossierResult> {
  const generatedAt = new Date().toISOString();
  const docs = documentsForBatch(batch, ctx.documents, ctx.shipment);
  const base = safeName(batch.batch_number);

  const files: PackFile[] = [];
  const addFile = async (name: string, label: string, description: string, mime: string, data: Blob | string) => {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer());
    files.push({ name, label, description, mime, data, sha256: await sha256Bytes(bytes), bytes: bytes.byteLength });
  };

  await addFile(
    `1_Batch_Traceability_Summary_${base}.pdf`,
    'Batch traceability summary',
    'Batch facts, contributing farmers, practice log and linked documents, all from recorded data.',
    'application/pdf',
    buildSummaryPdf(batch, ctx, linked, docs, generatedAt)
  );

  const annex = generateOfficialEudrAnnexIIGeoJson(linked, { commodity: 'ALL', countryOfProduction: 'NGA' });
  await addFile(
    `2_Plot_Boundaries_Annex_II_${base}.geojson`,
    'Plot boundaries (Annex II GeoJSON)',
    'Farm boundaries and recorded tree-cover-loss status per plot. Plots without a recorded figure are marked NOT_ASSESSED.',
    'application/geo+json',
    JSON.stringify(annex, null, 2)
  );

  const attached: AttachedDocument[] = [];
  for (const d of docs) {
    const bytes = dataUrlToBytes(d.file_data_url);
    const computed = bytes ? await sha256Bytes(bytes) : null;
    const stored = (d.tamper_proof_sha256 || '').toLowerCase();
    const included = !!bytes;
    attached.push({
      id: d.id,
      title: d.title,
      category: d.category,
      file_name: d.file_name,
      regulatory_authority: d.regulatory_authority,
      certificate_number: d.certificate_number || '',
      issue_date: d.issue_date,
      expiry_date: d.expiry_date || '',
      verification_status: d.verification_status,
      verified_by: d.verified_by || '',
      stored_sha256: stored,
      computed_sha256: computed,
      hash_matches: computed && stored ? computed === stored : null,
      included_in_zip: included,
    });
  }

  const rs = linked.map((f) => analyzeRemoteSensingTreeCover(f));
  const logs = ctx.practices.filter((p) => linked.some((f) => f.client_uuid === p.farmer_client_uuid));
  const stats: PackStats = {
    farmers: linked.length,
    farmersWithPolygon: linked.filter((f) => polygonPointCount(f) >= 3).length,
    practices: logs.length,
    practicesNeedingReview: logs.filter((p) => !p.nafdac_approved || p.risk_level !== 'COMPLIANT').length,
    plotsWithRecordedLossFigure: rs.filter((r) => r.basis === 'RECORDED_VALUE').length,
    plotsOnReviewHold: rs.filter((r) => r.eudr_compliance_verdict === 'COMPLIANCE_REVIEW_HOLD').length,
    documentsAttached: attached.length,
    documentsWithFile: attached.filter((a) => a.included_in_zip).length,
  };

  const manifest = {
    batch_number: batch.batch_number,
    generated_at: generatedAt,
    generated_by: 'TraceHarvest admin dashboard',
    statement:
      'Assembled from recorded data. Checksums prove the files have not changed since this pack was generated; they do not prove the underlying records are true. No certificate in this pack was issued by TraceHarvest.',
    files: Object.fromEntries(files.map((f) => [f.name, { sha256: f.sha256, bytes: f.bytes }])),
    attached_documents: attached,
    summary: stats,
  };
  await addFile(
    `3_Evidence_Manifest_${base}.json`,
    'Evidence manifest',
    'Checksums of every file in the pack and the status of each attached document.',
    'application/json',
    JSON.stringify(manifest, null, 2)
  );

  const packChecksum = await sha256Text(files.map((f) => `${f.name}:${f.sha256}`).sort().join('\n'));
  return { batchNumber: batch.batch_number, generatedAt, files, attached, stats, packChecksum };
}

export async function downloadAuditDossierZip(batch: ExportBatch, linked: Farmer[], ctx: PackContext): Promise<void> {
  const pack = await buildCompleteAuditDossier(batch, linked, ctx);
  const zip = new JSZip();
  for (const f of pack.files) zip.file(f.name, f.data);
  for (const d of documentsForBatch(batch, ctx.documents, ctx.shipment)) {
    const bytes = dataUrlToBytes(d.file_data_url);
    if (bytes) zip.file(`attached_documents/${safeName(d.id)}_${safeName(d.file_name)}`, bytes);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadFile(blob, `TRACEHARVEST_EVIDENCE_PACK_${safeName(batch.batch_number)}.zip`, 'application/zip');
}

// Helper to download an individual blob/file
export function downloadFile(blob: Blob | string, fileName: string, mimeType = 'application/octet-stream') {
  const b = typeof blob === 'string' ? new Blob([blob], { type: mimeType }) : blob;
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

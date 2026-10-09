import { Farmer, PracticeLog, ExportBatch, SyncLog, FieldAgent, RegulatoryDocument } from '../types';

// No placeholder data: every list starts empty and is filled from the live backend
// (or from records the signed-in user creates).
export const INITIAL_AGENTS: FieldAgent[] = [];
export const INITIAL_FARMERS: Farmer[] = [];
export const INITIAL_PRACTICES: PracticeLog[] = [];
export const INITIAL_BATCHES: ExportBatch[] = [];
export const INITIAL_SYNC_LOGS: SyncLog[] = [];
export const INITIAL_SHIPMENTS: import('../types').Shipment[] = [];
export const INITIAL_DISPUTES: import('../types').Dispute[] = [];
export const INITIAL_QUALITY_ALERTS: import('../types').QualityAlert[] = [];
export const INITIAL_DOCUMENTS: RegulatoryDocument[] = [];
export const INITIAL_REGISTERED_AGENTS: any[] = [];
export const INITIAL_AGENT_AUDIT_LOGS: any[] = [];

export type UserRole = 'super_admin' | 'compliance_officer' | 'fleet_manager' | 'inspector';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  agency?: string;
  updatedAt: string;
}

export interface Farmer {
  client_uuid: string;
  official_farmer_id: string;
  full_name: string;
  phone_number: string;
  state: string;
  lga: string;
  community: string;
  crop: 'Sesame' | 'Soybeans' | 'Ginger' | 'Cocoa' | 'Cashew' | 'Hibiscus' | string;
  farm_size_hectares: number;
  latitude: number;
  longitude: number;
  gps_polygon?: string; // Semicolon-delimited lat,lng pairs
  cooperative_name?: string;
  agent_id: string;
  created_at_epoch_ms: number;
  synced_at?: number;
  eudr_compliant?: boolean;
}

export interface PracticeLog {
  client_uuid: string;
  farmer_client_uuid: string;
  farmer_code: string;
  practice_type: string;
  product_name: string;
  active_ingredient: string;
  dosage: string;
  quantity_used: number;
  quantity_unit: string;
  date_applied_epoch_ms: number;
  pre_harvest_interval_days: number;
  nafdac_reg_no: string;
  nafdac_approved: boolean;
  gps_coordinates: string;
  risk_level: 'COMPLIANT' | 'FLAGGED_HIGH_RISK' | 'UNDER_REVIEW';
  phi_cleared?: boolean;
  safe_harvest_date_ms?: number;
  agent_id: string;
  verification_photo_uri?: string | null;
  synced_at?: number;
  notes?: string;
}

export interface ExportBatch {
  id?: number;
  batch_number: string;
  crop: string;
  destination: string;
  estimated_tonnage: number;
  farmer_count: number;
  farmer_client_uuids?: string[];
  export_clearance_status: 'PENDING_CLEARANCE' | 'CERTIFIED_COMPLIANT' | 'FLAGGED_QUARANTINE';
  tamper_proof_sha256: string;
  created_at_ms: number;
  certified_by?: string;
  certification_date_ms?: number;
  container_id?: string;
  vessel_name?: string;
}

export interface SyncLog {
  id?: string;
  agent_id: string;
  device_timestamp_ms: number;
  server_timestamp_ms: number;
  farmers_count: number;
  practices_count: number;
  status: string;
  message?: string;
}

export interface AgentBatchSyncRequest {
  agent_id: string;
  device_timestamp_ms: number;
  farmers: Omit<Farmer, 'official_farmer_id' | 'synced_at'>[];
  practices: Omit<PracticeLog, 'phi_cleared' | 'safe_harvest_date_ms' | 'synced_at'>[];
}

export interface AgentBatchSyncResponse {
  status: 'synced';
  synced_farmers_count: number;
  synced_practices_count: number;
  assigned_farmer_ids: Record<string, string>;
  server_timestamp_ms: number;
  message: string;
}

export interface FieldAgent {
  agent_id: string;
  name: string;
  phone: string;
  assigned_state: string;
  assigned_lga: string;
  active_status: 'online' | 'syncing' | 'offline';
  last_sync_epoch_ms: number;
  battery_level: number;
  total_farmers_enrolled: number;
  total_practices_logged: number;
}

export interface Shipment {
  id: string;
  shipment_code: string;
  destination: string;
  vessel_name: string;
  container_id: string;
  departure_date: string;
  estimated_arrival: string;
  status: 'In Transit' | 'Pending' | 'Delivered';
  batches_count: number;
  total_tonnage: number;
  carrier: string;
}

export interface Dispute {
  id: string;
  farmer_id: string;
  farmer_name: string;
  region: string;
  date: string;
  issue: string;
  details: string;
  status: 'Open' | 'Resolved';
  resolution?: string;
}

export interface QualityAlert {
  id: string;
  type: 'missing_gps' | 'missing_logs' | 'unapproved_products' | 'duplicate_farmers' | 'stale_sync';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  count: number;
  regions: string;
  actionLabel: string;
}


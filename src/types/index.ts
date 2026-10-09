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
  eudr_status?: 'EUDR_CERTIFIED' | 'COMPLIANCE_REVIEW_HOLD';
  tree_cover_loss_post_2020_ha?: number;
  tree_cover_baseline_2020_pct?: number;
  eudr_risk_score?: number;
  topology_valid?: boolean;
  topology_repaired?: boolean;
  neighbor_overlap_detected?: boolean;
  sentinel_pass_date?: string;
  sentinel_tile_id?: string;
  satellite_evidence_sha256?: string;
}

export interface EudrTopologyResult {
  is_valid: boolean;
  was_repaired: boolean;
  reasons: string[];
  original_vertex_count: number;
  cleaned_vertex_count: number;
  has_self_intersections: boolean;
  postgis_command: string;
  cleaned_polygon_coords: { lat: number; lng: number }[];
  cleaned_polygon_string: string;
  wkt_polygon: string;
  perimeter_meters: number;
  calculated_hectares: number;
}

export interface NeighborOverlapItem {
  conflicting_farmer_id: string;
  conflicting_farmer_name: string;
  conflicting_cooperative?: string;
  conflicting_crop: string;
  overlap_hectares: number;
  overlap_percentage: number;
  dispute_severity: 'LOW' | 'MEDIUM' | 'CRITICAL_DOUBLE_CLAIM';
  intersection_centroid?: { lat: number; lng: number };
}

export interface EudrOverlapReport {
  farmer_id: string;
  farmer_name: string;
  overlap_detected: boolean;
  total_overlapping_ha: number;
  conflicts: NeighborOverlapItem[];
  resolution_status: 'DISPUTE_RISK' | 'CLEARED' | 'MUTUALLY_AGREED';
}

export interface EudrRemoteSensingAnalysis {
  farmer_id: string;
  farmer_name: string;
  commodity: string;
  country: string;
  administrative_region: string;
  farm_size_hectares: number;
  baseline_cutoff_date: '2020-12-31';
  forest_baseline_2020_pct: number;
  current_tree_cover_pct: number;
  tree_cover_loss_post_2020_ha: number;
  tree_cover_loss_pct: number;
  canopy_status: '0%_LOSS_EUDR_CERTIFIED' | 'DISTURBANCE_REVIEW_HOLD';
  eudr_compliance_verdict: 'EUDR_CERTIFIED' | 'COMPLIANCE_REVIEW_HOLD';
  risk_score: number; // 0 = Certified, >0 = Hold
  copernicus_sentinel: {
    sensor: string;
    tile_id: string;
    acquisition_date: string;
    cloud_cover_pct: number;
    mean_ndvi_2020: number;
    mean_ndvi_current: number;
    ndvi_drop_delta: number;
  };
  satellite_evidence_sha256: string;
  timestamped_evidence_summary: string;
}

export interface EudrAnnexIIProperties {
  commodity: string;
  country_of_production: string;
  eudr_due_diligence_id: string;
  operator_name?: string;
  operator_eori?: string;
  export_batch_id?: string;
  regulation_standard?: string;
  cutoff_date?: string;
  generation_timestamp?: string;
  total_plots_count?: number;
  total_certified_hectares?: number;
}

export interface EudrAnnexIIFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lng, lat], [lng, lat], ... ] ]
  };
  properties: {
    farmer_id: string;
    farmer_name: string;
    commodity: string;
    country_of_production: string;
    administrative_region: string;
    farm_size_hectares: number;
    eudr_compliance_status: 'EUDR_CERTIFIED' | 'COMPLIANCE_REVIEW_HOLD';
    tree_cover_loss_post_2020_ha: number;
    tree_cover_baseline_2020_pct: number;
    current_tree_cover_pct: number;
    sentinel2_acquisition_date: string;
    sentinel2_tile_id: string;
    postgis_topology_status: string;
    neighbor_overlap_detected: boolean;
    tamper_proof_evidence_sha256: string;
  };
}

export interface EudrAnnexIIFeatureCollection {
  type: 'FeatureCollection';
  properties: EudrAnnexIIProperties;
  features: EudrAnnexIIFeature[];
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
  documents?: RegulatoryDocument[];
}

export interface AgentBatchSyncResponse {
  status: 'synced' | 'success';
  synced_farmers_count: number;
  synced_practices_count: number;
  synced_batches_count?: number;
  synced_documents_count?: number;
  assigned_farmer_ids: Record<string, string>;
  server_timestamp_ms: number;
  message: string;
}

export type DocumentCategory =
  | 'PHYTOSANITARY'
  | 'EUDR_DEFORESTATION'
  | 'LAB_MRL_ANALYSIS'
  | 'BILL_OF_LADING'
  | 'FARMER_KYC_LAND'
  | 'SPRAY_PURCHASE_RECEIPT'
  | 'GAP_INSPECTION_AUDIT';

export type DocumentStatus = 'VERIFIED_COMPLIANT' | 'PENDING_REVIEW' | 'FLAGGED';

export interface RegulatoryDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  entity_type: 'FARMER' | 'BATCH' | 'SHIPMENT' | 'AGENT' | 'GLOBAL';
  entity_id: string;
  entity_name?: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  file_data_url?: string;
  tamper_proof_sha256: string;
  regulatory_authority: string;
  certificate_number?: string;
  issue_date: string;
  expiry_date?: string;
  verification_status: DocumentStatus;
  uploaded_by: string;
  uploader_source: 'mobile_agent' | 'web_admin';
  uploaded_at: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  raw_metadata?: Record<string, any>;
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

export interface ConnectionStrengthReport {
  timestamp_ms: number;
  gateway: {
    reachable: boolean;
    http_status: number;
    latency_ms: number;
    gateway_url: string;
    server_time: string;
  };
  downstream_cache: {
    reachable: boolean;
    http_status: number;
    latency_ms: number;
    record_count: number;
  };
  database?: {
    status: string;
    farmers_count: number;
    practices_count: number;
    batches_count: number;
    documents_count: number;
    sync_logs_count: number;
  };
  mobile_link: {
    active_mobile_devices: number;
    online_agents_count: number;
    total_agents_count: number;
    latest_sync_timestamp_ms: number | null;
    time_since_latest_sync_sec: number | null;
    latest_sync_agent_id: string | null;
    is_mobile_transmitting: boolean;
  };
  strength_score: number; // 0 - 100
  signal_level: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'WEAK' | 'DISCONNECTED';
  bars: number; // 0 to 4
  verdict: string;
}

// ==============================================================================
// Field Agent Self-Registration, Approval & Audit Types
// ==============================================================================

export type AgentStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface RegisteredAgent {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  association: string;
  location: string;
  status: AgentStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Field statistics (populated once active)
  total_farmers_enrolled?: number;
  total_practices_logged?: number;
}

export interface AgentAuditLog {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: 'self_register' | 'approve' | 'reject' | 'suspend' | 'reinstate' | 'profile_update';
  target_agent_id: string;
  target_agent_name?: string;
  details: {
    status?: AgentStatus;
    from_status?: AgentStatus;
    to_status?: AgentStatus;
    rejection_reason?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    association?: string;
    location?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  created_at: string;
}

export interface AgentRegistrationPayload {
  full_name: string;
  email: string;
  phone: string;
  association: string;
  location: string;
  password?: string;
}

export interface AgentReviewActionPayload {
  action: 'approve' | 'reject' | 'suspend' | 'reinstate';
  rejection_reason?: string;
  notes?: string;
  reviewed_by?: string;
}


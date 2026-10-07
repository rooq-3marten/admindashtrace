from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# 1. Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int = 604800

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 2. Farmer Schemas
class FarmerCreate(BaseModel):
    id: Optional[str] = None
    client_uuid: Optional[str] = None
    farmer_code: Optional[str] = None
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    lga: Optional[str] = None
    community: Optional[str] = None
    crop: Optional[str] = None
    crop_type: Optional[str] = None
    farm_size_hectares: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    gps_polygon: Optional[str] = None
    cooperative_name: Optional[str] = None
    cooperative: Optional[str] = None
    agent_id: Optional[str] = None
    source: Optional[str] = "agent"

class FarmerOut(BaseModel):
    id: str
    farmer_code: str
    name: str
    phone: str
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    crop_type: str
    cooperative: Optional[str] = None
    enrolled_by_agent_id: Optional[str] = None
    source: str
    created_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 3. Practice Log Schemas
class PracticeLogCreate(BaseModel):
    id: Optional[str] = None
    client_uuid: Optional[str] = None
    farmer_id: Optional[str] = None
    farmer_client_uuid: Optional[str] = None
    farmer_code: Optional[str] = None
    practice_type: str
    product_name: Optional[str] = None
    active_ingredient: Optional[str] = None
    dosage: Optional[str] = None
    quantity: Optional[float] = None
    quantity_used: Optional[float] = None
    quantity_unit: Optional[str] = None
    log_date: Optional[datetime] = None
    date_applied_epoch_ms: Optional[int] = None
    source: Optional[str] = "agent"
    agent_id: Optional[str] = None

class PracticeLogOut(BaseModel):
    id: str
    farmer_id: str
    practice_type: str
    product_name: Optional[str] = None
    quantity: float
    log_date: datetime
    source: str
    agent_id: Optional[str] = None
    created_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 4. Batch Schemas
class BatchCreate(BaseModel):
    id: Optional[str] = None
    client_uuid: Optional[str] = None
    batch_code: Optional[str] = None
    crop: Optional[str] = None
    agent_id: Optional[str] = None
    total_quantity: float = 0.0
    quality_grade: str = "Grade A Export Ready"
    aggregation_gps_lat: Optional[float] = None
    aggregation_gps_lng: Optional[float] = None
    farmer_ids: List[str] = []
    farmer_codes: List[str] = []

class BatchOut(BaseModel):
    id: str
    batch_code: str
    agent_id: Optional[str] = None
    total_quantity: float
    quality_grade: str
    aggregation_gps_lat: Optional[float] = None
    aggregation_gps_lng: Optional[float] = None
    created_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 4b. Document Schemas
class DocumentCreate(BaseModel):
    id: Optional[str] = None
    title: str
    category: str
    entity_type: str
    entity_id: str
    entity_name: Optional[str] = None
    file_name: str
    file_size_bytes: Optional[int] = 0
    mime_type: Optional[str] = "application/pdf"
    file_url: Optional[str] = None
    tamper_proof_sha256: Optional[str] = None
    regulatory_authority: str
    certificate_number: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    verification_status: Optional[str] = "PENDING_REVIEW"
    uploaded_by: Optional[str] = "mobile_agent"
    uploader_source: Optional[str] = "mobile_agent"
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None

class DocumentVerify(BaseModel):
    verification_status: str # VERIFIED_COMPLIANT, FLAGGED, PENDING_REVIEW
    verified_by: str
    verification_notes: Optional[str] = None

class DocumentOut(BaseModel):
    id: str
    title: str
    category: str
    entity_type: str
    entity_id: str
    entity_name: Optional[str] = None
    file_name: str
    file_size_bytes: int
    mime_type: str
    file_url: Optional[str] = None
    tamper_proof_sha256: str
    regulatory_authority: str
    certificate_number: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    verification_status: str
    uploaded_by: str
    uploader_source: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 5. Bulk Sync Schemas (Android WorkManager)
class BulkSyncRequest(BaseModel):
    agent_id: Optional[str] = None
    device_id: Optional[str] = None
    device_timestamp_ms: Optional[int] = None
    farmers: List[FarmerCreate] = []
    practices: List[PracticeLogCreate] = []
    batches: List[BatchCreate] = []
    documents: List[DocumentCreate] = []

class SyncRecordResult(BaseModel):
    id: str
    status: str
    server_id: Optional[str] = None
    code: Optional[str] = None

class BulkSyncResponse(BaseModel):
    status: str
    synced_farmers_count: int
    synced_practices_count: int
    synced_batches_count: int
    synced_documents_count: int = 0
    assigned_farmer_ids: Dict[str, str] = {}
    results: List[SyncRecordResult] = []
    server_timestamp_ms: int
    message: str

class SyncStatusResponse(BaseModel):
    agent_id: str
    last_sync_at: Optional[datetime] = None
    pending_count: int = 0
    status: str = "ACTIVE"
    sync_health: str = "HEALTHY"

# 6. Admin Overview & System Status
class AdminOverviewKPI(BaseModel):
    total_farmers: int
    total_hectares: float
    total_batches: int
    total_tonnage: float
    active_agents: int
    export_ready_percentage: float
    pending_syncs_count: int
    action_required_count: int

class SystemStatusResponse(BaseModel):
    api_status: str
    database_status: str
    sync_latency_ms: int
    active_agent_connections: int
    sync_success_rate_percent: float
    version: str = "1.0.0"
    server_time: datetime

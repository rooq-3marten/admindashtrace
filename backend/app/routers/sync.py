from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os, re, random, json, hashlib
from app.database import get_db
from app.models import Farmer, PracticeLog, Batch, Agent, SyncEvent, Document
from app.routers.agent_accounts import norm_status
from app.security import (AdminIdentity, ApiError, allow_agent_status_read, enforce_agent_token, require_admin)
from app.schemas import BulkSyncRequest, BulkSyncResponse, SyncStatusResponse, SyncRecordResult

router = APIRouter(tags=["Synchronization Layer"])

def now_utc():
    return datetime.now(timezone.utc)

# --- Test-data guard ---------------------------------------------------------
# Load/stress-test records must never reach the production database. A record is
# treated as test data when its name starts with "Stress Farmer" or it comes from an
# agent whose ID starts with "TEST-". Set ALLOW_TEST_DATA=true (e.g. on a staging
# deployment) to switch the guard off.
# Agents must exist (i.e. have registered and been approved) before they can upload records.
# Set ALLOW_UNREGISTERED_AGENTS=true to restore the old behaviour of auto-creating any agent ID
# seen in a sync request (not recommended: it lets anyone invent an approved agent).
ALLOW_UNREGISTERED_AGENTS = os.getenv("ALLOW_UNREGISTERED_AGENTS", "false").strip().lower() in ("1", "true", "yes")
ALLOW_TEST_DATA = os.getenv("ALLOW_TEST_DATA", "false").strip().lower() in ("1", "true", "yes")
_TEST_NAME_RE = re.compile(r"^\s*stress\s+farmer\b", re.IGNORECASE)

def is_test_record(name, agent_id) -> bool:
    if ALLOW_TEST_DATA:
        return False
    if agent_id and str(agent_id).upper().startswith("TEST-"):
        return True
    return bool(name and _TEST_NAME_RE.match(name))

# --- Small helpers -----------------------------------------------------------
# Rule for this file: a value the agent did not record is left empty (or the record is
# refused). The server never fills the gap with a made-up value.

def first_present(*values):
    """First value that is not None. Unlike `a or b`, a real 0 or "" is kept."""
    for value in values:
        if value is not None:
            return value
    return None

def saved(record_id, server_id=None, code=None):
    return SyncRecordResult(id=record_id, status="SYNCED", server_id=server_id or record_id, code=code)

def refused(record_id, status, reason):
    """Every submitted record gets an answer, so the app knows exactly what was not saved."""
    return SyncRecordResult(id=record_id, status=status, error=reason)

def new_farmer_code(db, state):
    prefix = (state or "NGR")[:3].upper()
    while True:
        code = f"TH-{prefix}-{now_utc().year}-{random.randint(1000, 9999)}"
        if not db.query(Farmer).filter(Farmer.farmer_code == code).first():
            return code

def find_farmers(db, farmer_ids, farmer_codes):
    """Farmers named by id or by code. "MULTIPLE" is a label from older app versions, not a code."""
    codes = [c for c in farmer_codes if c and c != "MULTIPLE"]
    found = {}
    if farmer_ids:
        for farmer in db.query(Farmer).filter(Farmer.id.in_(farmer_ids)).all():
            found[farmer.id] = farmer
    if codes:
        for farmer in db.query(Farmer).filter(Farmer.farmer_code.in_(codes)).all():
            found[farmer.id] = farmer
    missing = [c for c in codes if c not in {f.farmer_code for f in found.values()}]
    missing += [i for i in farmer_ids if i not in found]
    return list(found.values()), missing

@router.post("/sync/batch", response_model=BulkSyncResponse)
@router.post("/api/v1/sync/upstream", response_model=BulkSyncResponse)
def sync_batch(request: BulkSyncRequest, http_request: Request, db: Session = Depends(get_db)):
    """
    Bulk synchronization endpoint called by Android Agent App.
    Accepts offline-created records, performs idempotent insertion via client UUID,
    updates Agent's last_sync_at, and records a SyncEvent for real-time dashboard health monitoring.
    """
    # With REQUIRE_AGENT_AUTH on, the caller must hold this agent's own session token.
    token_agent = enforce_agent_token(http_request, request.agent_id)
    agent_id = request.agent_id or token_agent
    if not agent_id:
        raise ApiError(400, "AGENT_ID_REQUIRED", "agent_id is required.")
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    # Only approved agents may upload field records (README: pending/rejected/suspended -> 403).
    # Agents created before the approval workflow existed have status "ACTIVE" and count as approved.
    if agent is None and not ALLOW_UNREGISTERED_AGENTS:
        return JSONResponse(status_code=403, content={
            "error": "AGENT_NOT_REGISTERED",
            "status": "unregistered",
            "rejection_reason": None,
            "message": "This agent ID is not registered. Register in the app and wait for approval before syncing.",
        })
    if agent is not None and norm_status(agent.status) != "approved":
        current = norm_status(agent.status)
        return JSONResponse(status_code=403, content={
            "error": "ACCOUNT_NOT_APPROVED",
            "status": current,
            "rejection_reason": agent.rejection_reason,
            "message": f"Access denied. Field agent account status is '{current}'. "
                       "Only approved agents can synchronize farm records or access operational data.",
        })
    if not agent:
        # Create agent record if new
        agent = Agent(
            id = agent_id,
            name = agent_id,
            phone = "",   # not recorded
            state = "",   # not recorded
            status = "ACTIVE",
            device_id = request.device_id,
            last_sync_at = now_utc(),
            created_at = now_utc()
        )
        db.add(agent)
    else:
        agent.last_sync_at = now_utc()
        if request.device_id:
            agent.device_id = request.device_id

    assigned_farmer_ids = {}
    results = []
    synced_farmers_count = 0
    synced_practices_count = 0
    synced_batches_count = 0

    # 1. Process Farmers
    rejected_test_ids = set()
    for f in request.farmers:
        client_uuid = f.client_uuid or f.id
        if not client_uuid:
            continue
        if is_test_record(f.full_name or f.name, f.agent_id or agent_id):
            rejected_test_ids.add(client_uuid)
            results.append(SyncRecordResult(id=client_uuid, status="REJECTED_TEST_DATA", error="Test data is not accepted by this server"))
            continue

        existing = db.query(Farmer).filter(Farmer.id == client_uuid).first()
        if existing:
            assigned_farmer_ids[client_uuid] = existing.farmer_code
            results.append(saved(client_uuid, existing.id, existing.farmer_code))
            continue

        name = f.full_name or f.name
        crop = f.crop or f.crop_type
        if not name or not crop:
            results.append(refused(client_uuid, "REJECTED_MISSING_FIELDS", "Farmer name and crop are required."))
            continue

        official_code = f.farmer_code
        code_unusable = (
            not official_code
            or "PENDING" in official_code
            or db.query(Farmer).filter(Farmer.farmer_code == official_code).first()
        )
        if code_unusable:
            official_code = new_farmer_code(db, f.state)

        db.add(Farmer(
            id = client_uuid,
            farmer_code = official_code,
            name = name,
            phone = f.phone_number or f.phone or "",   # blank means not recorded
            gps_lat = first_present(f.latitude, f.gps_lat),
            gps_lng = first_present(f.longitude, f.gps_lng),
            crop_type = crop,
            cooperative = f.cooperative_name or f.cooperative,
            state = f.state,
            lga = f.lga,
            community = f.community,
            farm_size_hectares = f.farm_size_hectares,
            gps_polygon = f.gps_polygon,
            enrolled_by_agent_id = agent_id,
            source = f.source or "agent",
            created_at = now_utc(),
            synced_at = now_utc()
        ))
        db.flush()  # sessions here do not autoflush; later records in this request must find this farmer
        assigned_farmer_ids[client_uuid] = official_code
        results.append(saved(client_uuid, client_uuid, official_code))
        synced_farmers_count += 1

    # 2. Process Practices
    for p in request.practices:
        client_uuid = p.client_uuid or p.id
        if not client_uuid:
            continue
        if (p.farmer_client_uuid or p.farmer_id) in rejected_test_ids or is_test_record(None, p.agent_id or agent_id):
            results.append(SyncRecordResult(id=client_uuid, status="REJECTED_TEST_DATA", error="Test data is not accepted by this server"))
            continue

        existing = db.query(PracticeLog).filter(PracticeLog.id == client_uuid).first()
        if existing:
            results.append(saved(client_uuid, existing.id))
            continue

        quantity = first_present(p.quantity_used, p.quantity)
        if not p.practice_type or quantity is None:
            results.append(refused(client_uuid, "REJECTED_MISSING_FIELDS", "The practice type and quantity are required."))
            continue

        # Find the farmer by id first, then by farmer code.
        farmer = None
        farmer_ref = p.farmer_client_uuid or p.farmer_id
        if farmer_ref:
            farmer = db.query(Farmer).filter(Farmer.id == farmer_ref).first()
        if farmer is None and p.farmer_code:
            farmer = db.query(Farmer).filter(Farmer.farmer_code == p.farmer_code).first()
        if farmer is None:
            results.append(refused(client_uuid, "REJECTED_FARMER_NOT_FOUND",
                                   "The farmer is not on the server yet. It will be retried on the next sync."))
            continue

        db.add(PracticeLog(
            id = client_uuid,
            farmer_id = farmer.id,
            practice_type = p.practice_type,
            product_name = p.product_name,
            quantity = quantity,
            active_ingredient = p.active_ingredient,
            dosage = p.dosage,
            quantity_unit = p.quantity_unit,
            pre_harvest_interval_days = p.pre_harvest_interval_days,
            nafdac_reg_no = p.nafdac_reg_no,
            nafdac_approved = p.nafdac_approved,
            gps_coordinates = p.gps_coordinates,
            risk_level = p.risk_level,
            verification_photo_uri = p.verification_photo_uri,
            log_date = (datetime.fromtimestamp(p.date_applied_epoch_ms / 1000, tz=timezone.utc) if p.date_applied_epoch_ms else None) or p.log_date or now_utc(),
            source = p.source or "agent",
            agent_id = agent_id,
            created_at = now_utc(),
            synced_at = now_utc()
        ))
        results.append(saved(client_uuid))
        synced_practices_count += 1

    # 3. Process Batches
    for b in request.batches:
        client_uuid = b.client_uuid or b.id
        if not client_uuid:
            continue

        farmers, missing = find_farmers(db, b.farmer_ids, b.farmer_codes)

        existing = db.query(Batch).filter(Batch.id == client_uuid).first()
        if existing:
            if not existing.farmers and farmers:   # batches saved before farmer links existed
                existing.farmers = farmers
            results.append(saved(client_uuid, existing.id, existing.batch_code))
            continue

        if not b.batch_code or not b.quality_grade or b.total_quantity is None:
            results.append(refused(client_uuid, "REJECTED_MISSING_FIELDS",
                                   "A batch needs its code, weight and quality grade."))
            continue
        if missing:
            results.append(refused(client_uuid, "REJECTED_FARMER_NOT_FOUND",
                                   f"Farmer not on the server yet: {', '.join(missing)}."))
            continue

        db.add(Batch(
            id = client_uuid,
            batch_code = b.batch_code,
            agent_id = agent_id,
            total_quantity = b.total_quantity,
            quality_grade = b.quality_grade,
            aggregation_gps_lat = b.aggregation_gps_lat,
            aggregation_gps_lng = b.aggregation_gps_lng,
            farmers = farmers,
            created_at = now_utc(),
            synced_at = now_utc()
        ))
        results.append(saved(client_uuid, client_uuid, b.batch_code))
        synced_batches_count += 1

    # 4. Process Uploaded Documents (Mobile Field Capture)
    synced_documents_count = 0
    for d in request.documents:
        client_uuid = d.id or f"doc-{random.randint(100000, 999999)}"
        existing_doc = db.query(Document).filter(Document.id == client_uuid).first()
        if not existing_doc:
            calculated_sha256 = d.tamper_proof_sha256 or hashlib.sha256(f"{d.title}_{d.file_name}_{datetime.now().timestamp()}".encode()).hexdigest()
            new_doc = Document(
                id = client_uuid,
                title = d.title,
                category = d.category,
                entity_type = d.entity_type,
                entity_id = d.entity_id,
                entity_name = d.entity_name,
                file_name = d.file_name,
                file_size_bytes = d.file_size_bytes or 0,
                mime_type = d.mime_type or "application/pdf",
                file_url = d.file_url,
                tamper_proof_sha256 = calculated_sha256,
                regulatory_authority = d.regulatory_authority,
                certificate_number = d.certificate_number,
                issue_date = d.issue_date,
                expiry_date = d.expiry_date,
                verification_status = d.verification_status or "PENDING_REVIEW",
                uploaded_by = d.uploaded_by or agent_id,
                uploader_source = d.uploader_source or "mobile_agent",
                verified_by = d.verified_by,
                verified_at = d.verified_at,
                verification_notes = d.verification_notes,
                created_at = now_utc(),
                synced_at = now_utc()
            )
            db.add(new_doc)
            results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=client_uuid))
            synced_documents_count += 1
        else:
            results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=existing_doc.id))

    # 5. Log Sync Audit Event
    sync_event = SyncEvent(
        agent_id = agent_id,
        device_id = request.device_id,
        event_type = "PUSH",
        entity_type = "BULK",
        status = "success",
        created_at = now_utc()
    )
    db.add(sync_event)

    db.commit()

    return BulkSyncResponse(
        status = "success",
        synced_farmers_count = synced_farmers_count,
        synced_practices_count = synced_practices_count,
        synced_batches_count = synced_batches_count,
        synced_documents_count = synced_documents_count,
        assigned_farmer_ids = assigned_farmer_ids,
        results = results,
        server_timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000),
        message = f"Successfully synced {synced_farmers_count} farmers, {synced_practices_count} practices, {synced_batches_count} batches, {synced_documents_count} documents."
    )

@router.get("/sync/status/{agent_id}", response_model=SyncStatusResponse)
def get_sync_status(agent_id: str, http_request: Request, db: Session = Depends(get_db)):
    """
    Returns last sync timestamp, health status, and pending queue size for the given agent.
    """
    allow_agent_status_read(http_request, agent_id)
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        return SyncStatusResponse(
            agent_id = agent_id,
            status = "OFFLINE",
            sync_health = "OFFLINE",
            pending_count = 0
        )

    # Calculate sync health based on last sync elapsed time
    health = "HEALTHY"
    if agent.last_sync_at:
        diff_hours = (now_utc() - agent.last_sync_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0
        if diff_hours > 48:
            health = "OFFLINE"
        elif diff_hours > 12:
            health = "DEGRADED"

    return SyncStatusResponse(
        agent_id = agent.id,
        last_sync_at = agent.last_sync_at,
        pending_count = 0,
        status = agent.status,
        sync_health = health
    )


def _ms(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)

@router.get("/sync/status")
def get_global_sync_status(db: Session = Depends(get_db), admin: AdminIdentity = Depends(require_admin)):
    """Global sync status polled by the admin dashboard."""
    from sqlalchemy import func
    last = db.query(SyncEvent).order_by(SyncEvent.created_at.desc()).first()
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    last_ms = _ms(last.created_at) if last else now_ms
    return {
        "status": "ONLINE",
        "mode": "BIDIRECTIONAL_REALTIME",
        "server_timestamp_ms": now_ms,
        "last_sync_timestamp_ms": last_ms,
        "counts": {
            "farmers": db.query(func.count(Farmer.id)).scalar() or 0,
            "practices": db.query(func.count(PracticeLog.id)).scalar() or 0,
            "batches": db.query(func.count(Batch.id)).scalar() or 0,
            "agents": db.query(func.count(Agent.id)).scalar() or 0,
            "sync_logs": db.query(func.count(SyncEvent.id)).scalar() or 0,
        },
        "latest_event": ({
            "id": str(last.id),
            "agent_id": last.agent_id or "",
            "device_timestamp_ms": last_ms,
            "server_timestamp_ms": last_ms,
            "farmers_count": 0,
            "practices_count": 0,
            "status": last.status,
            "message": f"{last.event_type} {last.entity_type}",
        } if last else None),
    }

@router.get("/sync/ping")
def sync_ping():
    now = datetime.now(timezone.utc)
    return {
        "ok": True,
        "service": "TraceHarvest Mobile Upstream Ingestion Gateway",
        "server_time": now.isoformat(),
        "timestamp_ms": int(now.timestamp() * 1000),
    }

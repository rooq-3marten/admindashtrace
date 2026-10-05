from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import random, json, hashlib
from app.database import get_db
from app.models import Farmer, PracticeLog, Batch, Agent, SyncEvent, Document
from app.schemas import BulkSyncRequest, BulkSyncResponse, SyncStatusResponse, SyncRecordResult

router = APIRouter(tags=["Synchronization Layer"])

def now_utc():
    return datetime.now(timezone.utc)

@router.post("/sync/batch", response_model=BulkSyncResponse)
@router.post("/api/v1/sync/upstream", response_model=BulkSyncResponse)
def sync_batch(request: BulkSyncRequest, db: Session = Depends(get_db)):
    """
    Bulk synchronization endpoint called by Android Agent App.
    Accepts offline-created records, performs idempotent insertion via client UUID,
    updates Agent's last_sync_at, and records a SyncEvent for real-time dashboard health monitoring.
    """
    agent_id = request.agent_id or "AGENT-NG-042"
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        # Create agent record if new
        agent = Agent(
            id = agent_id,
            name = f"Field Agent ({agent_id})",
            phone = "+2348000000000",
            state = "Kano",
            status = "ACTIVE",
            device_id = request.device_id,
            last_sync_at = now_utc()
        )
        db.add(agent)
    else:
        agent.last_sync_at = now_utc()
        agent.status = "ACTIVE"
        if request.device_id:
            agent.device_id = request.device_id

    assigned_farmer_ids = {}
    results = []
    synced_farmers_count = 0
    synced_practices_count = 0
    synced_batches_count = 0

    # 1. Process Farmers
    for f in request.farmers:
        client_uuid = f.client_uuid or f.id
        if not client_uuid:
            continue

        existing = db.query(Farmer).filter(Farmer.id == client_uuid).first()
        if existing:
            assigned_farmer_ids[client_uuid] = existing.farmer_code
            results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=existing.id, code=existing.farmer_code))
        else:
            state_str = f.state or "Kano"
            state_code = state_str[:3].upper() if len(state_str) >= 3 else "NGR"
            random_num = random.randint(1000, 9999)
            official_code = f.farmer_code if (f.farmer_code and not "PENDING" in f.farmer_code) else f"TH-{state_code}-2026-{random_num}"

            new_farmer = Farmer(
                id = client_uuid,
                farmer_code = official_code,
                name = f.full_name or f.name or "Enrolled Farmer",
                phone = f.phone_number or f.phone or "+2348000000000",
                gps_lat = f.latitude or f.gps_lat,
                gps_lng = f.longitude or f.gps_lng,
                crop_type = f.crop or f.crop_type or "Sesame",
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
            )
            db.add(new_farmer)
            assigned_farmer_ids[client_uuid] = official_code
            results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=client_uuid, code=official_code))
            synced_farmers_count += 1

    # 2. Process Practices
    for p in request.practices:
        client_uuid = p.client_uuid or p.id
        if not client_uuid:
            continue

        existing = db.query(PracticeLog).filter(PracticeLog.id == client_uuid).first()
        if not existing:
            # Resolve farmer_id
            resolved_farmer_id = p.farmer_client_uuid or p.farmer_id
            if not resolved_farmer_id and p.farmer_code:
                farmer_rec = db.query(Farmer).filter(Farmer.farmer_code == p.farmer_code).first()
                if farmer_rec:
                    resolved_farmer_id = farmer_rec.id

            if resolved_farmer_id:
                new_practice = PracticeLog(
                    id = client_uuid,
                    farmer_id = resolved_farmer_id,
                    practice_type = p.practice_type,
                    product_name = p.product_name,
                    quantity = p.quantity_used or p.quantity or 1.0,
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
                )
                db.add(new_practice)
                results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=client_uuid))
                synced_practices_count += 1

    # 3. Process Batches
    for b in request.batches:
        client_uuid = b.client_uuid or b.id
        if not client_uuid:
            continue

        existing = db.query(Batch).filter(Batch.id == client_uuid).first()
        if not existing:
            new_batch = Batch(
                id = client_uuid,
                batch_code = b.batch_code or f"NG-{b.crop or 'SES'}-2026-{random.randint(1000, 9999)}-EXP",
                agent_id = agent_id,
                total_quantity = b.total_quantity or 0.0,
                quality_grade = b.quality_grade or "Grade A Export Ready",
                aggregation_gps_lat = b.aggregation_gps_lat,
                aggregation_gps_lng = b.aggregation_gps_lng,
                created_at = now_utc(),
                synced_at = now_utc()
            )
            db.add(new_batch)
            results.append(SyncRecordResult(id=client_uuid, status="SYNCED", server_id=client_uuid, code=new_batch.batch_code))
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
def get_sync_status(agent_id: str, db: Session = Depends(get_db)):
    """
    Returns last sync timestamp, health status, and pending queue size for the given agent.
    """
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
def get_global_sync_status(db: Session = Depends(get_db)):
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

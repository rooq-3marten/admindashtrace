from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid, random
from datetime import datetime, timezone
from app.database import get_db
from app.models import Batch, Farmer, Agent
from app.schemas import BatchCreate, BatchOut

router = APIRouter(tags=["Batches"])

@router.post("/batches", response_model=BatchOut)
def create_batch(payload: BatchCreate, db: Session = Depends(get_db)):
    """
    Direct batch creation called by Agent App.
    """
    batch_id = payload.id or payload.client_uuid or str(uuid.uuid4())
    existing = db.query(Batch).filter(Batch.id == batch_id).first()
    if existing:
        return existing

    batch_code = payload.batch_code or f"NG-{(payload.crop or 'SES')[:3].upper()}-2026-{random.randint(1000, 9999)}-EXP"

    batch = Batch(
        id = batch_id,
        batch_code = batch_code,
        agent_id = payload.agent_id or "AGENT-NG-042",
        total_quantity = payload.total_quantity,
        quality_grade = payload.quality_grade,
        aggregation_gps_lat = payload.aggregation_gps_lat,
        aggregation_gps_lng = payload.aggregation_gps_lng,
        created_at = datetime.now(timezone.utc),
        synced_at = datetime.now(timezone.utc)
    )

    # Link farmers if supplied
    farmer_ids = list(payload.farmer_ids)
    if payload.farmer_codes:
        f_records = db.query(Farmer).filter(Farmer.farmer_code.in_(payload.farmer_codes)).all()
        for f in f_records:
            if f.id not in farmer_ids:
                farmer_ids.append(f.id)

    if farmer_ids:
        farmers = db.query(Farmer).filter(Farmer.id.in_(farmer_ids)).all()
        batch.farmers = farmers

    db.add(batch)

    if payload.agent_id:
        agent = db.query(Agent).filter(Agent.id == payload.agent_id).first()
        if agent:
            agent.last_sync_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(batch)
    return batch

@router.get("/batches", response_model=List[BatchOut])
def list_batches(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    return db.query(Batch).order_by(Batch.created_at.desc()).offset(offset).limit(limit).all()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from app.database import get_db
from app.models import PracticeLog, Farmer, Agent
from app.schemas import PracticeLogCreate, PracticeLogOut

router = APIRouter(tags=["Practice Logs"])

@router.post("/practice-logs", response_model=PracticeLogOut)
def create_practice_log(payload: PracticeLogCreate, db: Session = Depends(get_db)):
    """
    Direct practice log creation called by Agent App.
    """
    log_id = payload.id or payload.client_uuid or str(uuid.uuid4())
    existing = db.query(PracticeLog).filter(PracticeLog.id == log_id).first()
    if existing:
        return existing

    farmer_id = payload.farmer_id or payload.farmer_client_uuid
    if not farmer_id and payload.farmer_code:
        farmer = db.query(Farmer).filter(Farmer.farmer_code == payload.farmer_code).first()
        if farmer:
            farmer_id = farmer.id

    if not farmer_id:
        raise HTTPException(status_code=400, detail="farmer_id or valid farmer_code is required")

    log_date = payload.log_date
    if not log_date and payload.date_applied_epoch_ms:
        log_date = datetime.fromtimestamp(payload.date_applied_epoch_ms / 1000.0, timezone.utc)
    if not log_date:
        log_date = datetime.now(timezone.utc)

    practice = PracticeLog(
        id = log_id,
        farmer_id = farmer_id,
        practice_type = payload.practice_type,
        product_name = payload.product_name,
        quantity = payload.quantity_used or payload.quantity or 1.0,
        log_date = log_date,
        source = payload.source or "agent",
        agent_id = payload.agent_id or "AGENT-NG-042",
        created_at = datetime.now(timezone.utc),
        synced_at = datetime.now(timezone.utc)
    )
    db.add(practice)

    if payload.agent_id:
        agent = db.query(Agent).filter(Agent.id == payload.agent_id).first()
        if agent:
            agent.last_sync_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(practice)
    return practice

@router.get("/practice-logs", response_model=List[PracticeLogOut])
def list_practice_logs(
    farmer_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(PracticeLog)
    if farmer_id:
        query = query.filter(PracticeLog.farmer_id == farmer_id)
    return query.order_by(PracticeLog.created_at.desc()).offset(offset).limit(limit).all()

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid, random
from datetime import datetime, timezone
from app.database import get_db
from app.models import Farmer, Agent
from app.schemas import FarmerCreate, FarmerOut

router = APIRouter(tags=["Farmers"])

@router.post("/farmers", response_model=FarmerOut)
def create_farmer(payload: FarmerCreate, db: Session = Depends(get_db)):
    """
    Direct farmer enrollment endpoint called by Agent App.
    """
    farmer_id = payload.id or payload.client_uuid or str(uuid.uuid4())
    
    # Check if already exists
    existing = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if existing:
        return existing

    state_code = (payload.state or "KAN")[:3].upper()
    random_num = random.randint(1000, 9999)
    farmer_code = payload.farmer_code or f"TH-{state_code}-2026-{random_num}"

    farmer = Farmer(
        id = farmer_id,
        farmer_code = farmer_code,
        name = payload.full_name or payload.name or "Enrolled Farmer",
        phone = payload.phone_number or payload.phone or "+2348000000000",
        gps_lat = payload.latitude or payload.gps_lat,
        gps_lng = payload.longitude or payload.gps_lng,
        crop_type = payload.crop or payload.crop_type or "Sesame",
        cooperative = payload.cooperative_name or payload.cooperative,
        enrolled_by_agent_id = payload.agent_id or "AGENT-NG-042",
        source = payload.source or "agent",
        created_at = datetime.now(timezone.utc),
        synced_at = datetime.now(timezone.utc)
    )
    db.add(farmer)

    # Touch agent sync
    if payload.agent_id:
        agent = db.query(Agent).filter(Agent.id == payload.agent_id).first()
        if agent:
            agent.last_sync_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(farmer)
    return farmer

@router.get("/farmers", response_model=List[FarmerOut])
def list_farmers(
    crop: Optional[str] = None,
    agent_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Farmer)
    if crop:
        query = query.filter(Farmer.crop_type.ilike(f"%{crop}%"))
    if agent_id:
        query = query.filter(Farmer.enrolled_by_agent_id == agent_id)
    if search:
        query = query.filter(
            (Farmer.name.ilike(f"%{search}%")) |
            (Farmer.farmer_code.ilike(f"%{search}%")) |
            (Farmer.phone.ilike(f"%{search}%"))
        )
    return query.order_by(Farmer.created_at.desc()).offset(offset).limit(limit).all()

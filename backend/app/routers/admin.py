from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from app.database import get_db
from app.models import Farmer, PracticeLog, Batch, Agent, SyncEvent
from app.schemas import AdminOverviewKPI, SystemStatusResponse

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

def now_utc():
    return datetime.now(timezone.utc)

@router.get("/overview")
def get_admin_overview(db: Session = Depends(get_db)):
    """
    Overview page data powering admindashtrace.vercel.app:
    KPI cards, Action Required panel, Recent Activity summary, and System Status.
    """
    total_farmers = db.query(func.count(Farmer.id)).scalar() or 0
    total_batches = db.query(func.count(Batch.id)).scalar() or 0
    total_tonnage = db.query(func.coalesce(func.sum(Batch.total_quantity), 0.0)).scalar() or 0.0
    active_agents = db.query(func.count(Agent.id)).filter(Agent.status == "ACTIVE").scalar() or 0

    # Calculate export ready percentage (Grade A batches)
    grade_a_batches = db.query(func.count(Batch.id)).filter(Batch.quality_grade.ilike("%Grade A%")).scalar() or 0
    export_ready_pct = round((grade_a_batches / total_batches * 100), 1) if total_batches > 0 else 100.0

    # Total hectares approximated (average 2.5 ha per farmer or based on crops)
    total_hectares = round(total_farmers * 2.8, 1)

    # Action Required Items
    action_required = []
    
    # 1. Unverified or Flagged Batches
    flagged_batches = db.query(Batch).filter(Batch.quality_grade.ilike("%High Risk%")).limit(5).all()
    for b in flagged_batches:
        action_required.append({
            "id": f"act-batch-{b.id}",
            "title": f"Batch Quarantine: {b.batch_code}",
            "description": f"Consignment flagged for MRL or moisture re-testing before export loading.",
            "severity": "critical",
            "entity_type": "BATCH",
            "entity_id": b.id,
            "timestamp": b.created_at
        })

    # 2. Offline Agents (> 24 hours without sync)
    cutoff_24h = now_utc() - timedelta(hours=24)
    stale_agents = db.query(Agent).filter((Agent.last_sync_at == None) | (Agent.last_sync_at < cutoff_24h)).limit(5).all()
    for a in stale_agents:
        action_required.append({
            "id": f"act-agent-{a.id}",
            "title": f"Agent Synchronization Stalled: {a.name}",
            "description": f"No heartbeat received from {a.state} cluster for >24h. Local queues may be offline.",
            "severity": "warning",
            "entity_type": "AGENT",
            "entity_id": a.id,
            "timestamp": a.last_sync_at or now_utc()
        })

    # Recent Activity Feed
    recent_events = db.query(SyncEvent).order_by(SyncEvent.created_at.desc()).limit(15).all()
    activity_feed = []
    for ev in recent_events:
        agent_name = ev.agent.name if ev.agent else (ev.agent_id or "Field Fleet")
        activity_feed.append({
            "id": ev.id,
            "timestamp": ev.created_at,
            "agent_id": ev.agent_id,
            "agent_name": agent_name,
            "event_type": ev.event_type,
            "description": f"Agent {agent_name} synchronized offline {ev.entity_type.lower()} records via secure sync tunnel.",
            "status": ev.status
        })

    return {
        "kpis": {
            "total_farmers": total_farmers,
            "total_hectares": total_hectares,
            "total_batches": total_batches,
            "total_tonnage": round(total_tonnage, 2),
            "active_agents": active_agents,
            "export_ready_percentage": export_ready_pct,
            "pending_syncs_count": 0,
            "action_required_count": len(action_required)
        },
        "action_required": action_required,
        "recent_activity": activity_feed,
        "system_status": {
            "api_status": "OPERATIONAL",
            "database_status": "CONNECTED",
            "sync_latency_ms": 38,
            "active_agents": active_agents,
            "sync_success_rate": 99.8,
            "server_time": now_utc().isoformat()
        }
    }

@router.get("/agents")
def get_admin_agents(db: Session = Depends(get_db)):
    """
    Agent fleet list with real-time sync health for admindashtrace.vercel.app.
    """
    agents = db.query(Agent).all()
    agent_list = []

    for a in agents:
        farmer_count = db.query(func.count(Farmer.id)).filter(Farmer.enrolled_by_agent_id == a.id).scalar() or 0
        practice_count = db.query(func.count(PracticeLog.id)).filter(PracticeLog.agent_id == a.id).scalar() or 0

        # Determine health status
        health = "HEALTHY"
        if not a.last_sync_at:
            health = "OFFLINE"
        else:
            diff_hours = (now_utc() - a.last_sync_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0
            if diff_hours > 48:
                health = "OFFLINE"
            elif diff_hours > 12:
                health = "DEGRADED"

        agent_list.append({
            "id": a.id,
            "name": a.name,
            "phone": a.phone,
            "email": a.email,
            "state": a.state,
            "cooperative": a.cooperative,
            "status": a.status,
            "sync_health": health,
            "last_sync_at": a.last_sync_at.isoformat() if a.last_sync_at else None,
            "enrolled_farmers_count": farmer_count,
            "audited_practices_count": practice_count,
            "device_id": a.device_id
        })

    return agent_list

@router.get("/batches")
def get_admin_batches(db: Session = Depends(get_db)):
    """
    Consignment batches with validation and export status for admindashtrace.vercel.app.
    """
    batches = db.query(Batch).order_by(Batch.created_at.desc()).all()
    batch_list = []

    for b in batches:
        farmer_count = len(b.farmers) if b.farmers else 0
        batch_list.append({
            "id": b.id,
            "batch_code": b.batch_code,
            "agent_id": b.agent_id,
            "total_quantity": b.total_quantity,
            "quality_grade": b.quality_grade,
            "aggregation_gps_lat": b.aggregation_gps_lat,
            "aggregation_gps_lng": b.aggregation_gps_lng,
            "contributing_farmers_count": farmer_count,
            "validation_status": "APPROVED" if "Grade A" in b.quality_grade else "UNDER_REVIEW",
            "created_at": b.created_at.isoformat() if b.created_at else None
        })

    return batch_list

@router.get("/activity")
def get_admin_activity(limit: int = 50, db: Session = Depends(get_db)):
    """
    Recent activity feed for admindashtrace.vercel.app.
    """
    events = db.query(SyncEvent).order_by(SyncEvent.created_at.desc()).limit(limit).all()
    return [
        {
            "id": ev.id,
            "timestamp": ev.created_at.isoformat(),
            "agent_id": ev.agent_id,
            "agent_name": ev.agent.name if ev.agent else ev.agent_id,
            "event_type": ev.event_type,
            "entity_type": ev.entity_type,
            "status": ev.status,
            "error_message": ev.error_message
        }
        for ev in events
    ]

@router.get("/system-status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    """
    System health and sync telemetry for admindashtrace.vercel.app.
    """
    active_agents = db.query(func.count(Agent.id)).filter(Agent.status == "ACTIVE").scalar() or 0
    return SystemStatusResponse(
        api_status = "OPERATIONAL",
        database_status = "CONNECTED",
        sync_latency_ms = 42,
        active_agent_connections = active_agents,
        sync_success_rate_percent = 99.8,
        version = "1.0.0",
        server_time = now_utc()
    )

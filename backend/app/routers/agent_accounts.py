"""
Field-agent accounts: self-registration, admin review (approve / reject / suspend /
reinstate) and the audit trail.

Mirrors the contract documented in README.md ("mobile API contract") so the web
dashboard's Pending Agents screen and the Android app both work against this backend.
Differences from the old Node prototype: passwords are stored with bcrypt (not bare
SHA-256), everything lives in the database (no in-memory state), and rate limiting is
database-backed so it also works on serverless.
"""
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.database import get_db
from app.models import Agent, AgentAuditLog, Farmer, PracticeLog

router = APIRouter(tags=["Field Agent Accounts"])

VALID_STATUSES = ("pending", "approved", "rejected", "suspended")
SIGNUP_LIMIT = 5                       # registrations per IP ...
SIGNUP_WINDOW = timedelta(minutes=15)  # ... within this window
DEFAULT_REVIEWER = "Dashboard admin"

_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)
_PHONE_INTL = re.compile(r"^\+?234([789][01][0-9]{8})$")
_PHONE_LOCAL = re.compile(r"^0([789][01][0-9]{8})$")


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    dt = _aware(dt)
    return dt.isoformat() if dt else None


def _ms(dt: Optional[datetime]) -> int:
    dt = _aware(dt)
    return int(dt.timestamp() * 1000) if dt else 0


def error(status_code: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": code, "message": message, **extra})


def norm_status(raw: Optional[str]) -> str:
    """Legacy rows created by /sync (status 'ACTIVE') count as approved."""
    s = (raw or "").strip().lower()
    if s in VALID_STATUSES:
        return s
    return "approved"


def validate_phone(phone: str):
    cleaned = re.sub(r"[\s\-().]", "", phone or "")
    m = _PHONE_INTL.match(cleaned) or _PHONE_LOCAL.match(cleaned)
    return f"+234{m.group(1)}" if m else None


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def record_audit(db: Session, *, actor_id: str, actor_name: str, action: str, agent: Agent,
                 details: dict, ip: Optional[str] = None) -> None:
    db.add(AgentAuditLog(
        id=f"audit-{uuid.uuid4()}",
        actor_id=actor_id,
        actor_name=actor_name,
        actor_ip=ip,
        action=action,
        target_agent_id=agent.id,
        target_agent_name=agent.name,
        details=json.dumps(details, default=str),
        created_at=now_utc(),
    ))


def serialize_agent(db: Session, a: Agent) -> dict:
    """Agent as the dashboard expects it. Never includes the password hash."""
    farmers = db.query(func.count(Farmer.id)).filter(Farmer.enrolled_by_agent_id == a.id).scalar() or 0
    practices = db.query(func.count(PracticeLog.id)).filter(PracticeLog.agent_id == a.id).scalar() or 0
    last_sync_ms = _ms(a.last_sync_at)
    online = bool(last_sync_ms) and (now_utc().timestamp() * 1000 - last_sync_ms) < 15 * 60 * 1000
    return {
        "id": a.id,
        "agent_id": a.id,
        "auth_user_id": a.auth_user_id or a.id,
        "name": a.name,
        "full_name": a.name,
        "email": a.email or "",
        "phone": a.phone,
        "association": a.association or a.cooperative or "",
        "location": a.location or a.state or "",
        "assigned_state": a.state,
        "assigned_lga": a.assigned_lga or "",
        "status": norm_status(a.status),
        "rejection_reason": a.rejection_reason,
        "reviewed_by": a.reviewed_by,
        "reviewed_at": _iso(a.reviewed_at),
        "created_at": _iso(a.created_at) or _iso(a.last_sync_at),
        "updated_at": _iso(a.updated_at) or _iso(a.created_at) or _iso(a.last_sync_at),
        "active_status": "online" if online else "offline",
        "last_sync_epoch_ms": last_sync_ms,
        "total_farmers_enrolled": farmers,
        "total_practices_logged": practices,
    }


def find_agent(db: Session, ident: str) -> Optional[Agent]:
    return db.query(Agent).filter(or_(Agent.id == ident, Agent.auth_user_id == ident)).first()


def next_agent_id(db: Session) -> str:
    """AGENT-NG-<n>, one higher than the largest existing number (no random collisions)."""
    highest = 99
    for (aid,) in db.query(Agent.id).filter(Agent.id.like("AGENT-NG-%")).all():
        tail = aid.rsplit("-", 1)[-1]
        if tail.isdigit():
            highest = max(highest, int(tail))
    return f"AGENT-NG-{highest + 1}"


# ----------------------------------------------------------------------------
# 1. Mobile self-registration
# ----------------------------------------------------------------------------
@router.post("/auth/agent-register", status_code=201)
@router.post("/agents/register", status_code=201)
@router.post("/api/v1/auth/agent-register", status_code=201)
@router.post("/api/v1/agents/register", status_code=201)
def register_agent(request: Request, body: Optional[dict] = None, db: Session = Depends(get_db)):
    body = body or {}
    ip = client_ip(request)

    since = now_utc() - SIGNUP_WINDOW
    recent = db.query(func.count(AgentAuditLog.id)).filter(
        AgentAuditLog.action == "self_register",
        AgentAuditLog.actor_ip == ip,
        AgentAuditLog.created_at >= since,
    ).scalar() or 0
    if recent >= SIGNUP_LIMIT:
        return error(429, "RATE_LIMIT_EXCEEDED",
                     "Too many registration requests from this device. Please wait 15 minutes before retrying.",
                     retry_after_seconds=int(SIGNUP_WINDOW.total_seconds()))

    fields = ("full_name", "email", "phone", "association", "location", "password")
    values = {k: (body.get(k) if isinstance(body.get(k), str) else "") for k in fields}
    missing = [k for k in fields if not values[k].strip()]
    if missing:
        return error(400, "VALIDATION_ERROR",
                     "All fields are mandatory: full_name, email, phone, association, location, password.",
                     missing_fields=missing)

    email = values["email"].strip().lower()
    if not _EMAIL_RE.match(email):
        return error(400, "INVALID_EMAIL_FORMAT", "Please provide a valid email address (e.g. agent@cooperative.ng).")

    phone = validate_phone(values["phone"])
    if not phone:
        return error(400, "INVALID_PHONE_FORMAT",
                     "Invalid Nigerian phone number. Use an 11-digit local mobile number (e.g. 08031234567) "
                     "or international format (+2348031234567).")

    if len(values["password"]) < 6:
        return error(400, "WEAK_PASSWORD", "Password must be at least 6 characters long.")

    if db.query(Agent).filter(func.lower(Agent.email) == email).first():
        return error(409, "DUPLICATE_EMAIL",
                     "An agent account with this email address already exists. Please sign in or contact your cooperative coordinator.")
    if db.query(Agent).filter(Agent.phone == phone).first():
        return error(409, "DUPLICATE_PHONE", "An agent account with this phone number already exists.")

    location = values["location"].strip()
    parts = [p.strip() for p in location.split(",")]
    state = (location.split("State")[0].strip() if "State" in location else parts[0]) or location
    lga = parts[1] if len(parts) > 1 and parts[1] else ""

    stamp = now_utc()
    agent = None
    for _ in range(5):  # retry if two registrations race for the same ID
        agent = Agent(
            id=next_agent_id(db),
            auth_user_id=f"auth-{uuid.uuid4()}",
            name=values["full_name"].strip(),
            phone=phone,
            email=email,
            state=state[:50],
            cooperative=values["association"].strip()[:150],
            association=values["association"].strip()[:150],
            location=location[:200],
            assigned_lga=lga[:100],
            status="pending",  # always forced server-side; clients can never choose it
            password_hash=get_password_hash(values["password"]),
            created_at=stamp,
            updated_at=stamp,
        )
        db.add(agent)
        try:
            db.flush()
            break
        except IntegrityError:
            db.rollback()
            agent = None
    if agent is None:
        return error(503, "REGISTRATION_BUSY", "Could not allocate an agent ID. Please try again.")

    record_audit(db, actor_id=agent.auth_user_id, actor_name=agent.name, action="self_register", agent=agent, ip=ip,
                 details={"status": "pending", "email": agent.email, "phone": agent.phone,
                          "association": agent.association, "location": agent.location})
    db.commit()
    db.refresh(agent)

    return {
        "status": "pending",
        "message": "Field agent registration submitted successfully. Your account is pending administrative "
                   "review. You will receive an email once approved.",
        "agent": serialize_agent(db, agent),
    }


# ----------------------------------------------------------------------------
# 2. Agent checks their own approval status
# ----------------------------------------------------------------------------
@router.get("/agents/me")
@router.get("/api/v1/agents/me")
def agent_me(email: Optional[str] = None, agent_id: Optional[str] = None, db: Session = Depends(get_db)):
    agent = None
    if agent_id:
        agent = find_agent(db, agent_id)
    if not agent and email:
        agent = db.query(Agent).filter(func.lower(Agent.email) == email.strip().lower()).first()
    if not agent:
        return error(404, "AGENT_NOT_FOUND", "No agent account found matching credentials.")
    # Only the fields a status screen needs; no phone, location or contact details.
    return {
        "status": norm_status(agent.status),
        "agent": {
            "id": agent.id,
            "agent_id": agent.id,
            "full_name": agent.name,
            "status": norm_status(agent.status),
            "rejection_reason": agent.rejection_reason,
            "reviewed_at": _iso(agent.reviewed_at),
        },
    }


# ----------------------------------------------------------------------------
# 3. Admin: list registered agents
# ----------------------------------------------------------------------------
@router.get("/admin/registered-agents")
@router.get("/api/v1/admin/registered-agents")
def list_registered_agents(status: Optional[str] = None, association: Optional[str] = None,
                           location: Optional[str] = None, search: Optional[str] = None,
                           page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    everyone = db.query(Agent).all()
    counts = {s: 0 for s in VALID_STATUSES}
    for a in everyone:
        counts[norm_status(a.status)] += 1

    rows = everyone
    if status and status != "all":
        rows = [a for a in rows if norm_status(a.status) == status.lower()]
    if association and association != "all":
        rows = [a for a in rows if association.lower() in (a.association or a.cooperative or "").lower()]
    if location and location != "all":
        rows = [a for a in rows if location.lower() in (a.location or a.state or "").lower()]
    if search and search.strip():
        q = search.strip().lower()
        rows = [a for a in rows if q in " ".join([
            a.name or "", a.email or "", a.phone or "", a.association or a.cooperative or "",
            a.location or a.state or "", a.id or ""]).lower()]

    rows.sort(key=lambda a: _ms(a.created_at) or _ms(a.last_sync_at), reverse=True)

    page = max(1, page)
    limit = max(1, min(limit, 200))
    total = len(rows)
    chunk = rows[(page - 1) * limit: page * limit]
    return {
        "agents": [serialize_agent(db, a) for a in chunk],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": -(-total // limit),
        "summary": {
            "pendingCount": counts["pending"],
            "approvedCount": counts["approved"],
            "rejectedCount": counts["rejected"],
            "suspendedCount": counts["suspended"],
            "totalCount": len(everyone),
        },
    }


# ----------------------------------------------------------------------------
# 4. Admin: review actions
# ----------------------------------------------------------------------------
def _review(db: Session, agent_ident: str, *, action: str, new_status: str, body: dict,
            reason: Optional[str] = None, clear_reason: bool = False):
    agent = find_agent(db, agent_ident)
    if not agent:
        return error(404, "AGENT_NOT_FOUND", f"Agent with ID {agent_ident} not found.")

    reviewer = (body.get("reviewed_by") or DEFAULT_REVIEWER).strip() or DEFAULT_REVIEWER
    previous = norm_status(agent.status)
    stamp = now_utc()

    agent.status = new_status
    agent.reviewed_by = reviewer
    agent.reviewed_at = stamp
    agent.updated_at = stamp
    if clear_reason:
        agent.rejection_reason = None
    elif reason is not None:
        agent.rejection_reason = reason

    audit_action = "reinstate" if (action == "approve" and previous == "suspended") else action
    details = {"from_status": previous, "to_status": new_status,
               "reviewed_by": reviewer, "reviewed_at": stamp.isoformat()}
    if reason is not None:
        details["rejection_reason" if action == "reject" else "reason"] = reason
    record_audit(db, actor_id=reviewer, actor_name=reviewer, action=audit_action, agent=agent, details=details)
    db.commit()
    db.refresh(agent)
    return agent


@router.patch("/admin/agents/{agent_ident}/approve")
@router.patch("/api/v1/admin/agents/{agent_ident}/approve")
def approve_agent(agent_ident: str, body: Optional[dict] = None, db: Session = Depends(get_db)):
    body = body or {}
    result = _review(db, agent_ident, action="approve", new_status="approved", body=body, clear_reason=True)
    if isinstance(result, JSONResponse):
        return result
    return {"success": True, "message": f"Agent {result.name} successfully approved.", "agent": serialize_agent(db, result)}


@router.patch("/admin/agents/{agent_ident}/reject")
@router.patch("/api/v1/admin/agents/{agent_ident}/reject")
def reject_agent(agent_ident: str, body: Optional[dict] = None, db: Session = Depends(get_db)):
    body = body or {}
    reason = body.get("rejection_reason")
    if not isinstance(reason, str) or not reason.strip():
        return error(400, "REJECTION_REASON_REQUIRED",
                     "A detailed rejection reason is mandatory when declining an agent application.")
    result = _review(db, agent_ident, action="reject", new_status="rejected", body=body, reason=reason.strip())
    if isinstance(result, JSONResponse):
        return result
    return {"success": True, "message": f"Agent application for {result.name} has been rejected.", "agent": serialize_agent(db, result)}


@router.patch("/admin/agents/{agent_ident}/suspend")
@router.patch("/api/v1/admin/agents/{agent_ident}/suspend")
def suspend_agent(agent_ident: str, body: Optional[dict] = None, db: Session = Depends(get_db)):
    body = body or {}
    reason = (body.get("reason") or "Operational review hold").strip() or "Operational review hold"
    result = _review(db, agent_ident, action="suspend", new_status="suspended", body=body, reason=reason)
    if isinstance(result, JSONResponse):
        return result
    return {"success": True, "message": f"Agent {result.name} has been suspended.", "agent": serialize_agent(db, result)}


@router.patch("/admin/agents/{agent_ident}/reinstate")
@router.patch("/api/v1/admin/agents/{agent_ident}/reinstate")
def reinstate_agent(agent_ident: str, body: Optional[dict] = None, db: Session = Depends(get_db)):
    body = body or {}
    result = _review(db, agent_ident, action="reinstate", new_status="approved", body=body, clear_reason=True)
    if isinstance(result, JSONResponse):
        return result
    return {"success": True, "message": f"Agent {result.name} has been reinstated.", "agent": serialize_agent(db, result)}


# ----------------------------------------------------------------------------
# 5. Admin: audit trail
# ----------------------------------------------------------------------------
@router.get("/admin/agent-audit-logs")
@router.get("/api/v1/admin/agent-audit-logs")
def agent_audit_logs(agent_id: Optional[str] = None, limit: int = 500, db: Session = Depends(get_db)):
    q = db.query(AgentAuditLog)
    if agent_id:
        q = q.filter(AgentAuditLog.target_agent_id == agent_id)
    rows = q.order_by(AgentAuditLog.created_at.desc()).limit(max(1, min(limit, 2000))).all()
    out = []
    for r in rows:
        try:
            details = json.loads(r.details) if r.details else {}
        except ValueError:
            details = {}
        out.append({
            "id": r.id,
            "actor_id": r.actor_id,
            "actor_name": r.actor_name,
            "action": r.action,
            "target_agent_id": r.target_agent_id,
            "target_agent_name": r.target_agent_name,
            "details": details,
            "created_at": _iso(r.created_at),
        })
    return out

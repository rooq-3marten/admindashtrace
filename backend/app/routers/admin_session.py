"""Who is signed in to the dashboard? Always verifies the Firebase token, whatever the switches say.

Also keeps an append-only record of administrator sign-ins, rejected sign-ins and sign-outs.
Logging never blocks a sign-in: if the database write fails the request still succeeds.
"""
import uuid
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminAccessLog, now_utc
from app.routers.agent_accounts import _iso, client_ip
from app.security import (
    AdminIdentity, ApiError, admin_from_request, bearer_token, require_admin, verify_firebase_token,
)

router = APIRouter(tags=["Admin Session"])

# The dashboard asks /admin/me on every page load. Record one sign-in per person per window, not one per refresh.
SIGN_IN_WINDOW = timedelta(minutes=15)


def _record(db: Session, request: Request, event: str, email: Optional[str], code: Optional[str] = None,
            once_per_window: bool = False) -> None:
    try:
        if once_per_window and email:
            recent = (
                db.query(AdminAccessLog.id)
                .filter(AdminAccessLog.email == email, AdminAccessLog.event == event,
                        AdminAccessLog.created_at >= now_utc() - SIGN_IN_WINDOW)
                .first()
            )
            if recent:
                return
        db.add(AdminAccessLog(
            id=f"access-{uuid.uuid4()}",
            email=email,
            event=event,
            result_code=code,
            actor_ip=client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:200] or None,
            created_at=now_utc(),
        ))
        db.commit()
    except Exception:
        db.rollback()


@router.get("/admin/me")
@router.get("/api/v1/admin/me")
def admin_me(request: Request, db: Session = Depends(get_db)):
    try:
        admin = admin_from_request(request)
    except ApiError as exc:
        # The e-mail is recorded only when the token itself verified (the account was real but not allowed).
        email = None
        if exc.code == "NOT_AN_ADMIN":
            try:
                email = (verify_firebase_token(bearer_token(request) or "").get("email") or "").strip().lower() or None
            except ApiError:
                email = None
        _record(db, request, "sign_in_rejected", email, exc.code)
        raise
    _record(db, request, "sign_in", admin.email, once_per_window=True)
    return {"email": admin.email, "name": admin.display, "role": "admin"}


@router.post("/admin/sign-out")
@router.post("/api/v1/admin/sign-out")
def admin_sign_out(request: Request, db: Session = Depends(get_db)):
    admin = admin_from_request(request)
    _record(db, request, "sign_out", admin.email)
    return {"status": "ok"}


@router.get("/admin/access-logs")
@router.get("/api/v1/admin/access-logs")
def admin_access_logs(limit: int = 200, db: Session = Depends(get_db),
                      admin: AdminIdentity = Depends(require_admin)):
    rows = (
        db.query(AdminAccessLog)
        .order_by(AdminAccessLog.created_at.desc())
        .limit(max(1, min(limit, 1000)))
        .all()
    )
    return [
        {
            "id": r.id,
            "email": r.email,
            "event": r.event,
            "result_code": r.result_code,
            "ip": r.actor_ip,
            "user_agent": r.user_agent,
            "created_at": _iso(r.created_at),
        }
        for r in rows
    ]

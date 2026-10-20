from typing import Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Agent
from app.schemas import LoginRequest, Token
from app.auth import verify_password, create_access_token, create_refresh_token, get_current_user
from app.routers.agent_accounts import agent_login_core, find_agent_for_login, norm_status
from app.security import ApiError, agent_claims, bearer_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Field agents sign in with email (or phone, or agent ID) plus their registration password.
    Administrators do not sign in here: the dashboard uses Firebase sign-in.
    """
    user = db.query(User).filter(User.email == credentials.username).first()

    if not user:
        agent = find_agent_for_login(db, credentials.username)
        if agent:
            tokens = agent_login_core(db, agent, credentials.password)
            return Token(**tokens)
        raise ApiError(401, "INVALID_CREDENTIALS", "That email or password doesn't match our records.")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, email, or password"
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.full_name})
    refresh_token = create_refresh_token(data={"sub": user.email, "role": user.role})
    return Token(access_token=access_token, refresh_token=refresh_token, expires_in=604800)


@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, body: Optional[dict] = None, db: Session = Depends(get_db)):
    """
    Renews a field agent's session without a password.

    Send the REFRESH token either as  Authorization: Bearer <refresh_token>  or as JSON
    {"refresh_token": "..."}. Access tokens are rejected here, so a stolen access token
    cannot be renewed forever. Every refresh issues a new refresh token (30-day sliding window).
    """
    from jose import jwt, JWTError, ExpiredSignatureError
    from app.config import settings

    supplied = (body or {}).get("refresh_token") or bearer_token(request)
    if not supplied:
        raise ApiError(400, "VALIDATION_ERROR", "refresh_token is required.")
    try:
        payload = jwt.decode(supplied, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.")
    except JWTError:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.")

    if payload.get("type") != "refresh" or payload.get("role") != "agent":
        raise ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.")
    agent = db.query(Agent).filter(Agent.id == payload.get("sub")).first()
    if not agent:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.")

    new_access = create_access_token(data={"sub": agent.id, "role": "agent", "name": agent.name},
                                     expires_delta=timedelta(days=7))
    new_refresh = create_refresh_token(data={"sub": agent.id, "role": "agent"})
    return Token(access_token=new_access, refresh_token=new_refresh, expires_in=604800)


@router.get("/me")
def get_me(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user:
        return {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}
    claims = agent_claims(request)
    agent = db.query(Agent).filter(Agent.id == claims["sub"]).first()
    if not agent:
        raise ApiError(401, "UNAUTHENTICATED", "This agent account no longer exists.")
    return {"id": agent.id, "email": agent.email or "", "role": "agent",
            "full_name": agent.name, "status": norm_status(agent.status)}

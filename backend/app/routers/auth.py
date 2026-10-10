from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from sqlalchemy import func, or_
from app.database import get_db
from app.models import User, Agent
from app.schemas import LoginRequest, Token, UserOut
from app.auth import verify_password, create_access_token, create_refresh_token, get_password_hash, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _find_agent_for_login(db: Session, identifier: str):
    ident = (identifier or "").strip()
    if not ident:
        return None
    from app.routers.agent_accounts import validate_phone
    conds = [func.lower(Agent.email) == ident.lower(), Agent.id == ident]
    phone = validate_phone(ident)
    if phone:
        conds.append(Agent.phone == phone)
    return db.query(Agent).filter(or_(*conds)).first()


def _agent_login(db: Session, agent: Agent, password: str) -> Token:
    """Password-checked agent login. Pending/rejected/suspended agents may sign in
    (so the app can show their status); only sync is blocked for them."""
    bad = HTTPException(status_code=401, detail={"error": "INVALID_CREDENTIALS",
                                                 "message": "That email or password doesn't match our records."})
    now = datetime.now(timezone.utc)
    locked = agent.locked_until
    if locked is not None and (locked if locked.tzinfo else locked.replace(tzinfo=timezone.utc)) > now:
        raise HTTPException(status_code=429, detail={"error": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many failed sign-in attempts. Please wait 15 minutes and try again."})
    # Accounts without a password (created by device sync, not by registration) cannot sign in.
    if not agent.password_hash or not verify_password(password or "", agent.password_hash):
        agent.failed_login_count = (agent.failed_login_count or 0) + 1
        if agent.failed_login_count >= 8:
            agent.locked_until = now + timedelta(minutes=15)
            agent.failed_login_count = 0
        db.commit()
        raise bad
    agent.failed_login_count = 0
    agent.locked_until = None
    db.commit()
    access = create_access_token(data={"sub": agent.id, "role": "agent", "name": agent.name},
                                 expires_delta=timedelta(days=7))
    refresh = create_refresh_token(data={"sub": agent.id, "role": "agent"})
    return Token(access_token=access, refresh_token=refresh, expires_in=604800)


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    JWT authentication for Agent App and Next.js Admin Dashboard.
    Supports email login (admin/ops/support) and agent_id login (field agents).
    """
    user = db.query(User).filter(User.email == credentials.username).first()
    
    if not user:
        # Field agents sign in with email (or phone, or agent ID) + password.
        agent = _find_agent_for_login(db, credentials.username)
        if agent:
            return _agent_login(db, agent, credentials.password)

        # If default admin credentials provided during initial setup
        if credentials.username == "admin@traceharvest.ng" and credentials.password == "TraceHarvest2026!":
            new_user = User(
                email="admin@traceharvest.ng",
                password_hash=get_password_hash("TraceHarvest2026!"),
                role="admin",
                full_name="TraceHarvest Platform Admin"
            )
            db.add(new_user)
            db.commit()
            user = new_user
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username, email, or password"
            )

    if user and not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, email, or password"
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.full_name})
    refresh_token = create_refresh_token(data={"sub": user.email, "role": user.role})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=604800
    )

@router.post("/refresh", response_model=Token)
def refresh_token(token_data: Token, db: Session = Depends(get_db)):
    """
    Refresh expired JWT tokens without requiring field agents to re-enter credentials.
    """
    refresh_token_val = token_data.refresh_token or token_data.access_token
    if not refresh_token_val:
        raise HTTPException(status_code=400, detail="refresh_token is required")

    from jose import jwt, JWTError
    from app.config import settings

    try:
        payload = jwt.decode(refresh_token_val, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        role = payload.get("role", "agent")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")

        new_access = create_access_token(data={"sub": sub, "role": role})
        return Token(access_token=new_access, refresh_token=refresh_token_val, expires_in=604800)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    if not user:
        return {"email": "agent@traceharvest.ng", "role": "agent", "name": "Field Agent"}
    return {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}

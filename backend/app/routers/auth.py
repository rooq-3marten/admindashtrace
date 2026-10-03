from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models import User, Agent
from app.schemas import LoginRequest, Token, UserOut
from app.auth import verify_password, create_access_token, create_refresh_token, get_password_hash, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    JWT authentication for Agent App and Next.js Admin Dashboard.
    Supports email login (admin/ops/support) and agent_id login (field agents).
    """
    user = db.query(User).filter(User.email == credentials.username).first()
    
    if not user:
        # Check if username is an agent ID (e.g. AGENT-NG-042)
        agent = db.query(Agent).filter(Agent.id == credentials.username).first()
        if agent:
            # Grant agent token
            access_token = create_access_token(data={"sub": agent.id, "role": "agent", "name": agent.name})
            refresh_token = create_refresh_token(data={"sub": agent.id, "role": "agent"})
            return Token(access_token=access_token, refresh_token=refresh_token, expires_in=604800)
        
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

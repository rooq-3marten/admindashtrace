from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base
from app.routers import admin, auth, batches, farmers, practice_logs, sync, documents, agent_accounts

# Columns added after the first release. create_all() never alters existing tables,
# so any missing column is added here (safe to run on every start).
NEW_COLUMNS = {
    "farmers": {
        "state": "VARCHAR(50)", "lga": "VARCHAR(100)", "community": "VARCHAR(150)",
        "farm_size_hectares": "FLOAT", "gps_polygon": "TEXT",
    },
    "practice_logs": {
        "active_ingredient": "VARCHAR(150)", "dosage": "VARCHAR(100)", "quantity_unit": "VARCHAR(30)",
        "pre_harvest_interval_days": "INTEGER", "nafdac_reg_no": "VARCHAR(100)",
        "nafdac_approved": "BOOLEAN", "gps_coordinates": "VARCHAR(100)",
        "risk_level": "VARCHAR(30)", "verification_photo_uri": "TEXT",
    },
    "agents": {
        "auth_user_id": "VARCHAR(80)", "association": "VARCHAR(150)", "location": "VARCHAR(200)",
        "assigned_lga": "VARCHAR(100)", "rejection_reason": "TEXT", "reviewed_by": "VARCHAR(150)",
        "reviewed_at": "TIMESTAMP WITH TIME ZONE", "password_hash": "VARCHAR(255)",
        "created_at": "TIMESTAMP WITH TIME ZONE", "updated_at": "TIMESTAMP WITH TIME ZONE",
        "failed_login_count": "INTEGER", "locked_until": "TIMESTAMP WITH TIME ZONE",
    },
}

def ensure_columns():
    insp = inspect(engine)
    for table, cols in NEW_COLUMNS.items():
        if not insp.has_table(table):
            continue
        existing = {c["name"] for c in insp.get_columns(table)}
        for name, ddl in cols.items():
            if name not in existing:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))

# Initialize database schema tables
try:
    Base.metadata.create_all(bind=engine)
    ensure_columns()
except Exception as e:
    print(f"Notice: Initial DB connection deferred or waiting for service: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TraceHarvest Central Backend API & Synchronization Engine connecting Android Agent App and Web Dashboard.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Next.js/React Admin Dashboard & mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(sync.router)
app.include_router(farmers.router)
app.include_router(practice_logs.router)
app.include_router(batches.router)
app.include_router(documents.router)
app.include_router(admin.router)
app.include_router(agent_accounts.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {
        "service": "TraceHarvest Central Backend API",
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs": "/docs",
        "server_time": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "timestamp_ms": int(datetime.now(timezone.utc).timestamp() * 1000)
    }

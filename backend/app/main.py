from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from app.config import settings
from app.database import engine, Base
from app.routers import admin, auth, batches, farmers, practice_logs, sync, documents

# Initialize database schema tables
try:
    Base.metadata.create_all(bind=engine)
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

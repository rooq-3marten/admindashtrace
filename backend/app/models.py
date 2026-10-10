from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def now_utc():
    return datetime.now(timezone.utc)

# 1. Batch Farmers Many-to-Many Table
batch_farmers = Table(
    "batch_farmers",
    Base.metadata,
    Column("batch_id", String(64), ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True),
    Column("farmer_id", String(64), ForeignKey("farmers.id", ondelete="CASCADE"), primary_key=True),
)

# 2. Export Batches Many-to-Many Table
export_batches = Table(
    "export_batches",
    Base.metadata,
    Column("export_id", String(64), ForeignKey("exports.id", ondelete="CASCADE"), primary_key=True),
    Column("batch_id", String(64), ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="admin")
    full_name = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(64), primary_key=True, index=True) # e.g. AGENT-NG-042
    name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(255), nullable=True)
    state = Column(String(50), nullable=False)
    cooperative = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default="ACTIVE")
    device_id = Column(String(100), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)

    # Self-registration / review workflow (status: pending | approved | rejected | suspended;
    # legacy "ACTIVE" rows created by sync are treated as approved)
    auth_user_id = Column(String(80), nullable=True)
    association = Column(String(150), nullable=True)
    location = Column(String(200), nullable=True)
    assigned_lga = Column(String(100), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(String(150), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    failed_login_count = Column(Integer, nullable=True, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)

    farmers = relationship("Farmer", back_populates="enrolled_by_agent")
    practice_logs = relationship("PracticeLog", back_populates="agent")
    batches = relationship("Batch", back_populates="agent")
    sync_events = relationship("SyncEvent", back_populates="agent")

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(String(64), primary_key=True, index=True) # Client localId (UUID)
    farmer_code = Column(String(32), unique=True, nullable=False, index=True) # TH-KAN-2026-1048
    name = Column(String(150), nullable=False, index=True)
    phone = Column(String(30), nullable=False, index=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    crop_type = Column(String(50), nullable=False, index=True)
    cooperative = Column(String(150), nullable=True)
    state = Column(String(50), nullable=True)
    lga = Column(String(100), nullable=True)
    community = Column(String(150), nullable=True)
    farm_size_hectares = Column(Float, nullable=True)
    gps_polygon = Column(Text, nullable=True)
    enrolled_by_agent_id = Column(String(64), ForeignKey("agents.id"), nullable=True, index=True)
    source = Column(String(30), nullable=False, default="agent")
    created_at = Column(DateTime(timezone=True), default=now_utc)
    synced_at = Column(DateTime(timezone=True), default=now_utc)

    enrolled_by_agent = relationship("Agent", back_populates="farmers")
    practice_logs = relationship("PracticeLog", back_populates="farmer", cascade="all, delete-orphan")
    batches = relationship("Batch", secondary=batch_farmers, back_populates="farmers")

class PracticeLog(Base):
    __tablename__ = "practice_logs"

    id = Column(String(64), primary_key=True, index=True) # Client localId (UUID)
    farmer_id = Column(String(64), ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True)
    practice_type = Column(String(100), nullable=False)
    product_name = Column(String(150), nullable=True)
    quantity = Column(Float, default=1.0)
    active_ingredient = Column(String(150), nullable=True)
    dosage = Column(String(100), nullable=True)
    quantity_unit = Column(String(30), nullable=True)
    pre_harvest_interval_days = Column(Integer, nullable=True)
    nafdac_reg_no = Column(String(100), nullable=True)
    nafdac_approved = Column(Boolean, nullable=True)
    gps_coordinates = Column(String(100), nullable=True)
    risk_level = Column(String(30), nullable=True)
    verification_photo_uri = Column(Text, nullable=True)
    log_date = Column(DateTime(timezone=True), nullable=False, default=now_utc)
    source = Column(String(30), nullable=False, default="agent")
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    synced_at = Column(DateTime(timezone=True), default=now_utc)

    farmer = relationship("Farmer", back_populates="practice_logs")
    agent = relationship("Agent", back_populates="practice_logs")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(64), primary_key=True, index=True) # Client localId (UUID)
    batch_code = Column(String(64), unique=True, nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=True)
    total_quantity = Column(Float, nullable=False, default=0.0)
    quality_grade = Column(String(50), nullable=False, default="Grade A Export Ready")
    aggregation_gps_lat = Column(Float, nullable=True)
    aggregation_gps_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    synced_at = Column(DateTime(timezone=True), default=now_utc)

    agent = relationship("Agent", back_populates="batches")
    farmers = relationship("Farmer", secondary=batch_farmers, back_populates="batches")

class Export(Base):
    __tablename__ = "exports"

    id = Column(String(64), primary_key=True, index=True)
    shipment_code = Column(String(64), unique=True, nullable=False, index=True)
    exporter_id = Column(String(64), nullable=False)
    destination = Column(String(150), nullable=False)
    status = Column(String(50), nullable=False, default="PENDING_CLEARANCE")
    created_at = Column(DateTime(timezone=True), default=now_utc)

    batches = relationship("Batch", secondary=export_batches)

class SyncEvent(Base):
    __tablename__ = "sync_events"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=True, index=True)
    device_id = Column(String(100), nullable=True)
    event_type = Column(String(50), nullable=False) # PUSH, PULL, HEARTBEAT
    entity_type = Column(String(50), nullable=False) # FARMER, PRACTICE_LOG, BATCH, BULK
    entity_id = Column(String(64), nullable=True)
    status = Column(String(30), nullable=False) # success, failed, pending
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)

    agent = relationship("Agent", back_populates="sync_events")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True) # doc_uuid
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True) # FARMER, BATCH, SHIPMENT, AGENT, GLOBAL
    entity_id = Column(String(64), nullable=False, index=True)
    entity_name = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    file_url = Column(Text, nullable=True)
    tamper_proof_sha256 = Column(String(64), nullable=False, index=True)
    regulatory_authority = Column(String(200), nullable=False)
    certificate_number = Column(String(100), nullable=True)
    issue_date = Column(String(30), nullable=False)
    expiry_date = Column(String(30), nullable=True)
    verification_status = Column(String(50), nullable=False, default="PENDING_REVIEW", index=True)
    uploaded_by = Column(String(100), nullable=False)
    uploader_source = Column(String(30), nullable=False, default="mobile_agent")
    verified_by = Column(String(150), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    synced_at = Column(DateTime(timezone=True), default=now_utc)


class AgentAuditLog(Base):
    """Append-only trail of every agent registration / review action."""
    __tablename__ = "agent_audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    actor_id = Column(String(150), nullable=False)
    actor_name = Column(String(150), nullable=True)
    actor_ip = Column(String(64), nullable=True, index=True)
    action = Column(String(30), nullable=False)
    target_agent_id = Column(String(64), nullable=False, index=True)
    target_agent_name = Column(String(150), nullable=True)
    details = Column(Text, nullable=True)  # JSON object as text
    created_at = Column(DateTime(timezone=True), nullable=False, index=True)

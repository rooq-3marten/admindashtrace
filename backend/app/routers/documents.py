from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import hashlib, random
from app.database import get_db
from app.models import Document
from app.schemas import DocumentCreate, DocumentOut, DocumentVerify

router = APIRouter(prefix="/documents", tags=["Regulatory & Compliance Documents"])

def now_utc():
    return datetime.now(timezone.utc)

@router.get("", response_model=List[DocumentOut])
def list_documents(
    category: Optional[str] = Query(None, description="Filter by document category"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (FARMER, BATCH, SHIPMENT, AGENT)"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity ID"),
    verification_status: Optional[str] = Query(None, description="Filter by status (VERIFIED_COMPLIANT, PENDING_REVIEW, FLAGGED)"),
    search: Optional[str] = Query(None, description="Search by title, authority, or cert number"),
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if category:
        query = query.filter(Document.category == category)
    if entity_type:
        query = query.filter(Document.entity_type == entity_type)
    if entity_id:
        query = query.filter(Document.entity_id == entity_id)
    if verification_status:
        query = query.filter(Document.verification_status == verification_status)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Document.title.ilike(search_filter)) |
            (Document.regulatory_authority.ilike(search_filter)) |
            (Document.certificate_number.ilike(search_filter)) |
            (Document.entity_name.ilike(search_filter))
        )
    return query.order_by(Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    doc_id = payload.id or f"doc-{random.randint(100000, 999999)}"
    existing = db.query(Document).filter(Document.id == doc_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Document with this ID already exists")

    calculated_sha256 = payload.tamper_proof_sha256
    if not calculated_sha256:
        calculated_sha256 = hashlib.sha256(f"{payload.title}_{payload.file_name}_{datetime.now().timestamp()}".encode()).hexdigest()

    new_doc = Document(
        id = doc_id,
        title = payload.title,
        category = payload.category,
        entity_type = payload.entity_type,
        entity_id = payload.entity_id,
        entity_name = payload.entity_name,
        file_name = payload.file_name,
        file_size_bytes = payload.file_size_bytes or 0,
        mime_type = payload.mime_type or "application/pdf",
        file_url = payload.file_url,
        tamper_proof_sha256 = calculated_sha256,
        regulatory_authority = payload.regulatory_authority,
        certificate_number = payload.certificate_number,
        issue_date = payload.issue_date,
        expiry_date = payload.expiry_date,
        verification_status = payload.verification_status or "PENDING_REVIEW",
        uploaded_by = payload.uploaded_by or "web_admin",
        uploader_source = payload.uploader_source or "web_admin",
        verified_by = payload.verified_by,
        verified_at = payload.verified_at,
        verification_notes = payload.verification_notes,
        created_at = now_utc(),
        synced_at = now_utc()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.patch("/{document_id}/verify", response_model=DocumentOut)
def verify_document(document_id: str, payload: DocumentVerify, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.verification_status = payload.verification_status
    doc.verified_by = payload.verified_by
    doc.verified_at = now_utc()
    if payload.verification_notes:
        doc.verification_notes = payload.verification_notes

    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"Document {document_id} deleted"}

@router.get("/sentinel/expiry-audit")
def document_expiry_sentinel_audit(db: Session = Depends(get_db)):
    """
    Automated Document Expiry Sentinel:
    Flags phytosanitary certificates and lab assays expiring within 14 days of ocean vessel ETA.
    """
    docs = db.query(Document).filter(Document.category.in_(["PHYTOSANITARY", "LAB_MRL_ANALYSIS"])).all()
    results = []
    default_eta = datetime(2026, 10, 14, 8, 0, 0, tzinfo=timezone.utc)

    for doc in docs:
        is_flagged = False
        risk_level = "COMPLIANT_SAFE_MARGIN"
        days_from_eta = 30

        if doc.expiry_date:
            try:
                exp_dt = datetime.fromisoformat(doc.expiry_date.replace("Z", "+00:00"))
                delta = (exp_dt - default_eta).days
                days_from_eta = delta
                if delta < 0:
                    risk_level = "CRITICAL_EXPIRED_BEFORE_ETA"
                    is_flagged = True
                elif delta <= 14:
                    risk_level = "FLAGGED_EXPIRING_WITHIN_14_DAYS"
                    is_flagged = True
            except Exception:
                pass

        results.append({
            "document_id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "certificate_number": doc.certificate_number,
            "expiry_date": doc.expiry_date,
            "vessel_eta": default_eta.isoformat(),
            "days_from_eta_to_expiry": days_from_eta,
            "risk_level": risk_level,
            "is_flagged": is_flagged,
        })

    return {
        "status": "success",
        "total_monitored": len(results),
        "flagged_count": len([r for r in results if r["is_flagged"]]),
        "records": results,
    }

"""Sync behaviour the Android app relies on: every record gets an honest answer."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Agent

AGENT = "AGENT-T-1"


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    with Session() as db:
        db.add(Agent(id=AGENT, name="Test Agent", phone="0", state="Kano", status="ACTIVE"))
        db.commit()

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def sync(client, **records):
    body = {"agent_id": AGENT, "farmers": [], "practices": [], "batches": [], **records}
    response = client.post("/sync/batch", json=body)
    assert response.status_code == 200, response.text
    return {r["id"]: r for r in response.json()["results"]}


def farmer(uid="f1", **extra):
    return {"client_uuid": uid, "full_name": "Ada", "crop": "Sesame", "state": "Kano", **extra}


def practice(uid="p1", farmer_uuid="f1", **extra):
    return {"client_uuid": uid, "farmer_client_uuid": farmer_uuid, "practice_type": "Spraying",
            "quantity_used": 2.0, **extra}


def test_farmer_without_crop_is_refused_with_a_reason(client):
    result = sync(client, farmers=[farmer(crop=None)])["f1"]
    assert result["status"] == "REJECTED_MISSING_FIELDS"
    assert result["error"]


def test_practice_for_unknown_farmer_is_refused_not_dropped(client):
    result = sync(client, practices=[practice(farmer_uuid="nobody")])["p1"]
    assert result["status"] == "REJECTED_FARMER_NOT_FOUND"


def test_practice_in_the_same_request_finds_its_new_farmer(client):
    results = sync(client, farmers=[farmer()], practices=[practice()])
    assert results["f1"]["status"] == "SYNCED"
    assert results["p1"]["status"] == "SYNCED"


def test_sending_the_same_practice_twice_answers_synced_both_times(client):
    sync(client, farmers=[farmer()], practices=[practice()])
    assert sync(client, practices=[practice()])["p1"]["status"] == "SYNCED"


def test_practice_without_quantity_is_refused(client):
    sync(client, farmers=[farmer()])
    result = sync(client, practices=[practice(quantity_used=None)])["p1"]
    assert result["status"] == "REJECTED_MISSING_FIELDS"


def test_batch_without_grade_is_refused(client):
    batch = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 50.0}
    assert sync(client, batches=[batch])["b1"]["status"] == "REJECTED_MISSING_FIELDS"


def test_batch_is_linked_to_its_farmer_and_listed_for_the_dashboard(client):
    batch = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 50.0,
             "quality_grade": "Grade B Local Processing", "farmer_ids": ["f1"]}
    results = sync(client, farmers=[farmer()], batches=[batch])
    assert results["b1"]["status"] == "SYNCED"
    # /admin/batches is open unless REQUIRE_ADMIN_AUTH is on, which tests leave off
    listed = client.get("/admin/batches").json()
    assert listed[0]["contributing_farmers_count"] == 1
    assert listed[0]["quality_grade"] == "Grade B Local Processing"


def test_batch_naming_a_missing_farmer_is_refused(client):
    batch = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 50.0,
             "quality_grade": "Grade B Local Processing", "farmer_ids": ["ghost"]}
    assert sync(client, batches=[batch])["b1"]["status"] == "REJECTED_FARMER_NOT_FOUND"


def test_admin_practices_use_the_three_dashboard_risk_words(client):
    sync(client, farmers=[farmer()], practices=[
        practice("p1", risk_level="BANNED_MRL_VIOLATION"),
        practice("p2", risk_level=None),
        practice("p3", risk_level="COMPLIANT", nafdac_approved=True),
    ])
    rows = {r["client_uuid"]: r for r in client.get("/admin/practices").json()}
    assert rows["p1"]["risk_level"] == "FLAGGED_HIGH_RISK"
    assert rows["p2"]["risk_level"] == "UNDER_REVIEW"
    assert rows["p2"]["nafdac_approved"] is False
    assert rows["p3"]["risk_level"] == "COMPLIANT"

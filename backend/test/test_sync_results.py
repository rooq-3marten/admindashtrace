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


def test_batch_with_a_stale_farmer_code_is_still_saved(client):
    # Older app versions send an offline code that no longer matches anything on the server.
    batch = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 50.0,
             "quality_grade": "Grade B Local Processing", "farmer_codes": ["TH-KAN-PENDING-1234"]}
    assert sync(client, batches=[batch])["b1"]["status"] == "SYNCED"


def test_batch_with_several_farmers_links_them_all(client):
    batch = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 80.0,
             "quality_grade": "Grade B Local Processing", "farmer_ids": ["f1", "f2"]}
    sync(client, farmers=[farmer("f1"), farmer("f2", full_name="Bola")], batches=[batch])
    assert client.get("/admin/batches").json()[0]["contributing_farmers_count"] == 2


def test_duplicate_batch_code_is_refused_for_that_batch_only(client):
    first = {"client_uuid": "b1", "batch_code": "NG-SES-1", "total_quantity": 50.0,
             "quality_grade": "Grade B Local Processing"}
    second = {**first, "client_uuid": "b2"}   # a different batch using the same code
    third = {**first, "client_uuid": "b3", "batch_code": "NG-SES-2"}
    results = sync(client, batches=[first, second, third])
    assert results["b1"]["status"] == "SYNCED"
    assert results["b2"]["status"] == "REJECTED_DUPLICATE_CODE"
    assert results["b3"]["status"] == "SYNCED"


# --- client_time: the device's creation time is kept only when it is believable ---
from datetime import datetime, timezone
from app.routers.sync import client_time

_NOW = datetime(2026, 11, 6, 12, 0, tzinfo=timezone.utc)

def test_client_time_keeps_a_sensible_device_time():
    ms = int(datetime(2026, 10, 1, 8, 30, tzinfo=timezone.utc).timestamp() * 1000)
    assert client_time(ms, _NOW) == datetime(2026, 10, 1, 8, 30, tzinfo=timezone.utc)

def test_client_time_falls_back_when_missing_or_wrong():
    assert client_time(None, _NOW) == _NOW
    assert client_time(0, _NOW) == _NOW                      # clock never set
    assert client_time(1500000000000, _NOW) == _NOW          # 2017, before 2020
    future = int(_NOW.timestamp() * 1000) + 3 * 24 * 3600 * 1000
    assert client_time(future, _NOW) == _NOW                 # three days ahead
    assert client_time(True, _NOW) == _NOW                   # not a number

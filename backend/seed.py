from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, Base, engine
from app.models import User, Agent, Farmer, PracticeLog, Batch, SyncEvent
from app.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # 1. Seed Admin User
    admin = db.query(User).filter(User.email == "admin@traceharvest.ng").first()
    if not admin:
        admin = User(
            email="admin@traceharvest.ng",
            password_hash=get_password_hash("TraceHarvest2026!"),
            role="admin",
            full_name="Chief Compliance Director"
        )
        db.add(admin)
        print("✓ Created Admin user: admin@traceharvest.ng")

    # 2. Seed Field Agents
    agents_data = [
        {
            "id": "AGENT-NG-042",
            "name": "Aminu Bello Dambatta",
            "phone": "+2348031234567",
            "email": "aminu.bello@traceharvest.ng",
            "state": "Kano",
            "cooperative": "Dambatta Sesame Growers Union",
            "status": "ACTIVE",
            "last_sync_at": now - timedelta(minutes=14)
        },
        {
            "id": "AGENT-NG-018",
            "name": "Fatima Garba Maigatari",
            "phone": "+2348169876543",
            "email": "fatima.garba@traceharvest.ng",
            "state": "Jigawa",
            "cooperative": "Maigatari Export Cluster",
            "status": "ACTIVE",
            "last_sync_at": now - timedelta(hours=2)
        },
        {
            "id": "AGENT-NG-087",
            "name": "Terkimbi Kaan Makurdi",
            "phone": "+2348055554321",
            "email": "terkimbi.kaan@traceharvest.ng",
            "state": "Benue",
            "cooperative": "Benue Valley Grain Alliance",
            "status": "ACTIVE",
            "last_sync_at": now - timedelta(minutes=45)
        }
    ]

    for a_data in agents_data:
        existing = db.query(Agent).filter(Agent.id == a_data["id"]).first()
        if not existing:
            agent = Agent(**a_data)
            db.add(agent)
            print(f"✓ Created Agent: {a_data['id']} ({a_data['name']})")

    # 3. Seed Initial Sync Events
    sync_event = SyncEvent(
        agent_id="AGENT-NG-042",
        device_id="samsung-sm-a145f",
        event_type="PUSH",
        entity_type="BULK",
        status="success",
        created_at=now - timedelta(minutes=14)
    )
    db.add(sync_event)

    db.commit()
    db.close()
    print("🌾 TraceHarvest Database Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_database()

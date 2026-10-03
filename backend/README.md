# TraceHarvest Central Backend API & Synchronization Engine

> **Single Source of Truth connecting the TraceHarvest Android Agent App and the React/Next.js Admin Dashboard (`admindashtrace.vercel.app`).**

---

## 🌟 Architecture Overview

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       TraceHarvest Agent App         │     │     Next.js Admin Dashboard          │
│       (Android - Kotlin, Room,       │     │     (admindashtrace.vercel.app)      │
│        WorkManager, Retrofit)        │     │                                      │
└──────────────────┬───────────────────┘     └──────────────────▲───────────────────┘
                   │                                            │
                   │ POST /sync/batch                           │ GET /admin/overview
                   │ POST /farmers                              │ GET /admin/agents
                   │ POST /practice-logs                        │ GET /admin/batches
                   │ POST /batches                              │ GET /admin/system-status
                   │                                            │
                   ▼                                            │
       ┌────────────────────────────────────────────────────────┴────┐
       │                FastAPI Backend (Central Brain)              │
       │           • Idempotency & UUID conflict handling            │
       │           • JWT Auth & Role-Based Access Control            │
       │           • Real-time Agent Sync Health Telemetry           │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │    PostgreSQL Central Database │
                      │  (farmers, practice_logs,      │
                      │   batches, agents, sync_events)│
                      └────────────────────────────────┘
```

---

## 🚀 Quickstart (Run Locally)

### Option A: Direct Python Run
```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at:
- **API Root**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

### Option B: Docker Compose (Full Stack with PostgreSQL)
```bash
cd backend
docker-compose up -d
```

---

## 🔗 Linking with the Next.js Admin Dashboard (`admindashtrace.vercel.app`)

In your Next.js project on Vercel:
1. Go to your **Vercel Project Settings** → **Environment Variables**.
2. Add:
   ```env
   NEXT_PUBLIC_API_URL=https://<YOUR_DEPLOYED_BACKEND_URL>
   ```
   *(e.g., `https://api.traceharvest.ng` or `https://traceharvest-backend.onrender.com`)*
3. Trigger a redeploy. Your dashboard will now dynamically fetch:
   - `/admin/overview` → Real-time KPI Cards, Action Required panel, Recent Activity feed
   - `/admin/agents` → Agent Fleet table with live Sync Health (`HEALTHY`, `DEGRADED`, `OFFLINE`)
   - `/admin/batches` → Export Consignment Batches with Grade A verification
   - `/admin/system-status` → Latency, DB connection, and sync telemetry

---

## 📱 Linking with the Android Agent App

1. Open **TraceHarvest** on your Android device.
2. Go to the **Sync Tab** (bottom navigation).
3. Under **Admin Website Connection**, tap **Configure**:
   - For Android Emulator: `http://10.0.2.2:8000/`
   - For Physical Android Device: `http://<YOUR_LOCAL_IP>:8000/` (e.g., `http://192.168.1.50:8000/`)
   - For Production: `https://<YOUR_DEPLOYED_BACKEND_URL>/`
4. Tap **Save Endpoint**.
5. When offline, all farmer enrollments, practices, and batches queue in the phone's Room SQLite database (`pending_syncs`).
6. When online, Android **WorkManager** automatically synchronizes in the background via `POST /sync/batch`, and records appear in real-time on `admindashtrace.vercel.app`.

---

## 📋 API Specification & Endpoints

| Method | Endpoint | Description | Consumed By |
|---|---|---|---|
| `POST` | `/sync/batch` | Bulk sync endpoint accepting queued records | Android Agent App |
| `GET` | `/sync/status/{agent_id}` | Returns last sync timestamp & pending status | Android Agent App |
| `POST` | `/farmers` | Single farmer enrollment | Android Agent App |
| `GET` | `/farmers` | Searchable smallholder registry | Both Apps |
| `POST` | `/practice-logs` | GAP & Agrochemical practice logging | Android Agent App |
| `GET` | `/practice-logs` | Chemical & PHI audit trail | Both Apps |
| `POST` | `/batches` | Aggregated export consignment creation | Android Agent App |
| `GET` | `/batches` | Consignment batch list with quality grades | Both Apps |
| `GET` | `/admin/overview` | KPI summary, Action Required, System Status | Admin Dashboard |
| `GET` | `/admin/agents` | Agent fleet sync health monitoring | Admin Dashboard |
| `GET` | `/admin/batches` | Batch validation & quarantine statuses | Admin Dashboard |
| `GET` | `/admin/activity` | Real-time audit activity feed | Admin Dashboard |
| `GET` | `/admin/system-status` | Backend latency, DB connection, uptime | Admin Dashboard |
| `POST` | `/documents/upload` | Upload regulatory/KYC document with SHA256 seal | Both Apps |
| `GET` | `/documents` | Search & filter documents (Phytosanitary, EUDR, Lab MRL) | Both Apps |
| `GET` | `/documents/{id}` | Inspect document details and cryptographic hash | Both Apps |
| `PATCH` | `/documents/{id}/verify` | Compliance officer review & verification | Admin Dashboard |
| `POST` | `/auth/login` | JWT login for agents and administrators | Both Apps |
| `POST` | `/auth/refresh` | Seamless JWT token refresh | Both Apps |

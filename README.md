# 🌾 TraceHarvest Admin Portal & Agricultural Traceability Control Center

[![CI Safeguards & Build Verification](https://github.com/rooq-3marten/admindashtrace/actions/workflows/verify-and-build.yml/badge.svg)](https://github.com/rooq-3marten/admindashtrace/actions)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node: 20+](https://img.shields.io/badge/Node-20%2B-green.svg)](https://nodejs.org)

TraceHarvest is the national agricultural traceability and compliance operations platform for Nigerian commodity export value chains (Sesame, Soybeans, Ginger, Hibiscus). It connects field extension agents on mobile with central compliance officers to guarantee European Union Deforestation Regulation (**EUDR**) and **NAFDAC** export compliance.

---

## 🚀 Key Features

* **Field Agent Registration & Approval Workflow**:
  * Mobile agents register from the Android app; server strictly forces `status = "pending"`.
  * Dedicated **Pending Agents** dashboard with search, cooperative/location filters, pagination, and pending badges.
  * Compliance officers review submitted details, issue clearances, or reject with a mandatory audit reason.
  * Full lifecycle support: **Approve**, **Reject**, **Suspend**, and **Reinstate**.
* **Automated Notification Dispatch**:
  * Transactional emails dispatched upon approval, rejection, or suspension.
  * Modular notification adapters for SMS (Termii/Twilio Nigeria) and FCM push notifications.
* **Audit Trail Sentinel**:
  * Cryptographically tracked and persistent audit log capturing every administrative action (`self_register`, `approve`, `reject`, `suspend`, `reinstate`).
* **EUDR Geospatial & PHI Compliance**:
  * GeoJSON plot boundary validation with Copernicus satellite cross-referencing.
  * Pre-Harvest Interval (PHI) holding periods for chemical sprays.
* **Production Build Safeguards**:
  * Fail-fast TypeScript strict verification on every build.
  * Post-build release sentinel script (`scripts/verify-build.js`).
  * GitHub Actions continuous integration pipeline.
  * React `ErrorBoundary` and server-level crash defenses.

---

## 📱 Mobile Developer API Contract (Hand-off)

### 1. Agent Self-Registration
* **Endpoint**: `POST /api/v1/auth/agent-register` *(or `POST /api/v1/agents/register`)*
* **Rate Limit**: 5 registrations per 15 minutes per IP address.
* **Request Headers**: `Content-Type: application/json`
* **Request Payload**:
  ```json
  {
    "full_name": "Fatima Sani Danbatta",
    "email": "fatima.sani@dambatta-sesame.ng",
    "phone": "+2348023456789",
    "association": "Dambatta Sesame Growers Union",
    "location": "Kano State, Dambatta LGA",
    "password": "StrongPassword123"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "status": "pending",
    "message": "Field agent registration submitted successfully. Your account is pending administrative review. You will receive an email once approved.",
    "agent": {
      "id": "AGENT-NG-721",
      "full_name": "Fatima Sani Danbatta",
      "email": "fatima.sani@dambatta-sesame.ng",
      "phone": "+2348023456789",
      "association": "Dambatta Sesame Growers Union",
      "location": "Kano State, Dambatta LGA",
      "status": "pending",
      "created_at": "2026-10-09T09:00:00.000Z"
    }
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (`VALIDATION_ERROR`, `INVALID_EMAIL_FORMAT`, `INVALID_PHONE_FORMAT`, `WEAK_PASSWORD`)
  * `409 Conflict` (`DUPLICATE_EMAIL`, `DUPLICATE_PHONE`)
  * `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`)

---

### 2. Post-Sign-In Account Status Check
* **Endpoint**: `GET /api/v1/agents/me`
* **Query Params or Headers**: `GET /api/v1/agents/me?email=fatima.sani@dambatta-sesame.ng` or `Authorization: Bearer <token>`
* **Status Enum Values**:
  * `pending` — Application submitted, awaiting compliance review. Mobile app must show "Application Under Review" screen.
  * `approved` — Verified and active. Agent can proceed to field surveys and sync.
  * `rejected` — Application denied. Returns `rejection_reason` explaining the issue.
  * `suspended` — Temporarily deactivated by administration. Returns administrative suspension note.
* **Blocked Ingestion Behavior**:
  * If a pending, rejected, or suspended user attempts to ingest field records via `/api/v1/sync/upstream`, the server returns `403 Forbidden`:
  ```json
  {
    "error": "AGENT_NOT_APPROVED",
    "status": "pending",
    "message": "Your agent account is currently 'pending'. Access to operational data and sync is restricted until approved."
  }
  ```

---

## 🗄️ Database Architecture & Migrations

### Tables
1. **`agents`**:
   * `id` (UUID / Primary Key)
   * `auth_user_id` (Text)
   * `full_name` (Text)
   * `email` (Text, Unique)
   * `phone` (Text, Unique, Nigerian format validated: `+234...` or `080...`)
   * `association` (Text)
   * `location` (Text)
   * `status` (Enum: `pending`, `approved`, `rejected`, `suspended`)
   * `rejection_reason` (Text, Nullable; required if status is `rejected`)
   * `reviewed_by` (Text, Nullable)
   * `reviewed_at` (Timestamp with timezone, Nullable)
   * `created_at` / `updated_at` (Timestamps)
2. **`audit_log`**:
   * `id` (UUID / Primary Key)
   * `actor_id` (Text)
   * `actor_name` (Text)
   * `action` (Enum: `self_register`, `approve`, `reject`, `suspend`, `reinstate`, `profile_update`)
   * `target_agent_id` (UUID, Foreign Key)
   * `details` (JSONB)
   * `created_at` (Timestamp with timezone)

Migration file is located at:
`migrations/001_create_agents_and_audit_log.sql`

---

## 🛠️ Local Development & Build Verification

```bash
# Install dependencies
npm install

# Start full-stack development server (Express + Vite)
npm run dev

# Run strict type checking
npm run lint

# Run certified production build with verification sentinel
npm run build
```

---

## 🔒 Security & Data Integrity Safeguards

* **Zero Test Farmers in Production**: The codebase, seed data, and verification sentinel enforce strict separation between test scripts and production data.
* **Row-Level Security (RLS)**: Enforced both at the PostgreSQL schema layer and within Express server middleware.
* **Client Key Isolation**: Server keys are never exposed to browser bundles.

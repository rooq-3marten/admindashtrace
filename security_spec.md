# TraceHarvest Security Specification & Firestore Hardening

## 1. Data Invariants
1. Only authenticated administrators with verified email addresses may read or write TraceHarvest regulatory records.
2. The user `shekonifarooq@gmail.com` is bootstrapped as Super Admin.
3. Every farmer record must contain a valid non-empty `client_uuid` (max 64 chars) and `official_farmer_id` (TH-{STATE}-2026-XXXX format).
4. Every practice record must link to an existing `farmer_client_uuid` and have non-negative numerical quantities.
5. Export Consignment Batches can only be certified/approved by authorized Compliance Officers or Super Admins.
6. A batch in `CERTIFIED_COMPLIANT` state has an immutable `tamper_proof_sha256` checksum.
7. Mobile sync logs cannot be deleted or backdated.
8. Role escalation: Users cannot modify their own `role` in `/users/{userId}` to prevent privilege escalation.

## 2. The "Dirty Dozen" Attack Payloads (Must be blocked)
1. **Unauthenticated Read on Farmers Registry**: `GET /farmers` with `auth == null` -> DENIED.
2. **Unauthenticated Sync Ingestion Injection**: `POST /farmers/fake-id` with unverified auth token -> DENIED.
3. **Ghost Field Poisoning**: Inserting extra unauthorized fields `{ isHacked: true, backdoor: 1 }` into `/farmers/{id}` -> DENIED.
4. **Id Injection Overflow Attack**: Document ID with 2KB string -> DENIED by `isValidId()`.
5. **Self-Assigned Super Admin Privilege Escalation**: Regular user updating `/users/{uid}` with `{ role: 'super_admin' }` -> DENIED.
6. **Chemical Practice Log Tampering**: Modifying `date_applied_epoch_ms` to bypass Pre-Harvest Interval (PHI) count -> DENIED for non-admins.
7. **Negative Farm Size Exploitation**: Setting `farm_size_hectares: -50.0` -> DENIED.
8. **Malicious Batch Checksum Replacement**: Overwriting `tamper_proof_sha256` of an already certified batch -> DENIED.
9. **Fake NAFDAC Approval Injection**: Injecting arbitrary boolean without meeting GAP requirements -> DENIED.
10. **Spoofed Email Admin Bypass**: Attempting admin write with `email_verified == false` -> DENIED.
11. **Unbounded Array Injection**: Injecting 10,000 polygon array objects -> DENIED by size bounds.
12. **Orphan Practice Insertion**: Inserting practice with empty `farmer_client_uuid` -> DENIED.

## 3. Test Runner Definition (`firestore.rules.test.ts`)
Validates that all 12 attack vectors above are blocked by Firestore ABAC rules.

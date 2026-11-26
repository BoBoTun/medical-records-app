# Secure Medical Record Access App

Doctors view only the records they wrote; admins view everything. JWT auth + role-based access control (RBAC), React UI, Express API, PostgreSQL.

## Quick start

**Prerequisites:** Node 22 (`.nvmrc`), Docker Desktop (running).

```bash
npm install        # root tooling (concurrently)
npm run setup      # .env, PostgreSQL (Docker), deps, migrations, seed (~2k patients, 100k records)
npm run dev        # API http://localhost:4000, UI http://localhost:5173
npm test           # 17 tests (RBAC + search)
```

**Demo logins:** `admin / admin123` · `dr.smith / doctor123` · `dr.jones / doctor123`

**Troubleshooting:** `npm run setup` needs Docker Desktop running and ports 5432 (PostgreSQL), 4000 (API) and 5173 (UI) free. If 5173 is taken, Vite silently moves to another port.

## Stack

Node 22 · Express 5 · TypeScript · Prisma 6 · PostgreSQL 16 (Docker) · JWT · vitest + supertest · React + Vite + TypeScript

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{username, password}` → JWT (8h; `sub` = user id, `role` claim) |
| GET | `/patients/:id/records?page=&limit=` | Required endpoint. limit max 100 |
| GET | `/patients?search=&limit=` | Bonus: name search, limit max 50 |

## Database

- `patients (id, name, date_of_birth)`
- `medical_records (id, patient_id, doctor_id, diagnosis, treatment, created_at)`
- `users (id, username, password_hash, name, role DOCTOR|ADMIN)`: added for authentication; `doctor_id` references it.
- Indexes for 100k+ rows: `(patient_id, created_at DESC)`, `(doctor_id, patient_id, created_at DESC)`, `patients.name` GIN `pg_trgm` (fast `ILIKE`). Records query: ~0.5 ms (`EXPLAIN ANALYZE`, 100k rows).

## Auth & RBAC

Passwords are bcrypt-hashed. Middleware verifies the JWT (401 if missing/invalid). Authorization is enforced **in the query**, not just the UI:
- **Admin:** all patients and records; unknown patient → 404.
- **Doctor:** records filtered by `doctor_id = token user`; patient list limited to patients they wrote records for. A doctor requesting someone else's patient gets `200` with an empty list (not 404), so patient IDs cannot be probed.
- Invalid id → 400.

## Frontend

Login, debounced (350 ms) patient search, records table with pagination, role badge and role-aware captions (Admin: "All patients", Doctor: "My patients"). Token kept in `sessionStorage`. Vite proxies `/api` to `:4000`.

## Assumptions & trade-offs

- "Assigned patient" = a patient the doctor has written a record for. Production would use an explicit assignment table.
- Tables kept to the specified columns; production would add sex, contact, blood type, allergies.
- `sessionStorage` token is readable by XSS; an httpOnly cookie is safer but needs CSRF protection and more setup.
- Search does not escape `%`/`_`; harmless here because RBAC filtering is applied separately.
- `JWT_SECRET` in `.env.example` is a placeholder and must be changed in production.
- Pagination: page-based for records, `limit` only for the patient search.
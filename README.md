# Organ Donation System

A web platform for **registering organ donors**, recording **organs pledged or procured at hospitals**, and letting
families and care teams **search organ availability** by organ type and city. Administrators verify records, manage
donors and hospitals, and review withdrawal requests.

The project started as a *Kidney Donation Management System* built with Express, EJS and MySQL. **Phase 1**
(this version) migrates it to a modern full-stack TypeScript application and generalises it to multiple organ
types, while preserving every workflow of the original app.

> Information shown by this application does not replace advice from a medical team.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Database](#database)
- [Authentication & security](#authentication--security)
- [API](#api)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Testing](#testing)
- [Migration notes (legacy → Phase 1)](#migration-notes-legacy--phase-1)
- [Roadmap](#roadmap)

---

## Features

### Public
- **Landing page**: "Become a Donor" and "Find an Organ" calls to action, how it works, supported organ types,
  current availability and participating hospitals. Every number shown is a **live count from the database**;
  empty states are shown when there is no data. Nothing is invented.
- **Organ availability search**: filter by organ type, city and availability. Shows hospital name, city,
  address and contact. **Donor identity is never exposed.**
- **Hospital directory**: hospitals with contact details and live available-organ counts per type.

### Donors
- Registration (personal, address, medical, registered hospital, personal doctor, next of kin) and sign-in.
- Dashboard: account status, Donor ID, organ counts, withdrawal status, recent activity.
- Profile: edit personal, medical/ailment, hospital/doctor and next-of-kin details; change password.
- Register organs (organ type, hospital, procurement date, notes) and track their status.
- Request withdrawal with a reason, after a confirmation step, then track the request's status.

### Administrators
- Dashboard with live registry figures.
- **Donor management**: search, filter, view details, edit (email, phone, medical conditions, status),
  reset password, delete (with confirmation).
- **Organ management**: create by Donor ID, edit, change status (Pending → Available → Unavailable), delete.
- **Hospital information**: create, edit, delete (blocked while organ records reference the hospital).
- **Withdrawal requests**: review queue, approve or decline with an optional note.

### Supported organ types
`KIDNEY`, `LIVER`, `HEART`, `LUNG`, `PANCREAS`, `CORNEA`, and `OTHER` (with a free-text name for other organs and tissue).

---

## Architecture

```
Browser ──► client (React SPA, Vite)
              │  fetch /api/v1/*  (credentials: include, httpOnly JWT cookie)
              ▼
            server (Express 5, TypeScript)
              routes ─► validate (zod) ─► controllers ─► services ─► Prisma ─► PostgreSQL
              requireAuth / requireRole guards, central error handler, DTO mappers
```

- **npm workspaces** monorepo: `client/` and `server/`; Prisma lives in `prisma/` at the repo root.
- In development Vite proxies `/api` to the API, so the auth cookie is same-origin.
- In production the API can serve the built SPA (`client/dist`) from the same origin, or the SPA can be hosted
  separately (set `VITE_API_BASE_URL` and `CLIENT_ORIGIN`).
- **Server layering**: routes only wire middleware; controllers translate HTTP; services hold business rules
  and talk to Prisma; mappers shape every response (no password hashes, no donor data on public endpoints).
- **Client layering**: `api/` typed endpoint modules → `features/*/hooks.ts` (TanStack Query) → feature
  components → `pages/`. Forms use React Hook Form + Zod and map server field errors inline.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 3, shadcn/ui-style components on Radix UI, Lucide icons, React Router 7, TanStack Query 5, React Hook Form, Zod, sonner |
| Backend  | Node.js 20.19+ / 22, Express 5, TypeScript, Prisma 6, PostgreSQL, jsonwebtoken, bcryptjs, zod, helmet, cors, express-rate-limit |
| Tooling  | Vitest, Testing Library, supertest, ESLint (typescript-eslint, react-hooks, jsx-a11y), tsx |

## Folder structure

```
.
├── client/                    React SPA
│   ├── public/                favicon, pre-paint theme script
│   └── src/
│       ├── api/               typed API client + one module per resource
│       ├── components/
│       │   ├── ui/            design-system primitives (button, dialog, select, table, …)
│       │   ├── common/        composites (DataTable, EmptyState, ErrorState, ConfirmDialog, FormField, …)
│       │   ├── navigation/    navbar, footer, user menu
│       │   └── theme/         ThemeProvider + toggle
│       ├── features/          auth, donors, organs, hospitals, withdrawals, admin (hooks + feature components)
│       ├── hooks/             generic hooks (debounce, URL list params, document title)
│       ├── layouts/           public, auth, dashboard (donor/admin) layouts
│       ├── lib/               query client/keys, formatting, domain labels, form helpers
│       ├── pages/             route components (public, auth, donor, admin)
│       ├── types/             API contract types
│       ├── App.tsx, router.tsx, main.tsx
├── server/                    REST API
│   ├── scripts/create-admin.ts
│   ├── src/
│   │   ├── config/            env validation
│   │   ├── controllers/  routes/  services/  schemas/  middleware/  utils/
│   │   ├── app.ts             express app factory
│   │   └── server.ts          entry point
│   ├── tests/                 Vitest + supertest (Prisma mocked)
│   └── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                DEV-ONLY demo data
├── .env.example
└── package.json               workspace root
```

## Database

PostgreSQL via Prisma (`prisma/schema.prisma`).

| Model | Purpose | Key constraints |
|-------|---------|-----------------|
| `User` | Credentials and role (`DONOR` / `ADMIN`) | unique `email`; bcrypt `password_hash` |
| `Donor` | Donor profile, Donor ID (`donor_code`, e.g. `DN4K7Q2M`), medical info, status | 1:1 `user_id`; unique `donor_code`; optional FK to `Hospital` |
| `Admin` | Administrator profile | 1:1 `user_id` |
| `NextOfKin` | Donor's next of kin | 1:1 unique `donor_id` |
| `Hospital` | Name, city, state, address, phone, email | unique (`name`, `city`) |
| `Organ` | Organ record: type, status, procurement date, notes | FK `donor_id` (cascade), **FK `hospital_id` (restrict)** |
| `WithdrawalRequest` | Donor's request to withdraw + review outcome | FK `donor_id` (cascade), FK `reviewed_by_id` → Admin |

Enums: `Role`, `Gender`, `DonorStatus` (ACTIVE, WITHDRAWN), `OrganType`, `OrganStatus` (PENDING, AVAILABLE,
UNAVAILABLE), `WithdrawalStatus` (PENDING, APPROVED, REJECTED). Every table has `created_at` / `updated_at`;
search paths are indexed.

**Status rules**
- Donor-submitted organs start `PENDING`; admins verify them (`AVAILABLE`) or mark them `UNAVAILABLE`.
- Public search only ever returns `AVAILABLE` (default) or `UNAVAILABLE` organs, never `PENDING`.
- A donor may have one `PENDING` withdrawal request at a time. Approving it sets the donor to `WITHDRAWN` and
  their `PENDING`/`AVAILABLE` organs to `UNAVAILABLE`. Deleting a donor is a separate admin action.

## Authentication & security

- JWT (HS256, `{ sub, role }`, expiry from `JWT_EXPIRES_IN`) in an **httpOnly** cookie `ods_token`
  (`SameSite=Lax`, `Secure` in production).
- `requireAuth` re-loads the user on every request (deleted users or changed roles are rejected immediately);
  `requireRole('DONOR' | 'ADMIN')` guards every private route.
- **All passwords are bcrypt hashes** (cost 12), admins included. Admin accounts are created with
  `npm run admin:create`; there is no public admin sign-up.
- Login returns the same error for unknown email and wrong password, with equalised timing.
- Rate limiting on login, registration and password change (failed attempts).
- Every request body/query/param is validated by **strict zod schemas**: unknown fields are rejected, so
  clients can never choose which column gets updated.
- `helmet` security headers, CORS restricted to `CLIENT_ORIGIN`, 100 kB JSON body limit.
- All secrets come from the environment; the server refuses to start with a missing or short `JWT_SECRET`.
- Public endpoints return organ + hospital data only. Admin organ lists show donors by ID and name only.

## API

Base path: `/api/v1`. Success: `{ "data": …, "meta"?: { page, pageSize, total, totalPages } }`.
Error: `{ "error": { "code", "message", "details"?: { "fields": [{ "path", "message" }] } } }`.

| Method & path | Access | Description |
|---------------|--------|-------------|
| `POST /auth/register` | public | Donor sign-up (creates user, donor, next of kin) |
| `POST /auth/login` | public | Sign in (`portal`: `DONOR` or `ADMIN`) |
| `POST /auth/logout` | public | Clear the session cookie |
| `GET /auth/me` | signed in | Current session user |
| `PATCH /auth/password` | signed in | Change own password (requires current password) |
| `GET /donors/me` · `PATCH /donors/me` | donor | Own profile |
| `PUT /donors/me/next-of-kin` | donor | Create/update next of kin |
| `GET /donors/me/dashboard` | donor | Dashboard data + activity |
| `GET /donors/me/organs` · `POST /donors/me/organs` | donor | Own organs / register an organ |
| `GET /donors` · `GET /donors/:id` | admin | List (search, status, paging) / detail |
| `PATCH /donors/:id` · `PUT /donors/:id/password` · `DELETE /donors/:id` | admin | Update / reset password / delete |
| `GET /organs/availability` | public | Availability search (`organType`, `city`, `hospitalId`, `availability`, paging) |
| `GET /organs/availability/summary` | public | Live counts for the landing page |
| `GET /organs` · `POST /organs` · `PATCH /organs/:id` · `DELETE /organs/:id` | admin | Organ management |
| `GET /hospitals` · `GET /hospitals/:id` | public | Directory with availability |
| `GET /hospitals/options` · `GET /hospitals/cities` | public | Form/filter helpers |
| `POST /hospitals` · `PATCH /hospitals/:id` · `DELETE /hospitals/:id` | admin | Hospital management |
| `GET /withdrawals/mine` · `POST /withdrawals` | donor | Own requests / submit |
| `GET /withdrawals` · `PATCH /withdrawals/:id` | admin | Review queue / approve or decline |
| `GET /admin/overview` | admin | Dashboard figures |
| `GET /health` | public | Liveness |

## Environment variables

Copy `.env.example` to `.env` **at the repository root** (both the server and Prisma read it).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | ≥ 32 random characters |
| `JWT_EXPIRES_IN` | no | Session lifetime, e.g. `8h` (default), `30m`, `7d` |
| `PORT` | no | API port (default `4000`) |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `CLIENT_ORIGIN` | no | Allowed browser origin(s), comma-separated (default `http://localhost:5173`) |
| `COOKIE_SECURE` | no | `true` when serving over HTTPS outside production (always on in production) |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MIN` | no | Failed auth attempts allowed per window (default 10 per 15 min) |
| `VITE_API_BASE_URL` | no | Only when the API is on another origin; leave empty in development |

Never commit `.env`.

## Getting started

### Prerequisites
- Node.js **20.19+** (22 LTS recommended) and npm 10+
- PostgreSQL **14+**

### 1. Install
```bash
npm install
```

### 2. Create the database
```bash
# psql as a superuser
CREATE ROLE organ_app WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE organ_donation OWNER organ_app;
# `prisma migrate dev` also needs permission to create a temporary shadow database:
ALTER ROLE organ_app CREATEDB;
```
Or with Docker:
```bash
docker run --name organ-db -e POSTGRES_USER=organ_app -e POSTGRES_PASSWORD=choose-a-strong-password \
  -e POSTGRES_DB=organ_donation -p 5432:5432 -d postgres:16
```

### 3. Configure
```bash
cp .env.example .env
# set DATABASE_URL and JWT_SECRET, e.g.
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4. Apply migrations and create an admin
```bash
npm run db:migrate          # development (applies prisma/migrations, generates the client)
# or in production:
npm run db:deploy

npm run admin:create -- --email admin@your-hospital.org --name "Registry Admin"
# prompts for a password (or set ADMIN_PASSWORD)
```

### 5. (Optional) Load demo data, development only
```bash
npm run db:seed
```
Creates obviously fictional records (`Demo …` hospitals, `@example.com` users, password `DemoPass123` or
`SEED_DEMO_PASSWORD`). It refuses to run when `NODE_ENV=production`. All counts in the UI are live database counts,
so they simply reflect whatever is in your database.

### 6. Run
```bash
npm run dev
```
- Client: http://localhost:5173
- API: http://localhost:4000/api/v1

## Scripts

Run from the repository root:

| Script | Description |
|--------|-------------|
| `npm run dev` | API (tsx watch) + client (Vite) together |
| `npm run build` | `prisma generate` + server `tsc` build, then client `tsc -b && vite build` |
| `npm start` | Run the built API (`server/dist/server.js`; serves `client/dist` when `NODE_ENV=production`) |
| `npm run typecheck` | Type-check server and client |
| `npm run lint` | ESLint for server and client |
| `npm test` | Server and client test suites |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` / `db:generate` | Prisma helpers |
| `npm run admin:create` | Create or re-password an administrator |

## Testing

```bash
npm test
```
- **Server** (`server/tests`, Vitest + supertest, Prisma mocked so no database is needed): login/registration
  validation, cookie flags, rejection of plaintext admin passwords, forged/expired tokens, role restrictions
  (donor ↔ admin), rate limiting, strict field whitelisting, public availability never exposing donor data or
  `PENDING` organs, organ/hospital FK rules, withdrawal approval side effects, hospital deletion guard, error
  envelope and security headers.
- **Client** (`client/src/test`, Vitest + Testing Library): API client envelope/error handling, accessible
  form fields, status badges with text labels, DataTable loading/empty/error states.

End-to-end tests against a real PostgreSQL database are not part of Phase 1 (see roadmap).

## Migration notes (legacy → Phase 1)

| Legacy | Phase 1 |
|--------|---------|
| Express + EJS views, Bootstrap CDN | React SPA + Express JSON API |
| MySQL, schema never defined in repo | PostgreSQL + Prisma schema and migrations |
| `organs.Organ_name` free text | `Organ.organType` enum (+ `otherOrganName` for `OTHER`) |
| `organs.Hospital` joined to `hospitaldetails` by name | `Organ.hospitalId` foreign key |
| `deletionreason` table | `WithdrawalRequest` with review status |
| User-chosen `DN…` username | Generated Donor ID `donorCode` (login was always by email) |
| Admin login by AdminID + **plaintext** password | Admin login by email + bcrypt hash |
| `express-session` secret `'I am inevitible'`; MySQL creds/port 8111 hardcoded (twice) | Everything from env, validated at boot |
| `UPDATE donor SET ' + req.body.field + ' = ?` | Strict zod schemas; only whitelisted fields |
| Admin "Ailments" update appended text (`CONCAT`) | Medical conditions are edited as a whole |
| JWT contained the whole DB row incl. password hash, no expiry | `{ sub, role }`, expiring |

## Roadmap

**Phase 1 (done): modernization**
Multi-organ data model, PostgreSQL/Prisma, versioned REST API, secure auth, accessible responsive UI with
light/dark themes, donor portal, admin console, tests.

**Next (still Phase 1 hardening)**
- CI pipeline (typecheck, lint, test, build) and integration tests against a real PostgreSQL database.
- Audit log of admin actions; organ status history.
- Email notifications (withdrawal outcome, password reset links instead of admin-set passwords).

**Future phases (not implemented)**
Recipient registration and workflows, organ matching and compatibility scoring, predictive analytics,
simulations, AI assistants/recommendations. The service layer is organised by domain so these can be added as
new modules without reshaping the Phase 1 API.

## License

GPL-3.0. See [LICENSE](LICENSE).

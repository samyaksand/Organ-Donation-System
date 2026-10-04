# OrganFlow

## Organ Donation Network Platform

OrganFlow is a web platform for donor registration, organ management, hospital information, and organ availability. Donors can manage their profiles, register organs, and request withdrawals. Administrators manage donors, organs, hospitals, and withdrawal requests.

The public can search available organs and browse hospitals without seeing donor information.

## Live Demo

🌐 **Live Website:** [https://organflow.samyaksand.com/](https://organflow.samyaksand.com/)

This is a publicly deployed demo running fictional demo data (see [Demo Admin](#demo-admin)). It does not hold real
patient or medical records and is not used for production healthcare.

---

## From CS254 to OrganFlow

About four years ago, this project began as a Kidney Donation Management System for my Database Systems (CS254) course under Prof. Annappa, where I received a 9 CGPA for this project. The original application was built with Express, EJS, and MySQL and consisted of seven pages covering donor registration, donor and admin accounts, and kidney availability.

I recently returned to the project and rebuilt it as OrganFlow. The core workflow remains recognizable, but the project has grown from a course assignment into a full-stack, multi-organ platform with a modern architecture, role-based access control, stronger security, a redesigned interface, automated testing, and deployment. It now supports managing donors, organs, hospitals, availability, and administrative workflows through a unified system.

## From the Original Project to OrganFlow

| Area | Original Project | OrganFlow |
|------|------------------|-----------|
| Scope | Kidney-focused | Multi-organ platform (kidney, liver, heart, lung, pancreas, cornea, other) |
| Frontend | HTML, CSS, JavaScript, EJS | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express + Node.js | Express + TypeScript REST API |
| Database | MySQL | PostgreSQL + Prisma |
| User experience | Basic multi-page workflow | Responsive SPA with light/dark mode |
| Donor management | Basic donor registration and account pages | Donor portal, profile, medical information, next of kin, organ registration, withdrawal workflow |
| Organ management | Kidney availability | Multi-organ registry, organ status, donor and hospital associations |
| Hospital management | Basic hospital/centre information | Hospital directory, management, and availability information |
| Administration | Basic admin pages | Admin dashboard with donor, organ, hospital and withdrawal management |
| Authentication | Legacy authentication | JWT, HTTP-only cookies, bcrypt, role-based authorization |
| Validation | Basic validation | Strict Zod validation and structured API errors |
| Security | Legacy configuration and security practices | Environment-based secrets, rate limiting, Helmet, CORS, secure cookies |
| Testing | No comparable automated test suite | Automated frontend and backend test suites (Prisma mocked; see Testing) |
| Architecture | Express + EJS application | React SPA, layered Express API, Prisma, PostgreSQL |

## What Changed

- Re-engineered the original application with a modern full-stack architecture.
- Migrated MySQL to PostgreSQL with Prisma and a structured schema.
- Generalized the system from kidney-only workflows to multiple organ types.
- Rebuilt the UI and donor/admin workflows as a responsive single-page app.
- Added proper authentication, authorization, validation, security practices and automated tests.

---

## Contents

- [Live Demo](#live-demo)
- [Screenshots](#screenshots)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Database](#database)
- [Authentication & security](#authentication--security)
- [API](#api)
- [Getting started](#getting-started)
- [Demo Admin](#demo-admin)
- [Testing](#testing)
- [Migration notes (legacy to Phase 1)](#migration-notes-legacy-to-phase-1)

---

## Screenshots

Captured from the running OrganFlow application with demo data (Mumbai hospitals, synthetic donors). All screenshots
live in [`docs/screenshots/`](docs/screenshots/).

### Public

| | |
|---|---|
| ![Landing page](docs/screenshots/01-landing-page.png) **Landing page** | ![Organ availability search](docs/screenshots/02-organ-availability-search.png) **Organ availability search** |
| ![Filtered by organ type](docs/screenshots/03-organ-availability-filtered.png) **Filtered by organ type (Kidney)** | ![Hospital directory](docs/screenshots/04-hospital-directory.png) **Hospital directory, with address, contact and availability per hospital** |

### Authentication

| | |
|---|---|
| ![Donor registration](docs/screenshots/05-donor-registration.png) **Donor registration** | ![Donor sign in](docs/screenshots/06-donor-login.png) **Donor sign in** |
| ![Administrator sign in](docs/screenshots/07-admin-login.png) **Administrator sign in** | |

### Donor Portal

| | |
|---|---|
| ![Donor dashboard](docs/screenshots/08-donor-dashboard.png) **Dashboard: account status, organ counts, recent activity** | ![Profile, personal details](docs/screenshots/09-donor-profile-personal.png) **Profile, personal details** |
| ![Profile, medical and care](docs/screenshots/10-donor-profile-medical.png) **Profile, medical and care details** | ![Profile, next of kin](docs/screenshots/11-donor-profile-next-of-kin.png) **Profile, next of kin** |
| ![Profile, change password](docs/screenshots/12-donor-profile-security.png) **Profile, change password** | ![Registered organs](docs/screenshots/13-donor-registered-organs.png) **Registered organs and their status** |
| ![Add organ](docs/screenshots/14-donor-add-organ.png) **Register a new organ** | ![Withdrawal request](docs/screenshots/15-donor-withdrawal-request.png) **Withdrawal request, with confirmation** |

### Admin Portal

| | |
|---|---|
| ![Admin dashboard](docs/screenshots/16-admin-dashboard.png) **Dashboard with live registry figures** | ![Donor management](docs/screenshots/17-admin-donor-management.png) **Donor management: search, filter, status** |
| ![Edit donor](docs/screenshots/18-admin-donor-edit.png) **Edit donor details** | ![Organ management](docs/screenshots/19-admin-organ-management.png) **Organ management across all organ types** |
| ![Add organ record](docs/screenshots/20-admin-organ-create.png) **Create an organ record for a donor** | ![Hospital management](docs/screenshots/21-admin-hospital-management.png) **Hospital management** |
| ![Add hospital](docs/screenshots/22-admin-hospital-create.png) **Add a hospital** | ![Withdrawal review queue](docs/screenshots/23-admin-withdrawal-review.png) **Withdrawal review queue** |
| ![Approve withdrawal dialog](docs/screenshots/24-admin-withdrawal-approve-dialog.png) **Approve a withdrawal, with its effect explained before confirming** | |

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

![OrganFlow Architecture](docs/architecture.png)

The React client calls a versioned REST API over httpOnly JWT cookies. Express routes validate and authorize each
request before handing off to controllers and services, which use Prisma to read and write PostgreSQL.

### Project flow

![OrganFlow Project Flow](docs/project-flow.png)

The public can search organ availability and browse hospitals without signing in. Donors register, manage their
profile and medical details, register organs, and track status and withdrawal requests. Administrators sign in
separately to manage donors, organs and hospitals, and to review withdrawal requests. All three flows go through
the same versioned API and PostgreSQL database.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript, Zod, JWT, bcrypt |
| Database | PostgreSQL, Prisma |
| Testing / Tooling | Vitest, Testing Library, Supertest, ESLint |

## Folder structure

```
client/     React SPA (donor and admin portals, public pages)
server/     Express REST API (routes, controllers, services)
prisma/     Database schema, migrations and seed data
docs/       Screenshots and architecture diagram
package.json  Workspace root (npm workspaces)
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

- JWT authentication in an httpOnly cookie, with role-based authorization for donor and admin routes.
- Passwords are hashed with bcrypt, admin accounts included. There is no public admin sign-up.
- Every request is validated with Zod schemas, so unexpected fields are rejected.
- Rate limiting on authentication endpoints and standard security headers (Helmet, CORS).
- All secrets come from environment variables; nothing is hardcoded.

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

## Demo Admin

Anyone can explore the deployed admin portal using a public demo account:

- **Email**: `demo@organflow.app`
- **Password**: `DemoAdmin123!`

The Demo Admin has normal administrator permissions, so you can create, edit, and delete demo donors, organs,
hospitals, and withdrawal requests, including destructively. It only ever operates on demo data.

The system also has a separate, private Super Admin account held by the project owner. It is not publicly
documented and has system recovery privileges the Demo Admin does not have.

> Even if a demo user deletes or modifies the demo data, the system can be restored by the private Super Admin
> to the known-good demo state.

For local development, running `npm run db:seed` (step 5 above) also creates its own local-only admin account
(`demo.admin@example.com` / `DemoPass123`), separate from the public Demo Admin.

## Testing

```bash
npm test
```
- **Backend**: authentication, authorization, validation, security, organ and hospital workflows, and
  withdrawal handling, run against a mocked database.
- **Frontend**: API client handling, forms, accessibility, and UI states (loading, empty, error).
- Built with Vitest, Testing Library, and Supertest.

## Migration notes (legacy to Phase 1)

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

## License

GPL-3.0. See [LICENSE](LICENSE).

# OrganFlow

## An Organ Donation Operations and Intelligence Platform

OrganFlow turns organ donation record-keeping into an operational information system: donor
and organ registration, hospital coordination, a structured request-and-fulfillment workflow,
deterministic management analytics, and a controlled, read-only AI layer that interprets those
analytics for administrators. Every figure shown anywhere in the product, public or admin,
is a live database count, never a hardcoded or invented number.

> **This is demo/simulated data for a database-systems course project.** It is not a live
> national donor registry, a hospital information system, or a real transplant allocation
> platform, and it does not store real patient or medical records.

## Live Demo

🌐 **Live Website:** [https://organflow.samyaksand.com/](https://organflow.samyaksand.com/)

The public site, donor and admin portals, analytics, pledge flow, and AI investigation are all
reachable without an account except where noted. A public Demo Admin login is documented below.

---

## From CS254 to OrganFlow

About four years ago, this project began as a Kidney Donation Management System for my Database
Systems (CS254) course under Prof. Annappa at NITK Surathkal, where it received a 9 CGPA. The
original application was built with Express, EJS, and MySQL, and covered seven pages of donor
registration, donor/admin accounts, and kidney availability.

I later rebuilt it as OrganFlow, in stages:

1. **Full-stack platform** - generalized from kidney-only to seven organ types, moved to React,
   TypeScript, Express, and PostgreSQL/Prisma, and rebuilt authentication, validation, and
   security from scratch.
2. **Operational workflows** - added a structured hospital organ-request pipeline (request,
   review, approval, allocation) and a shared workflow-event log behind it.
3. **Management analytics** - added a deterministic KPI/trend/threshold layer over that data,
   so the registry's own numbers became measurable and decision-ready.
4. **Public exploration** - opened organ availability, hospital directory, and analytics to
   the public (aggregate-only, donor identity never exposed), plus a no-account donation pledge.
5. **AI-assisted investigation** - added a read-only agent that reasons over the existing
   analytics (never raw data) to answer operational questions with cited evidence.

The core idea has not changed: a registry of donors, organs, and hospitals, now surrounded by
the workflow, analytics, and decision-support layers a real operations team would need.

---

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Management information system positioning](#management-information-system-positioning)
- [Hospital organ request workflow](#hospital-organ-request-workflow)
- [Donation pledge](#donation-pledge)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Database](#database)
- [API](#api)
- [Authentication, security and data governance](#authentication-security-and-data-governance)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Screenshots

Captured from the running application with demo data (desktop, 1440x900). All screenshots
live in [`docs/screenshots/`](docs/screenshots/).

### Public

| | |
|---|---|
| ![Landing page](docs/screenshots/01-landing-page.png) **Landing page**: live counts, the explore-to-act flow, and a prominent pledge call to action | ![Organ availability search](docs/screenshots/02-organ-availability.png) **Organ availability search**, filterable by type, city and status |
| ![Hospital directory](docs/screenshots/03-hospital-directory.png) **Hospital directory** with contact details and live availability per hospital | ![Public analytics](docs/screenshots/04-public-analytics.png) **Public analytics**: aggregate availability and hospital-network figures |
| ![Public investigate](docs/screenshots/05-public-investigate.png) **Public Investigate**: ask a question, get an evidence-backed answer | ![Pledge to donate](docs/screenshots/06-pledge-flow.png) **Pledge to donate**: a quick, no-account intent-to-donate flow |
| ![Pledge certificate](docs/screenshots/07-pledge-certificate.png) **Downloadable pledge certificate**, generated on demand from the pledge record | |

### Donor portal

| | |
|---|---|
| ![Donor dashboard](docs/screenshots/08-donor-dashboard.png) **Donor dashboard**: status, organs, recent activity | ![Registered organs](docs/screenshots/09-donor-registered-organs.png) **Registered organs** and their status |
| ![Withdrawal request](docs/screenshots/10-donor-withdrawal-request.png) **Withdrawal request**, with history | |

### Administration

| | |
|---|---|
| ![Admin dashboard](docs/screenshots/11-admin-dashboard.png) **Admin dashboard** with live registry figures | ![Management analytics](docs/screenshots/12-admin-analytics.png) **Management analytics**: deterministic KPIs, trends, drill-downs |
| ![Donor management](docs/screenshots/13-admin-donor-management.png) **Donor management**: search, filter, status | ![Organ management](docs/screenshots/14-admin-organ-management.png) **Organ management** across all organ types |
| ![Hospital management](docs/screenshots/15-admin-hospital-management.png) **Hospital information** management | ![Withdrawal review](docs/screenshots/16-admin-withdrawal-review.png) **Withdrawal review** queue |
| ![Organ requests](docs/screenshots/17-admin-organ-requests.png) **Hospital organ requests**: pending, approve or decline | ![Organ request timeline](docs/screenshots/18-admin-organ-request-timeline.png) **Request detail and timeline**, from the shared workflow-event log |
| ![Operations Intelligence](docs/screenshots/19-admin-operations-intelligence.png) **Operations Intelligence**: the admin AI investigation agent | ![Command palette](docs/screenshots/20-command-palette.png) **Command palette** (Ctrl/Cmd+K) for fast navigation |

## Features

### Public (no account needed)
- **Organ availability search**: filter by organ type, city and status. Donor identity is
  never exposed; only hospital and organ-status information is shown.
- **Hospital directory**: participating hospitals with contact details and live available-organ
  counts per type.
- **Public analytics**: aggregate availability, hospital-network, and organ-registration trend
  figures, narrowed to exclude any donor or individual-record detail.
- **Public investigation**: a restricted AI agent that answers questions about public analytics
  only, with cited evidence.
- **Donation pledge and certificate**: a lightweight, no-account "intent to donate" record with
  a reference ID and a downloadable PDF certificate.

### Donor
- Registration and sign-in (personal, medical, hospital/doctor, next-of-kin details).
- Profile management: personal, medical, next-of-kin details and password changes.
- Organ registration and status tracking (pending verification, available, unavailable).
- Withdrawal requests, with a reason, a confirmation step, and status tracking.

### Administration
- Donor, organ and hospital management: search, filter, edit, status changes, deletion
  (restricted where other records depend on it).
- Withdrawal review queue: approve or decline with a note; full history per request.
- **Hospital organ requests**: enter a hospital-side request against a specific available
  organ, review it, and approve, decline or cancel it.
- Organ and withdrawal **timelines**, built from a single shared workflow-event log.
- **Management analytics**: deterministic KPIs, period-over-period trends, and drill-downs to
  the underlying records.
- **Bottleneck and threshold analysis**: plain rule-based alerts (stale pending requests, zero
  availability, hospital concentration) over the analytics the system already computed - not
  AI-generated, clearly labeled as management alerts.
- **AI-assisted operational investigation**: a read-only agent that reasons over the same
  deterministic analytics to answer an administrator's question with cited evidence.

### Platform
- Role-based access control (`DONOR`, `ADMIN`, `SUPER_ADMIN`).
- Strict request validation, rate limiting, and standard security headers throughout.
- Responsive UI with light/dark mode.
- A global command palette (Ctrl/Cmd+K) for fast navigation to real product destinations.

### Supported organ types
`KIDNEY`, `LIVER`, `HEART`, `LUNG`, `PANCREAS`, `CORNEA`, and `OTHER` (with a free-text name).

---

## Management information system positioning

OrganFlow is built around a clear separation between four layers, each one feeding the next:

**Database facts** (Prisma/PostgreSQL) &rarr; **KPI calculations** (`analytics.service.ts`,
deterministic `groupBy`/`aggregate` queries, never per-row loops) &rarr; **business rules and
thresholds** (plain numeric checks: a request pending more than N days, a hospital at zero
availability) &rarr; **AI interpretation** (an agent that reads the KPIs and thresholds already
computed, and explains what they mean in plain language, with every claim traceable back to a
specific tool result).

This separation exists so that every number the user sees is explainable and reproducible
independent of the AI layer: the database and the analytics service remain the only source of
numerical truth, admin or public. The AI investigation agent:

- Is **strictly read-only**. It calls a fixed set of analytics/history functions and nothing
  else - no raw SQL, no write access, no ability to approve, decline, or modify any record.
- Performs **no medical, transplant, allocation, or recipient-matching decisions**. There is no
  Recipient model and no matching logic anywhere in the system; this is explicitly out of scope.
- Separates **facts** (must trace to a tool result), **interpretation** (the model's reasoning,
  never presented as fact), and **recommendation** (an action for a human administrator to take)
  as distinct fields on every finding, enforced by schema validation on the model's structured
  output.
- Sets `insufficientEvidence: true` rather than guessing when the data does not support a
  confident answer.
- Runs as **two independent toolsets**: a small admin toolset with access to pending requests,
  workflow history, and operational metrics, and a separate, smaller public toolset built only
  from public aggregate analytics. The public investigation endpoint is wired to the public
  toolset only; there is no code path from it to donor, withdrawal, or workflow detail.

In short: the registry is the operational database, the analytics layer is the decision-support
system over it, the threshold rules are the management-alerting layer, and the AI agent is a
bounded interpretation layer on top, not a second source of truth.

---

## Hospital organ request workflow

Turns organ availability into an operational pipeline rather than a static listing:

```
Availability  →  Hospital request  →  Admin decision  →  Organ allocation  →  Workflow event
```

- There is no hospital login in this system, so a request is entered by an administrator on a
  hospital's behalf (the same pattern used for organ and hospital records generally).
- A request targets one specific, currently available organ, never an organ type in the
  abstract and never a recipient or patient (there is no recipient model). At most one pending
  request per organ is enforced transactionally.
- `PENDING → APPROVED / DECLINED / CANCELLED`. Approval is the only transition that changes
  organ availability: it atomically marks the organ unavailable and the request approved in one
  transaction. Decline requires a reason. Re-reviewing an already-decided request, or approving
  one whose organ is no longer available, is rejected rather than silently producing an
  inconsistent state.
- Every transition is recorded in a shared `WorkflowEvent` log, which also powers the per-request
  **history/timeline** view and feeds the analytics layer's processing-time and staleness KPIs.

## Donation pledge

A deliberately minimal, public, no-account "intent to donate" record, separate from a full donor
registration:

- Captures only full name, email, city, and an organ preference, plus a consent timestamp. No
  medical history, no next-of-kin, no government ID.
- Submitting a pledge returns a reference ID and a confirmation page, from which a one-page PDF
  certificate can be downloaded on demand (generated server-side, not stored).
- A pledge is never automatically upgraded into a donor account; the two remain distinct
  concepts with distinct data requirements.

---

## Architecture

![OrganFlow Architecture](docs/architecture.png)

The React client calls a versioned REST API over an httpOnly JWT cookie. Express routes validate
every request with Zod, authenticate and authorize it, and hand off to thin controllers backed by
services, which use Prisma to read and write PostgreSQL. Analytics, workflow, and pledge/
certificate logic live in that same service layer. The AI investigation layer sits beside it as a
separate, read-only consumer of a fixed set of analytics tool functions - it has no direct or
unrestricted database access.

### Project and user flow

![OrganFlow Project Flow](docs/project-flow.png)

The public can explore availability, hospitals, and analytics, ask the investigation agent a
question, and record a pledge, all without an account. Donors register, manage their profile,
register organs, and track status and withdrawal requests. Administrators manage the underlying
records, process hospital organ requests, review withdrawals, and use management analytics and
AI-assisted investigation for decision support. All three flows share the same versioned API and
PostgreSQL database.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, React Router, TanStack Query, React Hook Form, Zod, Lucide |
| Backend | Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, Zod |
| Analytics / AI | LangChain, LangGraph, Gemini, Groq, OpenRouter |
| Testing | Vitest, Testing Library, Supertest, Playwright, ESLint |
| Deployment | Cloudflare Workers, Render, Supabase |

## Database

PostgreSQL via Prisma (`prisma/schema.prisma`). Major models:

| Model | Purpose |
|-------|---------|
| `User` | Credentials and role (`DONOR` / `ADMIN` / `SUPER_ADMIN`) |
| `Donor` | Donor profile, Donor ID, medical info, status (active/pending/withdrawn), blood type |
| `Admin` | Administrator profile (includes a demo-account flag for the public Demo Admin) |
| `NextOfKin` | Donor's next of kin |
| `Hospital` | Name, city, state, address, phone, email |
| `Organ` | Organ record: type, status, procurement date, notes, donor and hospital links |
| `WithdrawalRequest` | Donor's request to withdraw, plus review outcome and history |
| `OrganRequest` | Hospital request against one specific available organ, with review outcome |
| `WorkflowEvent` | Shared creation/status-change log behind every request/withdrawal timeline and the analytics layer's processing-time KPIs |
| `Pledge` | Public, no-account intent-to-donate record (name, email, city, organ preference, consent) |
| `RecoveryLog` | Records of demo-data snapshot/restore operations (System Recovery) |

Enums include `Role` (with `SUPER_ADMIN`), `DonorStatus`, `BloodType`, `OrganType`,
`OrganStatus`, `WithdrawalStatus`, `OrganRequestStatus`, `WorkflowEntityType`/`WorkflowEventType`,
and `RecoveryStatus`. Every table has `createdAt`/`updatedAt`; search paths are indexed.

**Key status rules**
- Donor-submitted organs start pending; admins verify them to available or mark them
  unavailable. Public search only ever returns available or unavailable organs, never pending.
- Approving a withdrawal sets the donor to withdrawn and their open organs to unavailable, in
  one transaction, with the transition recorded as a workflow event.
- Approving an organ request sets the organ to unavailable and the request to approved, in one
  transaction; at most one pending request per organ is allowed at a time.

## API

Base path: `/api/v1`. Success: `{ "data": ..., "meta"?: { page, pageSize, total, totalPages } }`.
Error: `{ "error": { "code", "message", "details"?: { "fields": [...] } } }`.

| Area | Access | Representative endpoints |
|------|--------|---------------------------|
| Auth | public / self | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/password` |
| Donors | donor / admin | `GET|PATCH /donors/me`, `GET /donors/me/dashboard`, `GET /donors` (admin list/search) |
| Organs | public / admin | `GET /organs/availability` (public search), `POST|PATCH|DELETE /organs` (admin) |
| Hospitals | public / admin | `GET /hospitals`, `GET /hospitals/options`, admin create/update/delete |
| Withdrawals | donor / admin | `POST /withdrawals`, `GET /withdrawals` (admin review queue), `GET /withdrawals/:id/history` |
| Organ requests | admin | `POST|GET /organ-requests`, `PATCH /organ-requests/:id` (review), `PATCH /organ-requests/:id/cancel`, `GET /organ-requests/:id/history` |
| Pledges | public | `POST /pledges`, `GET /pledges/:referenceId/certificate` (streams a PDF) |
| Analytics (admin) | admin | `GET /analytics/overview|donors|organs|hospitals|withdrawals|organ-requests|trends` |
| Analytics (public) | public | `GET /public-analytics/overview|organs|hospitals|concentration|trends|breaches` |
| Investigation (admin) | admin | `POST /agent/investigate` |
| Investigation (public) | public | `POST /public-agent/investigate` |
| Health | public | `GET /health` |

## Authentication, security and data governance

- JWT authentication in an httpOnly cookie, with role-based authorization (`DONOR`, `ADMIN`,
  `SUPER_ADMIN`) enforced in Express middleware on every protected route.
- Passwords are hashed with bcrypt (cost 12), admin accounts included; there is no public
  admin sign-up.
- Every request body, query, and param is validated with Zod; unexpected fields are rejected.
- Separate rate limits for authentication, general public endpoints, and the AI investigation
  endpoints (the latter keyed per signed-in admin or by IP for the public agent, since LLM calls
  are comparatively expensive to abuse).
- Standard security headers (Helmet, CORS), environment-based secrets, nothing hardcoded.
- **Public/private data boundary**: public analytics and the public agent are built from
  independent, narrowed code paths (a DTO layer and a separate tool list respectively) that
  structurally cannot reach donor identity or individual workflow records - the boundary is
  enforced in code, not by hiding fields in the UI.
- **AI data governance**: the AI layer never receives raw database access or write capability;
  every tool it can call is a named, reviewed function reusing an existing analytics or workflow
  service, and every investigation result cites which tools produced its evidence.

## Getting started

### Prerequisites
- Node.js **20.19+** and npm 10+
- PostgreSQL **14+**

### 1. Install
```bash
npm install
```

### 2. Create the database
```bash
CREATE ROLE organ_app WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE organ_donation OWNER organ_app;
ALTER ROLE organ_app CREATEDB;   -- prisma migrate dev needs a shadow database
```

### 3. Configure
```bash
cp .env.example .env
# set DATABASE_URL and JWT_SECRET (>= 32 chars):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
Optional AI providers (all optional; the agent reports a clear 503 if none are configured):
`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`.

### 4. Apply migrations and create an admin
```bash
npm run db:migrate
npm run admin:create -- --email admin@your-hospital.org --name "Registry Admin"
```

### 5. (Optional) Load demo data, development only
```bash
npm run db:seed
```
Idempotent and refuses to run when `NODE_ENV=production`. Creates obviously fictional donors,
hospitals, organs, withdrawal and organ requests spanning several months, so analytics and
trends have realistic data to show. All UI counts are always live database counts.

### 6. Run
```bash
npm run dev
```
- Client: http://localhost:5173
- API: http://localhost:4000/api/v1

## Demo accounts

Anyone can explore the deployed admin portal using a public demo account:

- **Email**: `demo@organflow.app`
- **Password**: `DemoAdmin123!`

This account has normal administrator permissions over demo data only (including destructive
actions). A separate, private Super Admin account, not publicly documented, can restore the
system to a known-good demo snapshot at any time, so demo-data changes are never permanent.

For local development, `npm run db:seed` creates its own local-only admin
(`demo.admin@example.com` / `DemoPass123`) and donor accounts (`dnmum001@example.com`, etc.,
same password), separate from the public Demo Admin.

## Testing

```bash
npm test
```
- **Backend**: authentication, authorization, validation, organ/hospital/withdrawal/organ-request
  workflows, analytics calculations, and agent tool behavior, run against a mocked Prisma client.
- **Frontend**: API client handling, forms, accessibility, and UI states (loading, empty, error).
- **End-to-end**: Playwright, used for workflow and layout verification across pages.

## Deployment

The client builds to static assets served via **Cloudflare Workers**; the API runs on
**Render**; the database is hosted on **Supabase** (PostgreSQL). See `.env.example` for the
environment variables each environment needs.

## License

GPL-3.0. See [LICENSE](LICENSE).

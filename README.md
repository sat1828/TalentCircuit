<div align="center">

<img src="https://raw.githubusercontent.com/sat1828/TalentCircuit/main/hero-banner.svg" alt="TalentCircuit" width="100%"/>

</div>

<div align="center">

<img src="https://img.shields.io/badge/TypeScript-93.6%25-3178c6?style=flat-square&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express"/>
<img src="https://img.shields.io/badge/PostgreSQL-16_+_pgvector-4169e1?style=flat-square&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Claude-Sonnet_4-d17e4e?style=flat-square"/>
<img src="https://img.shields.io/badge/Redis-7-dc382d?style=flat-square&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square"/>

</div>

---

> **An internal talent marketplace that connects employees with internal opportunities — before they start looking externally.** Powered by pgvector semantic search, Claude-generated skill gap analysis, and a three-stage privacy model that employees actually trust.

---

## What This Is

Most companies have the talent they need. They just don't know where it's sitting.

**TalentCircuit** is a full-stack internal mobility platform built to fix that. Employees list their skills. Managers post internal roles. The engine — a weighted cosine similarity search over 1536-dimensional OpenAI embeddings stored in PostgreSQL with pgvector — surfaces who fits what, ranked by actual skill proximity, not keyword overlap. Claude Sonnet 4 then steps in to generate structured gap analyses and personalized career path timelines. Real-time notifications flow over Socket.io with Redis Pub/Sub so nothing lands in someone's inbox a week late.

The whole thing runs in Docker, ships with a full DB migration + seed pipeline, and is structured as an npm workspace monorepo. TypeScript end to end, strict mode on.

---

## Screenshots & Architecture

### System Architecture

<div align="center">
<img src="/architecture.svg" alt="System Architecture" width="100%"/>
</div>

### pgvector Semantic Matching Pipeline

<div align="center">
<img src="/vector-matching.svg" alt="Vector Matching" width="100%"/>
</div>

### Three-Stage Privacy System

<div align="center">
<img src="/privacy-flow.svg" alt="Privacy Flow" width="100%"/>
</div>

### Database Schema

<div align="center">
<img src="/db-schema.svg" alt="Database Schema" width="100%"/>
</div>

### Technology Stack

<div align="center">
<img src="/tech-stack.svg" alt="Tech Stack" width="100%"/>
</div>

---

## Monorepo Layout

```
talentcircuit/
├── apps/
│   ├── api/                    # Express + TypeScript — the whole backend
│   │   ├── src/
│   │   │   ├── routes/         # auth, jobs, profile, ai, notifications, admin
│   │   │   ├── middleware/     # JWT auth, RBAC guards, error handler
│   │   │   ├── workers/        # BullMQ digest + embedding workers
│   │   │   ├── socket/         # Socket.io setup + Redis Pub/Sub bridge
│   │   │   ├── db/             # pg pool, migration runner
│   │   │   └── index.ts        # Server entrypoint
│   │   └── package.json
│   │
│   └── web/                    # React + Vite — the whole frontend
│       ├── src/
│       │   ├── pages/          # JobBoard, Profile, CareerPath, Admin, Gap Analysis
│       │   ├── components/     # Shared UI: SkillBadge, MatchScore, NotificationBell
│       │   ├── hooks/          # useAuth, useSocket, useJobMatch
│       │   └── App.tsx
│       └── package.json
│
├── packages/
│   ├── ai/                     # Claude + OpenAI integration layer
│   │   ├── src/
│   │   │   ├── claude.ts       # Gap analysis + career path prompts
│   │   │   ├── embeddings.ts   # text-embedding-3-small wrapper
│   │   │   └── matching.ts     # Local cosine fallback (no API needed)
│   │   └── package.json
│   │
│   └── shared-types/           # TypeScript interfaces for API ↔ Web
│       ├── src/
│       │   ├── user.ts         # User, Role, Profile types
│       │   ├── job.ts          # JobPosting, Application, Interest
│       │   ├── skill.ts        # Skill, EmployeeSkill, ProficiencyLevel
│       │   └── ai.ts           # GapAnalysis, CareerPath response shapes
│       └── package.json
│
├── infra/
│   ├── postgres/
│   │   └── init.sql            # Full schema — 14 tables, 12 ENUMs, ivfflat indexes
│   ├── Dockerfile.api          # Multi-stage Node build
│   ├── Dockerfile.web          # Nginx + Vite build
│   ├── docker-compose.yml      # Dev environment
│   └── docker-compose.prod.yml # Production with Nginx
│
├── .env.example                # Every variable documented
├── package.json                # Workspace root + concurrently scripts
└── tsconfig.base.json          # ES2022, strict, noUncheckedIndexedAccess
```

---

## Feature Breakdown

### AI Skill Gap Analysis — `packages/ai` + `/api/ai/gap-analysis/:postingId`

Claude Sonnet 4 receives the employee's full skill profile alongside the job's required skills (with importance weights) and returns a structured JSON object: what the candidate already has, what's missing, what can be built in 30/60/90 days, and a prioritized learning plan. Not a generic blurb — a comparison built from actual data rows.

Fallback path exists: if no `ANTHROPIC_API_KEY` is set, the `packages/ai` local matcher handles cosine similarity directly without API calls, so the core job matching still works offline.

### pgvector Semantic Matching

Every skill in the system has a `vector(1536)` column populated by `text-embedding-3-small`. When an employee's profile is scored against a job posting, the engine builds a weighted sum vector — proficiency level multiplied by a validation multiplier (1.3× if a manager has validated the skill, 1.0× otherwise) — then runs an ivfflat cosine similarity query. SQL, not application-layer math.

The result lands on the job board as a percentage match score visible only to the employee themselves.

### Three-Stage Privacy — by design, not policy

This was built with the assumption that employees won't use internal mobility tools if they don't trust them.

| Stage | Who sees what |
|---|---|
| **Anonymous Interest** | Employee clicks interested. Manager sees "3 people expressed interest." No names. |
| **Visible Application** | Employee chooses to apply. Hiring manager sees the name. Current manager does not. |
| **Manager Notified** | After the interview stage, the current manager gets a Socket.io notification. No surprises at offer time. |

All three stages are tracked in the `applications` table with a `stage` ENUM. The privacy logic is enforced at the API layer per role — employees can't see who else applied, managers can't deanonymize interested parties.

### Hidden Talent Detection — `GET /api/jobs/:id/hidden-talent`

Managers and HR admins can run a query that surfaces employees whose skill vector proximity to a role exceeds a threshold — regardless of whether those employees have applied. The match scores show up in a ranked list. This is the "find talent before it walks out the door" feature. It uses the same pgvector cosine query as the employee-facing match score, just inverted: job → employee space instead of employee → job list.

### D3.js Career Path Visualization

The `/api/ai/career-path` endpoint returns a structured JSON object with three time horizons (1 year, 2 years, 3 years), each containing a target role, skills needed, and a confidence score. The web frontend renders this as a D3.js solar system — the employee's current role at the center, career options as orbiting bodies at different radii by horizon. Clicking a node loads the gap analysis for that target role.

### Weekly Digest — BullMQ + Claude

HR admins can trigger a digest run via `POST /api/admin/digest/trigger`. This enqueues a BullMQ job (backed by Redis) that iterates over active employees, builds a personalized list of matching open roles, passes that list to Claude for a short personalized blurb, and sends the email via Nodemailer/SendGrid. Each send is logged to `digest_logs` to prevent duplicate sends. The queue runs in a separate worker process, so digest sends don't block the API.

### Real-time Notifications — Socket.io + Redis Pub/Sub

When an application moves to the interview stage, a notification is published to a Redis channel. All Socket.io server processes (there could be multiple behind a load balancer) subscribe to that channel and forward the event to the relevant connected client. The `notifications` table stores all events with `is_read` state so clients that connect later can fetch their unread queue via `GET /api/notifications`.

### Role-Based Access Control — 4 tiers

| Role | What they can do |
|---|---|
| `employee` | View jobs, apply, express interest, manage own skills, get gap analysis |
| `manager` | Everything above + create postings, validate team skills, view hidden talent |
| `hr_admin` | Everything above + admin dashboard metrics, trigger digests, seed embeddings |
| `super_admin` | Full access including company-level configuration |

Enforcement is a middleware guard on every route. JWT access tokens expire in 15 minutes. Refresh tokens (7 days) are rotated on every use and stored hashed in the database — replayed tokens are rejected.

---

## API Reference

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register with company email domain |
| `POST` | `/api/auth/login` | — | Returns `accessToken` + `refreshToken` |
| `POST` | `/api/auth/refresh` | — | Rotates refresh token, returns new access token |
| `POST` | `/api/auth/logout` | Required | Invalidates refresh token |

### Profile & Skills

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/me/profile` | Required | Full profile including skills |
| `PUT` | `/api/me/profile` | Required | Update bio, aspirations, mobility status |
| `GET` | `/api/me/profile/skills` | Required | List own skills |
| `POST` | `/api/me/profile/skills` | Required | Add a skill with proficiency |
| `PUT` | `/api/me/profile/skills/:id` | Required | Update proficiency or years |
| `DELETE` | `/api/me/profile/skills/:id` | Required | Remove a skill |
| `POST` | `/api/me/profile/validate-skill` | Manager+ | Validate a direct report's skill (adds 1.3× weight) |

### Jobs

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jobs` | Required | All active postings — employees get their match score injected |
| `POST` | `/api/jobs` | Manager+ | Create a new posting with required skills |
| `GET` | `/api/jobs/:id` | Required | Single posting detail |
| `PUT` | `/api/jobs/:id` | Manager+ | Update posting |
| `POST` | `/api/jobs/:id/interest` | Required | Anonymous interest (Stage 1) |
| `POST` | `/api/jobs/:id/apply` | Required | Full application (Stage 2) |
| `PATCH` | `/api/jobs/:id/applications/:appId` | Manager+ | Move application through stages |
| `GET` | `/api/jobs/:id/hidden-talent` | Manager+ | pgvector-ranked employee matches |

### AI

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/gap-analysis/:postingId` | Required | Claude-generated skill gap + learning plan |
| `GET` | `/api/ai/career-path` | Required | 1/2/3-year career path with D3 data |

### Notifications

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Required | Unread notifications |
| `PATCH` | `/api/notifications/:id/read` | Required | Mark as read |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/metrics` | HR Admin+ | Dashboard stats |
| `POST` | `/api/admin/digest/trigger` | HR Admin+ | Enqueue weekly digest |
| `POST` | `/api/admin/embeddings/seed` | HR Admin+ | Generate missing skill embeddings |

---

## Database

PostgreSQL 16 with the pgvector extension. Schema lives in `infra/postgres/init.sql` — run once on a fresh container, creates everything.

**14 tables:**
`companies`, `users`, `employee_profiles`, `skills`, `employee_skills`, `job_postings`, `job_required_skills`, `applications`, `interests`, `notifications`, `digest_logs`, `career_milestones`, `skill_validations`, `refresh_tokens`

**12 ENUMs:**
`user_role`, `proficiency_level`, `skill_category`, `application_stage`, `posting_status`, `location_type`, `aspiration_timeline`, `mobility_status`, `privacy_level`, `notification_type`, `job_importance`, `career_horizon`

**The key index:**
```sql
CREATE INDEX skills_embedding_idx ON skills
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

1536 dimensions because that's what `text-embedding-3-small` outputs. `ivfflat` with 100 lists gives approximate nearest neighbor search that stays fast as the skill catalog grows.

---

## Environment Variables

All variables are in `.env.example`. Required ones will throw an error at startup if missing.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | — | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | — | Min 32 chars. Signs access tokens. |
| `JWT_REFRESH_SECRET` | Yes | — | Min 32 chars. Signs refresh tokens. |
| `JWT_EXPIRY` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token lifetime |
| `ANTHROPIC_API_KEY` | No | — | Claude gap analysis. Falls back to local matching. |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | |
| `OPENAI_API_KEY` | No | — | Skill embeddings. Required to seed vector index. |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | |
| `SMTP_HOST` | No | — | SendGrid or any SMTP |
| `SMTP_PORT` | No | `587` | |
| `SMTP_USER` | No | — | `apikey` for SendGrid |
| `SMTP_PASS` | No | — | SendGrid key or SMTP password |
| `DIGEST_FROM` | No | — | From address for digest emails |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `PORT` | No | `3001` | API server port |
| `COMPANY_NAME` | No | — | Seed data: company name |
| `COMPANY_DOMAIN` | No | — | Seed data: email domain for registration |

---

## Getting Started

**Prerequisites:** Node.js 20+, Docker Desktop

```bash
# 1. Spin up Postgres + Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Set environment variables
cp .env.example .env
# Fill in JWT_SECRET, JWT_REFRESH_SECRET at minimum

# 3. Install all workspace dependencies
npm install

# 4. Create tables and extensions
npm run migrate -w apps/api

# 5. Load demo data (companies, users, skills, jobs)
npm run seed -w apps/api

# 6. Start API + Web in parallel
npm run dev
```

API runs at `http://localhost:3001`. Web runs at `http://localhost:5173`.

If you have an `OPENAI_API_KEY`, seed the skill embeddings after step 5:

```bash
# Generates and stores embeddings for all skills in the catalog
curl -X POST http://localhost:3001/api/admin/embeddings/seed \
  -H "Authorization: Bearer <hr_admin_token>"
```

Without embeddings seeded, the match score falls back to the local cosine implementation in `packages/ai/src/matching.ts`.

---

## Development Scripts

```bash
npm run dev              # Start API + Web concurrently
npm run dev:api          # API only (port 3001)
npm run dev:web          # Web only (port 5173)
npm run build            # Build all packages in dependency order
npm run typecheck        # tsc --noEmit on both apps
npm run lint             # ESLint on both apps
npm run test             # Vitest on apps/api (requires local Postgres + Redis)
npm run migrate          # Run DB migration
npm run seed             # Seed demo data
npm run docker:up        # docker compose up -d
npm run docker:down      # docker compose down
```

---

## Production Deployment

```bash
# Typecheck everything first
npm run typecheck

# Build all packages (shared-types → ai → api → web)
npm run build

# Launch production stack (Nginx + API + Postgres + Redis)
docker compose -f infra/docker-compose.prod.yml up -d
```

The production Dockerfile uses multi-stage builds: a build stage installs dev dependencies and compiles TypeScript, a runtime stage copies only the compiled output and production deps. The web app is served as static files from Nginx, which also proxies `/api` and socket connections to the API container.

---

## Testing

```bash
# Requires a live Postgres and Redis on localhost (use docker compose first)
npm run test -w apps/api

# Coverage report
npm run test -w apps/api -- --coverage
```

Tests cover route handlers, JWT middleware, RBAC guards, and the local matching algorithm.

---

## License

MIT — use it, fork it, break it, fix it.

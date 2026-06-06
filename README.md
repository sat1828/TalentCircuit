# TalentCircuit

Internal talent marketplace that connects employees with internal opportunities using AI-powered skill matching.

## Architecture

```
talentcircuit/
├── apps/
│   ├── api/          Express + TypeScript backend (pgvector, BullMQ, Socket.io)
│   └── web/          React + Vite frontend (Tailwind, D3.js, Recharts)
├── packages/
│   ├── ai/           Claude integration + local skill matching
│   └── shared-types/ TypeScript interfaces shared across the stack
└── infra/
    ├── postgres/     DB schema (14 tables, pgvector, 12 ENUMs)
    ├── Dockerfile.*   Multi-stage Docker builds
    └── docker-compose*.yml  Dev & production compose files
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)
- Anthropic API key (for Claude-powered gap analysis)
- OpenAI API key (for skill embeddings)

## Quick Start

```bash
# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Install dependencies
npm install

# 4. Run database migration (creates tables)
npm run migrate -w apps/api

# 5. Seed demo data
npm run seed -w apps/api

# 6. Start development servers
npm run dev
```

The API starts at `http://localhost:3001`, the Web app at `http://localhost:5173`.

## Key Features

- **AI Skill Gap Analysis** — Claude-powered analysis comparing employee profiles to job requirements, with structured learning plans
- **pgvector Semantic Matching** — Weighted profile vectors (proficiency × validation multiplier) using cosine similarity
- **Three-Stage Privacy** — Anonymous interest → visible application → manager-notified after interview stage
- **Hidden Talent Detection** — Managers discover employees whose skills match open roles before they apply
- **Career Path Visualization** — D3.js solar system view with 1/2/3-year time horizons
- **Weekly Digest** — Personalized email digests with Claude-generated blurbs, scheduled via BullMQ
- **Real-time Notifications** — Socket.io with Redis Pub/Sub for cross-process notification delivery
- **Role-Based Access** — Employee, Manager, HR Admin, and Super Admin roles with scoped permissions

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret |
| `OPENAI_API_KEY` | No | — | For skill embeddings (text-embedding-3-small) |
| `ANTHROPIC_API_KEY` | No | — | For Claude gap analysis |
| `SMTP_HOST` | No | — | SMTP server for digest emails |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated) |

Full list in `.env.example`.

## API Endpoints

| Route | Auth | Description |
|---|---|---|
| `POST /api/auth/register` | — | Register with company domain |
| `POST /api/auth/login` | — | Login, returns JWT |
| `POST /api/auth/refresh` | — | Rotate refresh token |
| `GET /api/me/profile` | Required | Current user profile |
| `PUT /api/me/profile` | Required | Update profile/aspirations |
| `GET/POST /api/me/profile/skills` | Required | List/add skills |
| `PUT/DELETE /api/me/profile/skills/:id` | Required | Update/remove skill |
| `POST /api/me/profile/validate-skill` | Manager+ | Validate direct report's skill |
| `GET /api/jobs` | Required | List jobs (with match scores for employees) |
| `POST /api/jobs` | Manager+ | Create posting |
| `POST /api/jobs/:id/interest` | Required | Express anonymous interest |
| `POST /api/jobs/:id/apply` | Required | Apply to job |
| `GET /api/jobs/:id/hidden-talent` | Manager+ | Find matching employees |
| `GET /api/ai/gap-analysis/:postingId` | Required | Claude skill gap analysis |
| `GET /api/ai/career-path` | Required | Career path with time horizons |
| `GET /api/notifications` | Required | Unread notifications |
| `GET /api/admin/metrics` | HR Admin+ | Dashboard statistics |
| `POST /api/admin/digest/trigger` | HR Admin+ | Enqueue weekly digest |
| `POST /api/admin/embeddings/seed` | HR Admin+ | Generate missing skill embeddings |

## Testing

```bash
# Run tests (requires Postgres + Redis on localhost)
npm test -w apps/api

# Test coverage
npm test -w apps/api -- --coverage
```

## Production Build

```bash
# Typecheck
npm run typecheck

# Build all packages
npm run build

# Full production deployment
docker compose -f infra/docker-compose.prod.yml up -d
```

## Database

PostgreSQL 16 with pgvector extension. Schema creates 14 tables, 12 ENUMs, and ivfflat indexes on 1536-dimensional embedding columns. See `infra/postgres/init.sql`.

## License

MIT

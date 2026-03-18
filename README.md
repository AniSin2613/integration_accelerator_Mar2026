# Cogniviti Bridge

Enterprise integration accelerator monorepo for designing, reviewing, releasing, and monitoring business-system integrations.

## What is implemented

- TypeScript-first pnpm monorepo (`apps`, `packages`, `services`)
- Next.js 14 web app with App Router and structured workflow designer UI
- NestJS 10 API with modular domain services and auth stub guard
- Prisma + PostgreSQL data model across 6 domains:
  - Tenancy & workspace governance
  - Connection management
  - Template catalog and versioned workflow structures
  - Human-in-the-loop mappings
  - Release and promotion lifecycle
  - Runtime runs and health snapshots
- Apache Camel route generation (YAML DSL) and isolated Camel runner service
- Docker compose stack for local development
- REST-to-REST vertical slice (template -> mapping -> release artifact -> YAML preview -> run/monitoring views)

## Tech stack

- Node.js 20 LTS
- pnpm workspaces
- Next.js 14 + React 18 + Tailwind CSS 3
- NestJS 10
- Prisma 5 + PostgreSQL 16
- Apache Camel (JBang) in a dedicated container

## Repository layout

```text
.
├── apps
│   ├── api                  # NestJS control plane + Prisma schema/seed
│   └── web                  # Next.js UI shell, pages, workflow/mapping components
├── packages
│   ├── domain               # Shared enums and domain types
│   └── camel                # Camel YAML builder utilities
├── services
│   └── camel-runner         # Java runtime container for executing Camel routes
├── infra
│   └── docker               # Dockerfiles + docker-compose + postgres init
└── README.md
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Environment files

Create env files from examples:

- `apps/api/.env` from `apps/api/.env.example`
- `apps/web/.env.local` from `apps/web/.env.example`

Default dev auth token used by both UI and API:

- `dev_stub_secret_not_for_production`

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Start infrastructure and services (Docker):

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

3. Run Prisma generate/migrations/seed (from host shell):

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
```

4. Open apps:

- Web: http://localhost:3000
- API: http://localhost:4000
- Camel runner: http://localhost:8080/health

## Useful scripts

From repository root:

```bash
pnpm dev               # run workspace dev scripts in parallel
pnpm build             # build apps and packages
pnpm lint              # run recursive lint scripts
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:studio
```

## API highlights

- `GET /health`
- `GET /templates`
- `GET /integrations`
- `GET /integrations/:id`
- `POST /integrations/:id/generate-yaml`
- `GET /integrations/:id/mappings`
- `POST /integrations/:id/mappings/rules/:ruleId/approve`
- `POST /integrations/:id/mappings/rules/:ruleId/reject`
- `GET /integrations/:id/releases`
- `POST /integrations/:id/releases`
- `POST /integrations/:id/releases/:artifactId/submit`
- `POST /integrations/:id/releases/:artifactId/approve`
- `POST /integrations/:id/releases/:artifactId/promote-next`
- `GET /runs`
- `GET /runs/health-latest`
- `GET /connections`
- `POST /connections/:connectionId/test`

All protected endpoints currently use the auth stub guard with:

```http
Authorization: Bearer dev_stub_secret_not_for_production
```

## Zero-trust AI mapping evidence

AI-suggested mapping rules are never auto-approved and must carry explicit provenance categories.

Allowed evidence source categories:

- INTERNAL_APPROVED
- SOURCE_PLATFORM_OFFICIAL_DOCS
- TARGET_PLATFORM_OFFICIAL_DOCS
- OFFICIAL_OPENAPI_SPEC
- OFFICIAL_FIELD_DICTIONARY
- CURATED_SCHEMA_PACK

These categories map to:

- approved internal sources
- official source platform docs
- official target platform docs
- official OpenAPI specs
- official field dictionaries
- curated schema packs stored by the platform

## Why Camel JBang in a runner container (and not Camel K)

- Faster local iteration for V1 scaffolding
- Simple and explicit route artifact flow from API to runtime
- No Kubernetes operator dependency during early development
- Keeps deployment/runtime concerns isolated from the TypeScript control plane

## Current status by phase

- Phase 0: complete (analysis)
- Phase 1: complete (monorepo bootstrap)
- Phase 2: complete (docker foundation)
- Phase 3: complete (package/config setup)
- Phase 4: complete (Prisma schema + seed)
- Phase 5: complete (NestJS modules)
- Phase 6: complete (frontend shell + domain pages)
- Phase 7: complete (REST-to-REST vertical slice wiring)
- Phase 8: complete (documentation)

## Notes / known limitations

- Auth is a development stub only (no JWT/OIDC yet)
- Secrets are stored as references (`secretRef`), not raw credentials
- Some runtime execution paths are intentionally stubbed for V1
- Production hardening (RBAC enforcement depth, retries/circuit breakers, full observability pipeline) is out of scope for this scaffold

# duo-scrapbook

A couples-only photo scrapbook with AI-generated captions.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Azure Functions v4 (Node.js 20, TypeScript) |
| Frontend | React + Vite |
| Data | PostgreSQL (users, couples, invitations, photos, sessions) |
| Storage | Azure Blob Storage (`photos` container) |
| AI | Azure OpenAI GPT-4o vision (caption generation, Enhancement) |
| Tests | Vitest (workspaces) + @testing-library/react |

## Layout

```
src/
  shared/      Types + Zod schemas (single source of truth)
  functions/   Azure Functions backend
  web/         React + Vite frontend
.azure/        Project plan (azure-project-scaffold)
```

## Quick Start

```bash
npm install
cp .env.example .env

# Build everything
npm run build

# Run all tests with coverage
npm run test:coverage

# Frontend (with mock data, auto-authenticated preview)
npm run dev:web

# Functions (requires local Postgres + Azurite — see azure-local-debug)
npm run dev:functions
```

## Plan

See [.azure/project-plan.md](.azure/project-plan.md) for the full scaffold plan, route definitions, and infrastructure summary (input contract for `azure-prepare`).

## Next steps

- `azure-local-debug` — Docker Compose (Azurite + Postgres) + IDE debugger config
- `azure-prepare` → `azure-deploy` — generates IaC (Bicep) + `azure.yaml`

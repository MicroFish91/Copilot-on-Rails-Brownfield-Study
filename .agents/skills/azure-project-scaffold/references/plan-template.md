# Project Plan Template

> Read during Phase 1, Step P3. Plan Template + inlined Planning Quick Reference (fill without external reads).

## Plan Template

Write `.azure/project-plan.md` with this structure (replace `{placeholders}`):

````markdown
# Project Plan

**Status**: Planning
**Created**: {date}
**Mode**: {NEW | AUGMENT}

## 1. Project Overview

**Goal**: {brief — every module independently testable}.
**App Type**: {API only | SPA + API | Full-stack SSR | Static + API | Worker}
**Mode**: {NEW | AUGMENT}
**Deployment Plan**: {`.azure/plan.md` found — services derived | None}

## 2. Runtime & Framework

| Component | Technology |
|-----------|------------|
| Runtime | {TypeScript / C# .NET 10} |
| Backend | {Azure Functions v4} |
| Frontend | {React+Vite / Vue+Vite / Angular / Svelte / None} |
| Package Manager | {npm / pnpm / dotnet} |

## 3. Test Runner

| Component | Tech |
|-----------|------|
| Test Runner | {vitest / jest / xUnit} |
| Mocks | {vi.mock / jest.mock / sinon / Moq} |
| Test Command | {npm test / dotnet test} |

## 4. Services Required

> Pick from [azure-services-catalog.md](azure-services-catalog.md) → "User-Selectable Services". One row per data/messaging/AI service. Compute = Functions v4 (in 4a).

| Service | Role | Env Var | Local Default | Classification |
|---------|------|---------|---------------|----------------|
| {Blob Storage} | {Store uploads} | {STORAGE_CONNECTION_STRING} | {UseDevelopmentStorage=true} | {Essential} |
| {PostgreSQL} | {Primary data store} | {DATABASE_URL} | {postgresql://localdev:localdevpassword@localhost:5432/appdb} | {Essential} |

## 4a. Infrastructure Summary (for `azure-prepare`)

> **Intent only.** Input contract for `azure-prepare`. **Do NOT generate IaC here.**

### Compute & Hosting

| Choice | Value |
|--------|-------|
| Backend compute | Azure Functions v4 (Flex Consumption recommended) |
| Backend runtime | {TypeScript / C# .NET 10 isolated} |
| Frontend hosting (if SPA) | {Static Web Apps / None} |
| Service-to-service auth | Managed Identity (system-assigned) |

### Runtime Essentials (always provisioned)

| Service | ARM Type | Purpose |
|---------|----------|---------|
| Functions app | `Microsoft.Web/sites` | Backend compute |
| App Service Plan (Flex) | `Microsoft.Web/serverfarms` | Functions hosting |
| Storage (runtime) | `Microsoft.Storage/storageAccounts` | Functions runtime + deployment |

### Baseline Services (recommended; opt-out per service)

| Service | ARM Type | Include? |
|---------|----------|:--------:|
| App Insights | `Microsoft.Insights/components` | {Y/N} |
| Log Analytics | `Microsoft.OperationalInsights/workspaces` | {Y/N} |
| Managed Identity | (Functions sub-resource) | {Y/N} |
| Key Vault | `Microsoft.KeyVault/vaults` | {Y/N} |

_Skip rationale (if any): {e.g., Skip App Insights for POC; skip MI if no Azure data services; skip KV if no secrets}._

### User-Selected Resources (from Section 4)

| Service | ARM Type | Notes |
|---------|----------|-------|
| {Blob Storage} | `Microsoft.Storage/storageAccounts` | {Separate from runtime SA} |
| {PostgreSQL Flexible Server} | `Microsoft.DBforPostgreSQL/flexibleServers` | {Primary data store} |

### Hand-Off to `azure-prepare`

Seed deployment plan from this section — do NOT re-ask user. Essentials mandatory; Baseline opt-in/out per plan; honor "No". Ask user only for: subscription, location, non-trivial SKU/tier. Run quota/region/policy checks against combined Essentials + included Baseline + User-Selected.

## 5. Project Structure

```
{Generated tree — see references/project-structure.md}
```

## 6. Route Definitions

| # | Method | Path | Description | Request | Response | Auth | Status |
|---|--------|------|-------------|---------|----------|------|--------|
| 1 | GET | `/api/health` | Health check | — | `{ status, services }` | None | 200, 503 |

## 7. Database Constraints

| Table | Type | Column(s) | Detail |
|-------|------|-----------|--------|
| {users} | UNIQUE | {email} | {Prevent dup registration} |
| {users} | FK | {couple_id → couples.id} | {ON DELETE SET NULL} |

### 7a. Collection → Table Mapping

| Collection (handler) | Table (migration) | Rule |
|----------------------|-------------------|------|
| {`'user'`} | {`users`} | {camelToSnake + pluralize} |

## 8. Service Dependency Classification

| Service | Type | Failure |
|---------|------|---------|
| {PostgreSQL} | Essential | 503 |
| {Azure OpenAI} | Enhancement | Falls back to default |

## 9. Files to Generate

| File | Action | Description |
|------|--------|-------------|
| {path} | CREATE | {desc} |

## 10. Next Steps

1. Phase 2 (Scaffold) executes plan after approval
2. `azure-local-debug` — Docker emulators + IDE debugger
3. `azure-prepare` → `azure-deploy` when ready
````

## Planning Quick Reference (Inlined)

> Fill template without external reads. Full catalog with ARM types in [azure-services-catalog.md](azure-services-catalog.md).

### Service → Env Var

| Service | Env Var | Local Default |
|---------|---------|---------------|
| Blob/Queue/Table Storage | `STORAGE_CONNECTION_STRING` | `UseDevelopmentStorage=true` |
| PostgreSQL | `DATABASE_URL` | `postgresql://localdev:localdevpassword@localhost:5432/{db}` |
| CosmosDB | `COSMOSDB_CONNECTION_STRING` | `AccountEndpoint=https://localhost:8081/;AccountKey=...` |
| Redis | `REDIS_URL` | `redis://localhost:6379` |
| Azure SQL | `SQL_CONNECTION_STRING` | `Server=localhost,1433;Database={db};...` |
| Service Bus | `SERVICE_BUS_CONNECTION_STRING` | _(no emulator — use Storage Queues)_ |
| Event Grid / Hubs / OpenAI / AI Search | `*_ENDPOINT` (+ `*_KEY` / `*_API_KEY`) | _(no emulator)_ |

### Essential vs Enhancement

| Type | Definition | Failure | Examples |
|------|------------|---------|----------|
| **Essential** | Request can't succeed without it | Propagate 4xx/5xx | DB, auth, primary storage |
| **Enhancement** | Request can succeed degraded | Catch, fallback, log warning | AI captions, email, analytics |

> Enhancement constructors MUST NOT throw. Defer validation or wrap in try/catch.

### Error Response Contract

```json
{ "error": { "code": "NOT_FOUND", "message": "Item not found", "details": null } }
```

| Code | HTTP | When |
|------|:----:|------|
| `VALIDATION_ERROR` | 422 | Body fails validation |
| `BAD_REQUEST` | 400 | Malformed request |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Duplicate |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_ERROR` | 500 | Unhandled exception |

### Shared Types Rule

> Don't duplicate request types in `types/api.ts` AND `schemas/validation.ts`. With Zod, `z.infer<typeof schema>` IS the canonical request type:
> - `types/entities.ts` — entity interfaces
> - `types/api.ts` — response types + ErrorCode union
> - `schemas/validation.ts` — Zod schemas + inferred request types

### Architecture Principles

1. Service boundary isolation — every Azure service behind interface
2. DI — handlers receive services, never import SDKs
3. Env-driven config — same code for mocks/emulators/Azure
4. Monorepo by default
5. Contracts first
6. One function per file

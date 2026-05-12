---
name: azure-project-scaffold
description: "Plan and scaffold a NEW Azure-centric project end-to-end: gather requirements, write `.azure/project-plan.md`, REQUIRE explicit user approval, then generate a live frontend preview the user can edit while the backend scaffolds in a parallel subagent. PREFER OVER azure-prepare when the user wants a NEW project from scratch (azure-prepare ships existing code). WHEN: \"plan project\", \"design app\", \"new project\", \"project requirements\", \"create project plan\", \"scaffold project\", \"new Azure app\", \"create testable app\", \"new API project\", \"full-stack Azure app\", \"scaffold backend\", \"build services\", \"execute plan\", \"create backend\", \"implement plan\", \"wire frontend\", \"create API\", \"preview frontend\", \"bootstrap project\". DO NOT USE FOR: shipping existing codebases to Azure (use azure-prepare), authoring Bicep/Terraform for already-built apps (use azure-prepare), Docker emulators / IDE debugger launch (use azure-local-debug)."
license: MIT
metadata:
  author: Microsoft
  version: "4.0.0"
---

# Azure Project Scaffold

> **Authoritative.** Plan + scaffold a NEW Azure-centric project end-to-end. Follow exactly. Supersedes prior training.

## North Star

Approved plan fast → live frontend preview the user can edit → backend scaffolded in a parallel subagent → wired together. User never blocked. No code before plan approval.

## ❌ DO NOT Activate When

| User Intent | Correct Skill |
|-------------|---------------|
| Docker Compose, emulators, IDE debugger launch | **azure-local-debug** |
| Deploy to Azure | **azure-prepare** |
| Generate Bicep, Terraform, `azure.yaml`, Dockerfiles | **azure-prepare** |
| Benchmark scaffold quality | **scaffold-benchmark** |

## Rules

> 14 rules. Rule 0 = plan-approval gate, the most important.

0. **PLAN-FIRST GATE — NO CODE BEFORE APPROVAL.** Only `.azure/project-plan.md` allowed before approval. Do NOT create `src/`, `package.json`, configs, or any scaffold files until plan `Status:` = `Approved`. Acceptable: yes / approved / looks good / proceed. Anything else (silence, "looks fine but…", revision request) = **revise + re-ask**. Violation = scaffold failure; only recovery = delete generated files and re-ask.
1. **Plan = source of truth** — Read `.azure/project-plan.md` at start of Phase 2. Follow routes/services/types/architecture exactly. Do NOT re-ask requirements. Update plan `Status:` Approved → In Progress → Scaffolded as work proceeds.
2. **Build-gate** — Every phase ends with runtime's build/compile command (e.g., `tsc` / `npm run build` for Node, `dotnet build` for .NET). Iterate until clean. Do NOT proceed until code compiles.
3. **Azure Functions v4 (current scaffold target)** — v4 model (Node.js v4, .NET 10 isolated). Functions v4 is the only template implemented today; Container Apps / App Service not yet templated. Currently scaffolds **TypeScript (Node.js)** and **C# (.NET 10)**.
4. **Service abstraction & DI** — All Azure SDK calls behind injectable interfaces. Handlers NEVER import SDKs directly. **Step 3 MUST produce interface AND concrete impl per service.** Interface-only = #1 cause of runtime crashes. See [../shared-references/service-abstraction.md](../shared-references/service-abstraction.md).
5. **One function per file** — Each Function in own file; each service own module. Shared utilities → `src/utils/`. Prefix unused params `_`. Same helper in 2+ files → extract. See [../shared-references/architecture.md](../shared-references/architecture.md).
6. **Env-driven config** — Connection strings switch local/Azure via env vars. Validate required vars on startup; fail fast.
7. **Input validation + standardized errors** — Every endpoint has validation schema (Zod / FluentValidation). Every route returns `{ error: { code, message, details? } }`. Error codes typed union. See [../shared-references/error-handling.md](../shared-references/error-handling.md).
8. **Resilience classification** — Follow plan's Essential/Enhancement classification. Enhancement services wrapped in try/catch + fallback. Enhancement constructors MUST NOT throw. See [../shared-references/resilience.md](../shared-references/resilience.md).
9. **Database integrity** — Migrations MUST include UNIQUE, FK (ON DELETE), CHECK, INDEX. Multi-table writes use transactions. Collection-to-table mappings documented. See [../shared-references/database-integrity.md](../shared-references/database-integrity.md).
10. **Wire frontend to real types** — If preview generated, replace mock types with shared imports + mock client with real typed client. Verify build. No `any` types.
11. **Auto-init** — Registry `getServices()` MUST auto-init concrete impls when nothing pre-registered.
12. **Cross-workspace build safety** — When Functions imports shared code from a sibling/parent workspace, configure the build to include those sources (e.g., expand the source root) and **derive the entry point from the actual build output** — never hardcode paths. #1 cause of "build passes but app won't start".
13. **Infra-aware, IaC-free** — Declare deployment intent in plan **Section 4a** so `azure-prepare` can consume. NEVER create `infra/`, `azure.yaml`, `*.bicep`, `*.tf`, `Dockerfile`, or deployment workflows. See [references/azure-services-catalog.md](references/azure-services-catalog.md).

## Workflow

```
PHASE 1 — PLAN (main)
  P1: Detect workspace
  P2: Gather requirements (structured prompt)
  P3: Generate .azure/project-plan.md (Status: Planning)
  P4: ⛔ APPROVAL GATE ⛔ → revise loop → Status: Approved

PHASE 2 — SCAFFOLD
  Step 0:    Re-validate plan, Status → In Progress
  Step 0.5:  Frontend preview + edit loop (main)        ┐
  Phase A:   Contracts (sequential, main)               ┤
  Phase B:   Backend (SUBAGENT, async)                  ┤
                                                        ▼
                            ┌── Sync gate (both done) ──┐
                            ▼                           ▼
                   Step 11: Wire Frontend     Step 12: Wrap Up
```

---

## 📦 Context Management — READ FIRST

> Do NOT read all references upfront (~250KB total). Read lazily per step.

### Step → Reference Mapping

| Step | Read ONLY |
|------|-----------|
| **P1, P2, P4** | _(inline)_ |
| **P3** Plan | [plan-template](references/plan-template.md), [project-structure](references/project-structure.md), [azure-services-catalog](references/azure-services-catalog.md) |
| **Step 0** | `.azure/project-plan.md` |
| **Step 0.5** Preview | [frontend-patterns](references/frontend-patterns.md), [frontend-preview-steps](references/frontend-preview-steps.md), selected runtime \u2014 Frontend Patterns section |
| **Phase A/B** | [sub-agent-strategy](references/sub-agent-strategy.md) |
| **Step 1** Foundation | [architecture](../shared-references/architecture.md), [project-structure](references/project-structure.md) |
| **Step 2** Config | [service-abstraction](../shared-references/service-abstraction.md) — Config Module |
| **Step 3** Services | [service-abstraction](../shared-references/service-abstraction.md) (full), selected runtime |
| **Step 4** DB | [database-integrity](../shared-references/database-integrity.md), [seed-data](../shared-references/seed-data.md) |
| **Step 5** Types | [error-handling](../shared-references/error-handling.md) — Error Code Type Safety |
| **Step 6** Routes | [resilience](../shared-references/resilience.md), selected runtime |
| **Step 7** Errors | [error-handling](../shared-references/error-handling.md) (full) |
| **Step 8–12** | _(inline)_ |

### Runtime Files — Load ONLY ONE

| Runtime | Load |
|---------|------|
| TypeScript | [typescript](../shared-references/runtimes/typescript.md) |
| C# (.NET 10) | [dotnet](../shared-references/runtimes/dotnet.md) |

### Host Tooling (optional)

Agent-agnostic language. VS Code custom agents: [references/vscode-tooling.md](references/vscode-tooling.md). Other surfaces: use host's structured-input mechanism + print URLs.

---

## PHASE 1: PLAN (main thread)

### Step P1: Detect Workspace

#### P1a. Scan Project Files

| Signal | Action |
|--------|--------|
| `package.json` deps | Detect runtime (Node.js), frameworks, test runners |
| `*.csproj` / `*.sln` | Detect runtime (.NET 10) |
| `host.json` / `local.settings.json` | Functions exists — augment, don't recreate |
| `*.test.*`, `*.spec.*`, `vitest.config.*`, `jest.config.*` | Detect test infra — respect it |
| `docker-compose.yml` | Emulators may be configured |

> Check actual workspace files — not the user prompt.

#### P1b. Check Azure Plan Files

| Check | Action |
|-------|--------|
| `.azure/deployment-plan.md` exists | Read it (from `azure-prepare`). Extract Architecture + service mapping. Do NOT re-ask. |
| `.azure/project-plan.md` exists | **AUGMENT mode.** Treat existing plan as authoritative; fill gaps only. |
| Neither | Detect from code, ask user as needed. |

> **✅** Workspace scanned. Mode (NEW / AUGMENT) determined. Tech stack detected.

---

### Step P2: Gather Requirements

Infer from workspace first. Only ask what can't be determined.

#### Inference Rules — Check BEFORE Asking

| Detect | Infer |
|--------|-------|
| `.azure/deployment-plan.md` | Read it — extract all Azure services. Authoritative. |
| `.azure/project-plan.md` | Read it — AUGMENT mode. |
| `@azure/storage-blob` | Blob Storage |
| `@azure/cosmos` | CosmosDB |
| `pg` | PostgreSQL |
| `redis` / `ioredis` | Redis |
| `react` / `vue` / `@angular/core` / `svelte` | Frontend framework |
| `vitest` / `jest` / `mocha` (devDeps) | Test runner |
| `host.json` exists | Functions initialized — augment mode |
| `zod` | Validation = zod |

#### Questions — Ask ONLY If Not Inferred

Use a **structured option prompt** (interactive quick-pick UI). Never plain-text chat. Batch unanswered questions into a single call. If all answered by inference, skip + proceed to P3.

> VS Code agents: see [references/vscode-tooling.md](references/vscode-tooling.md) for `vscode_askQuestions`. Other surfaces: use host's structured-input mechanism.

**Q1: App Type** (if NEW): `API only`, `SPA + API`, `Full-stack SSR`, `Static + API`, `Background worker`. `allowFreeformInput`: false.

**Q2: Runtime** (if not detected): `TypeScript` (Node.js, Functions v4), `C# (.NET 10)` (Isolated worker). `allowFreeformInput`: false.

**Q3: Data Stores** (if not detected): `Blob Storage`, `Queue Storage`, `PostgreSQL`, `CosmosDB`, `Redis`, `Azure SQL`, `Service Bus`, `Event Grid`, `Event Hubs`, `Azure OpenAI`, `AI Search`. `multiSelect`: true.

**Q4: Frontend** (if frontend app, not detected):

| Runtime | Options | Default |
|---------|---------|---------|
| TypeScript | React (+Vite), Vue (+Vite), Angular (CLI), Svelte (+Vite), None | React |
| C# (.NET 10) | Blazor Server, Blazor WASM, None | Blazor Server |

**Q5: Features / Routes** (if NEW + not described): free text. Derive entities, routes, relationships, services.

**Q6: Auth** (if relevant): `No auth`, `Mock auth middleware`.

> **✅** All requirements gathered.

---

### Step P3: Generate Plan

**Read [plan-template](references/plan-template.md), [project-structure](references/project-structure.md), [azure-services-catalog](references/azure-services-catalog.md) now.**

| Task | Detail |
|------|--------|
| Canonical structure | From `project-structure.md`, choose tree matching runtime + app type → Section 5. |
| Services from catalog | From `azure-services-catalog.md`, fill **Section 4** (Services Required) AND **4a** (Infrastructure Summary — `azure-prepare` input contract). |
| Fill all sections | Use quick-ref tables in `plan-template.md` to populate Sections 1–11 in one pass. |
| Write `.azure/project-plan.md` | Status = `Planning`. |

> Generate entire plan at once. ❌ Do NOT create `src/`, configs, package files, `infra/`, `azure.yaml`, Bicep, Terraform, Dockerfiles. Only `.azure/project-plan.md` allowed.

> **✅** `.azure/project-plan.md` exists. Status = `Planning`. All sections filled.

---

### Step P4: ⛔ APPROVAL GATE ⛔ — MANDATORY

> Rule 0 in action. Single most important checkpoint.

| Task | Detail |
|------|--------|
| Present plan | Summarize in chat: app type, runtime, services, route count, structure. Link the file. |
| Ask explicitly | Structured option prompt: **"Approve plan"** (recommended), **"Request changes"** (freeform). NEVER plain-text "does this look good?". |
| Loop on revision | If changes requested → update plan, present again. Repeat until approved. |
| Flip status | Change `Status:` from `Planning` to `Approved`. |

> ❌ STOP — do NOT proceed past this gate until explicit approval.
>
> Approvals: "yes", "approved", "looks good", "proceed", "ship it", clicking **Approve plan**.
>
> NOT approvals: silence, "I think so", any sentence with "but" / "what about", revision requests, questions about the plan.

> **✅** Status = `Approved`. Proceed to Phase 2.

---

## PHASE 2: SCAFFOLD

### Step 0: Re-validate Plan

| Task | Detail |
|------|--------|
| Re-read plan | Confirm Status = `Approved`. Else STOP and return to Phase 1. |
| Extract details | Routes, services, entities, frontend, runtime, structure. |
| Frontend needed? | If plan includes frontend (SPA + API, Full-stack SSR, Static + API), Step 0.5 generates preview. |
| Status | Set to `In Progress`. |

> **✅** Plan loaded, Status `In Progress`.

---

### Step 0.5: Frontend Preview (If Applicable)

> Skip if no frontend ("API only" / "Background worker").

Standalone frontend with mock data the user can see/interact with — and **edit** — while backend scaffolds in parallel. Preview MUST be auto-authenticated. Auto-open the dev URL — do NOT prompt.

**Refs**: [frontend-patterns.md](references/frontend-patterns.md) (patterns + quality bar), [frontend-preview-steps.md](references/frontend-preview-steps.md) (sub-steps F1–F4 + Edit Loop While Backend Builds).

> **✅** Build zero errors (`npx vite build` from `src/web/`); no `any` in `.ts`/`.tsx`; auto-authed; dev server started + auto-opened; edit loop active.

---

### Phase A & B — Backend Strategy

**Read [sub-agent-strategy.md](references/sub-agent-strategy.md) now.**

> Phase A (Contracts) sequential on main. Phase B (Backend Impl) launched via `runSubagent`. Both may begin after Step 0 (parallel with Step 0.5). **Sync gate**: Step 11 waits for BOTH (a) frontend approved AND (b) Phase B subagent returned.

Steps 1–12 describe work. Subagent runs Steps 3–10; main runs Steps 1, 2, 11, 12 + Phase A part of Step 5.

---

### Step 1: Foundation

Project skeleton compiles with zero errors.

| Task | Detail |
|------|--------|
| Init project | `package.json` + `tsconfig.json` (Node) / `*.csproj` + `*.sln` (.NET 10) |
| Linter/formatter | ESLint + Prettier (Node) / dotnet format (.NET 10) |
| `.gitignore` | Runtime-appropriate |
| Directory structure | Per [project-structure.md](references/project-structure.md). Do NOT create `src/web/` — may exist from preview. |

**Ref**: [../shared-references/architecture.md](../shared-references/architecture.md)

> **✅** (1) Build zero errors. (2) Every workspace has a build command; if it produces compiled output, verify non-empty. (3) Shared package exports its compiled output via the runtime's standard mechanism (e.g., `package.json` `"exports"`/`"main"` for Node, project reference for .NET). (4) Type-check each workspace that imports shared; fix unresolved-module errors. (5) After build, list the output directory and confirm the entry-point pattern matches handlers.

---

### Step 2: Configuration & Environment

Config module loads env vars with validation + safe defaults.

| Task | Detail |
|------|--------|
| `config` module | `services/config.ts` / `Services/Config.cs` |
| `.env.example` | All required vars, placeholders + comments |
| `local.settings.json` | Functions local settings + emulator defaults |
| Env validation | Fail fast on startup with clear missing-var error |

> **✅** Config loads env vars. `.env.example` documents all variables.

---

### Step 3: Service Abstraction Layer

One module per Azure service: injectable interface + concrete impl.

> ⚠️ MUST produce **two files per service**: interface AND concrete impl. Interface-only = #1 cause of runtime failures.

| Task | Detail |
|------|--------|
| Service interface | TS / C# interface. Document auto-managed fields. `IDatabaseService` MUST include `transaction()`. |
| Concrete impl | Implements interface with Azure SDK. **Strip auto-managed fields** in `update()`/`create()`. Transactions use BEGIN/COMMIT/ROLLBACK. |
| Service factory/registry | `getServices()` MUST auto-init concrete impls when nothing pre-registered. ESM-correct imports (no `require()` in ESM). Enhancement construction wrapped in try/catch. |

**Ref**: [../shared-references/service-abstraction.md](../shared-references/service-abstraction.md)

> 📋 Per service: `src/services/interfaces/I{Service}Service.ts` (interface), `src/services/{service}.ts` (concrete impl), `src/services/registry.ts` (`initializeServices()` constructs concrete instances), `getServices()` calls `initializeServices()` lazily.

> **✅** Interfaces, concrete impls, registry exist. Build/type-check zero errors.

---

### Step 4: Database Schema & Migrations

Repeatable schema management + seed data with constraints.

> ⛔ MANDATORY for relational DBs. Empty `seeds/` = scaffold failure. Migration files MUST contain `up()` (CREATE TABLE with all columns/types/constraints/indexes from plan) + `down()` reversing. `seeds/fixtures/seed-data.json` + `seeds/seed.ts` (or equivalent) MUST exist.

| Task | Detail |
|------|--------|
| Migration scripts | Knex (Node) / EF Core (.NET 10) |
| DB constraints | UNIQUE, FK + ON DELETE, CHECK, indexes |
| Seed scripts | Realistic fixtures + idempotent seed |
| Migration runner | Forward/backward |
| Verify table names | Cross-ref via `collectionToTable` (plan Section 7a) |

> **✅** Migration files non-empty (>0 bytes). Seed data exists. Table names match mapping.

---

### Step 5: Shared Types & Validation Schemas

Type-safe contracts + validation per endpoint.

> Phase A boundary: this step's contracts are the handoff to Phase B subagent. Main thread completes before launching subagent.

| Task | Detail |
|------|--------|
| Shared types | Entity types, API request/response in `src/shared/` |
| Validation schemas | Zod / FluentValidation — one per input endpoint |
| Path param schemas | UUID format validation |
| File upload validation | Size + MIME |
| Error code enum | Typed union of valid codes |
| Wire validation into handlers | Validate body/params before processing (subagent does this) |

**Ref**: [../shared-references/error-handling.md](../shared-references/error-handling.md)

> ⚠️ Schema completeness: every route has request schema (if applicable), query/path schemas, response type in shared package. <100% coverage = NOT complete.

> **✅** Every route has schema. Types build cleanly.

---

### Step 6: API Routes / Functions (Per Feature)

Implement each route one at a time. Each compiles + matches contract before next.

For **each** route:

| Task | Detail |
|------|--------|
| Function handler | One file per function. All async calls MUST `await`. Standardized `handleError`. |
| Multi-table writes | Use `database.transaction()` |
| Enhancement services | Try/catch + fallback (Rule 8) |
| File uploads | Server-side size + MIME validation |
| Path params | Validate before DB queries (e.g., UUID format — malformed ID on typed column = 500 not 401) |
| Response shape | Match Route Definitions |
| Collection names | Map to migration tables (Rule 9) |
| Shared utilities | Duplicates → `src/functions/src/utils/` |

**Ref**: [../shared-references/service-abstraction.md](../shared-references/service-abstraction.md), [../shared-references/resilience.md](../shared-references/resilience.md)

> **✅ Post-Step 6 Build Gate**: (1) Build zero errors. (2) Verify the entry-point pattern — list the build output directory and confirm it matches handlers.

---

### Step 7: Error Handling Middleware

Global error handler for consistent responses.

| Task | Detail |
|------|--------|
| Error types | Custom classes (NotFoundError, ValidationError, …) |
| Error middleware | Catches errors, maps to standardized response |
| Error response shape | `{ error: { code, message, details? } }` |

**Ref**: [../shared-references/error-handling.md](../shared-references/error-handling.md)

> **✅** Error types + middleware exist. Shape consistent.

---

### Step 8: Health Check Endpoint

`/api/health` reports status of all configured services.

| Status | HTTP | Condition |
|--------|:----:|-----------|
| `healthy` | 200 | All services healthy |
| `degraded` | 200 | Some down, app functional |
| `unhealthy` | 503 | All down or all Essential down |

> ⚠️ `degraded` returns 200, NOT 503.

> **✅** Health endpoint exists. Status→HTTP mapping correct.

---

### Step 9: OpenAPI / API Contract

| Task | Detail |
|------|--------|
| Generate spec | From plan route defs. Prefer inlining as TS object. |
| Spec endpoint | `/api/docs` or `/api/openapi.json` |
| Validate responses | Test actual responses match spec shapes |

> **✅** Spec exists. Endpoint wired.

---

### Step 10: Structured Logging

| Task | Detail |
|------|--------|
| Logger | pino / Serilog |
| Request logging | Method, path, status, duration |
| Operation logging | Key ops (create, update, delete) |

**Ref**: [../shared-references/runtimes/](../shared-references/runtimes/)

> **✅** Logger configured. Build/type-check zero errors.

---

### Step 11: Wire Frontend (If Applicable) — SYNC GATE

Replace mock data/types in preview with real shared types + typed API client.

> Skip if no frontend / no preview. ⛔ SYNC GATE: do NOT begin until BOTH (a) frontend approved AND (b) Phase B subagent returned. If frontend approved first, briefly inform user backend is finishing.

| Task | Detail |
|------|--------|
| Replace local types | Remove `src/web/src/types/` locals. Import from shared. |
| Replace mock API client | Remove `src/web/src/mocks/api.ts`. Create typed client `src/web/src/api/client.ts`. |
| Dev proxy | Dev server proxies `/api` → Functions host. |
| Update hooks/pages | Replace mock imports with real API calls. Maintain 4 data states. |
| Hook error handling | Catch errors, roll back optimistic updates on failure. |
| Destructive actions | Delete/irreversible require confirmation. |
| Client upload validation | Size + MIME before send. |
| File extensions | `.tsx` for JSX, `.ts` for pure TS. |

> ⚠️ No `any` types. Frontend MUST import shared types for all entities/responses.

> **✅** Build zero errors + zero `any` warnings. Dev server starts. Mock data layer removed.

---

### Step 12: Wrap Up

| Task | Detail |
|------|--------|
| Build all workspaces | Run the runtime's build/compile command in every workspace — zero errors |
| Plan status | Set to `Scaffolded` |
| Print completion | List created files, announce **"Scaffolding complete!"** |
| **Suggest next steps** | MANDATORY structured option prompt. Do NOT auto-invoke.<br>**Header**: "Next Step"<br>**Options** (allowFreeformInput: false):<br>- **"Set up local dev"** ("Docker emulators + IDE debugger") — recommended<br>- **"Prepare for deployment"** ("Generate IaC + `azure.yaml`")<br>Routes to: `azure-local-debug` / `azure-prepare` (reads plan **Section 4a**). |

> **✅ Final**: build clean; plan Status = `Scaffolded`; follow-up prompt presented.

---

## Outputs

| Artifact | Location |
|----------|----------|
| **Project Plan** | `.azure/project-plan.md` (Planning → Approved → In Progress → Scaffolded) |
| Frontend preview / wired | `src/web/` (mock data → real client) |
| Backend (Functions) | `src/functions/` |
| Shared types + schemas | `src/shared/`, `src/shared/schemas/` |
| Services + handlers | `src/functions/src/services/`, `src/functions/src/functions/` |
| Error types | `src/functions/src/errors/` |
| OpenAPI spec | `src/functions/openapi.{yaml,json}` |
| Env / Functions config | `.env.example`, `src/functions/local.settings.json` |
| Seed data | `src/functions/seeds/` |
| **Next step** | Structured option prompt |

---

## Runtime Quick Reference

| Runtime | Functions Init | Model | Package Manager |
|---------|---------------|-------|-----------------|
| TypeScript | `func init --typescript --model V4` | v4 | npm / pnpm |
| C# (.NET 10) | `func init --dotnet-isolated` | Isolated worker | dotnet |

Runtime patterns: [../shared-references/runtimes/](../shared-references/runtimes/).

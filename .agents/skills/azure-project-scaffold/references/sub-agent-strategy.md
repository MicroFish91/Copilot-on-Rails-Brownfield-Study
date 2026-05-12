# Sub-Agent Strategy for Backend Scaffolding

> Parallelization strategy for backend scaffold execution. Read when transitioning from **Step 0.5 (Frontend Preview)** to backend implementation.

---

## Execution Model

> ⚠️ **PIPELINING**: Phase A (Contracts) and Phase B (Backend) begin **immediately after Step 0** (plan re-validation), running in parallel with Step 0.5 (Frontend Preview). Backend derives from the approved plan, not the frontend preview. For API-only projects (no frontend), backend scaffolding starts immediately after Step 0.
>
> **Phase B runs in a SUBAGENT** (`runSubagent`) so the **main thread stays free** to drive the frontend preview iteration loop with the user. This is the whole point: the user can edit the preview while the backend builds.
>
> **Execution timeline for SPA + API projects:**
> ```
> Step 0 (Plan Re-validated)
>   ├── Step 0.5 (main thread): Frontend Preview ──> User iterates ──> Approved ──┐
>   ├── Phase A (main thread): Contracts (sequential) ─┐                          │
>   └── Phase B (SUBAGENT, async):  ◄──────────────────┘                          │
>          Backend impl, migrations, handlers ──> Subagent returns ───────────────┤
>                                                                                 ▼
>                                                            Step 11: Wire Frontend
>                                                            Step 12: Wrap Up
> ```

---

## Phase A: Contracts First (BLOCKING — Sequential, Main Thread)

Main thread creates these sequentially before launching the Phase B subagent — they are dependencies for everything else:

1. Shared types (`src/shared/types/`)
2. Validation schemas (`src/shared/schemas/`)
3. Service interfaces (`src/functions/src/services/interfaces/`)
4. Error types (`src/functions/src/errors/`)
5. Config module (`src/functions/src/services/config.ts`)

Build the shared package to produce `dist/`. Verify cross-workspace imports resolve. Only then launch the subagent.

---

## Phase B: Backend Implementation in a Subagent

Once contracts exist on disk, **launch a subagent via `runSubagent`** to do all backend implementation work. Pick the most appropriate available agent for multi-file code generation.

| Sub-Agent | Responsibility | Scope |
|-----------|---------------|-------|
| **Backend API Agent** (subagent) | Concrete service implementations, service registry auto-init, function handlers (one per route), migrations + seed data, OpenAPI spec, structured logging | Steps 3–10 implementation files |

> **Why subagent**: keeps the main thread responsive so the user can request frontend tweaks (text changes, layout edits, color swaps) while the backend scaffold runs uninterrupted.

### Subagent Handoff Prompt

When invoking `runSubagent` for Phase B, include in the `prompt`:

1. **Plan path**: `.azure/project-plan.md` — subagent must read in full.
2. **Contracts already created** (Phase A output paths) — list each file the subagent must NOT recreate or modify.
3. **Scope**: implement Steps 3–10 from `skills/azure-project-scaffold/SKILL.md`.
4. **Reference files** subagent must consult lazily per the Step-to-Reference table in SKILL.md.
5. **Build gates**: every step must compile.
6. **Return contract**: subagent's final message MUST report (a) files created, (b) build result, (c) any unresolved blockers.

---

## Coordination Rules

- Subagent receives full project plan + Phase A contract paths as context.
- **Main thread does NOT block waiting for subagent.** It runs the frontend preview iteration loop concurrently (see [frontend-preview-steps.md](frontend-preview-steps.md), "Edit Loop While Backend Builds").
- After subagent returns, main thread runs final build gate (`npm run build` in all workspaces) to confirm.
- **Synchronization gate at Step 11 (Wire Frontend)** — MUST wait for BOTH:
  - (a) Frontend preview approved by user, AND
  - (b) Phase B subagent returned successfully.
  - If subagent finishes first, hold and continue iterating frontend with the user.
  - If frontend approved first, hold and inform the user the backend is still building.
- Then proceed to Step 11 (Wire Frontend) and Step 12 (Wrap Up).

---

## Key Contract Rules (Subagent MUST Follow)

- Subagent MUST use the same `AppConfig` shape established in Phase A (flat structure — see [../../shared-references/service-abstraction.md](../../shared-references/service-abstraction.md)).
- Subagent MUST use the same collection names (`'user'`, `'couple'`, etc.) mapping to SQL table names per plan Section 7a.
- Subagent MUST import the same validation schema names exported from `src/shared/schemas/validation.ts`.
- Subagent MUST NOT modify Phase A files (contracts) — if a contract change is needed, it must surface a blocker for the main thread to resolve.

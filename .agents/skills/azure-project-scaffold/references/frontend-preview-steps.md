# Frontend Preview Steps

> Detailed sub-steps for standalone frontend preview. Read during **Phase 2, Step 0.5 (Frontend Preview)**.
>
> The preview is the user's first chance to validate the app's direction. The backend scaffolds in a parallel subagent (see [sub-agent-strategy.md](sub-agent-strategy.md)) so the user can iterate on the preview while the backend builds.

---

## Sub-step F1: Initialize Frontend Project

| Task | Details |
|------|---------|
| Initialize frontend project | React + Vite / Vue + Vite / Angular / Svelte (per plan) |
| Create `src/web/` directory | Standard structure matching plan's frontend framework |
| Create local type definitions | Define entity types locally in `src/web/src/types/` — standalone mock types for now |

---

## Sub-step F2: Create Mock Data Layer

| Task | Details |
|------|---------|
| Create mock data files | `src/web/src/mocks/data.ts` — realistic sample data matching plan entities |
| Create mock API client | `src/web/src/mocks/api.ts` — returns mock data with simulated delays |
| **Auto-seed auth state** | If app has auth, auth context/provider MUST auto-login with mock credentials on first load (no token in storage). Preview boots directly into authenticated view so user sees main app content — NOT a login page. Login/register/logout MUST still work if user manually logs out. |
| Handle all 4 data states | Loading (skeleton/spinner), Error (retry button), Empty (call-to-action), Data (populated) |

---

## Sub-step F3: Create Pages & Components

| Task | Details |
|------|---------|
| Create pages | One page per major feature, wired to mock API client |
| Create shared components | Reusable UI components (layout, nav, forms, cards) |
| Error handling in hooks | Every async hook catches errors, handles loading/error states |
| Destructive action confirmations | Delete and irreversible actions require user confirmation |
| Auth context auto-login | If app has auth, AuthProvider/auth context MUST auto-login on mount when no token exists, so preview opens to main authenticated content |
| Use correct file extensions | `.tsx` for JSX, `.ts` for pure TypeScript |

---

## Sub-step F4: Build, Auto-Open & Approval Loop

> ⚠️ **PARALLEL STEP**: Step 0.5 runs **concurrently** with Phase A (Contracts) and Phase B (Backend, in subagent). Backend derives from **plan's route definitions and entity types**, not the frontend preview — independent work streams.
>
> **Step 11 (Wire Frontend) is the synchronization gate** — requires BOTH:
> - (a) Frontend preview approved by user
> - (b) Phase B subagent returned successfully
>
> **Why safe**: Entity types, route definitions, service interfaces all come from the approved plan. Frontend preview uses standalone mock types (`src/web/src/types/`) independent of `src/shared/`. Frontend UI changes (layout, styling, components) don't affect backend contracts. Only Step 11 merges both streams by replacing mock types with shared imports.

> ⚠️ **WORKING DIRECTORY**: All frontend build/dev-server commands (`npx vite build`, `npx vite --host`, `npm run dev`, etc.) MUST run with `cwd` set to the frontend project directory (e.g., `src/web/`), **NOT workspace root**. Running from root produces a blank white page because Vite cannot locate `index.html`.

### Initial Open Procedure

1. Frontend builds with zero errors (`npx vite build` from `src/web/`, or equivalent). **cwd MUST be frontend directory — NOT project root.**
2. No `any` types in `.ts`/`.tsx` files
3. Preview is auto-authenticated — if app has login/auth, user lands on main content (not login page) on first load
4. Start dev server: `cd src/web && npx vite --host` (async/detach — must keep running). **cwd MUST be `src/web/` — running from project root serves blank white page.**
5. **Auto-open the dev URL in the user's browser** at `http://localhost:{port}/`.
   - VS Code agents: see [vscode-tooling.md](vscode-tooling.md) for the `simpleBrowser.show` mapping (embedded browser tab inside VS Code).
   - Other surfaces: print the URL clearly so the user can open it.

> **CRITICAL**: Do NOT prompt "Would you like to preview?" — always auto-open. The user explicitly opted into this workflow by approving a plan with frontend.

---

## Edit Loop While Backend Builds

> **This is the headline feature.** The backend Phase B subagent runs in the background. The main thread owns this loop so the user can iterate on the live preview while the backend scaffolds.

### Loop Procedure

1. After the preview opens, **ask the user with a structured option prompt** with three options:
   - **Approve preview** — recommended; releases the frontend side of the sync gate.
   - **Request changes** — user describes edits in freeform text.
   - **Check backend status** — main thread reports last known subagent status; loop repeats.
2. If **Request changes**:
   - Apply edits to `src/web/` files (components, mock data, styling, copy).
   - Rebuild: `npx vite build` (cwd = `src/web/`). Vite dev server hot-reloads automatically — no need to restart.
   - Re-open the preview URL if the tab was closed (VS Code agents: re-issue `simpleBrowser.show`; other surfaces: re-print the URL).
   - Return to Step 1 (ask again).
3. If **Check backend status**:
   - Inspect subagent state. Report concise summary to user (e.g., "Backend subagent is implementing handlers, ~6/12 routes done").
   - Return to Step 1.
4. If **Approve preview**:
   - Stop the dev server.
   - Mark frontend half of the sync gate satisfied.
   - If Phase B subagent has already returned → proceed to Step 11.
   - If Phase B subagent still running → wait for it, then proceed to Step 11.

### Rules for the Edit Loop

- **Do NOT block the subagent** — never wait synchronously inside the loop on backend completion. Keep the loop tight: user input → edit → rebuild → ask again.
- **Do NOT touch Phase A contracts** during the loop. Local mock types in `src/web/src/types/` are fair game; `src/shared/` is not.
- **Do NOT scaffold backend files** from the main thread during the loop — that's the subagent's job. The main thread only owns frontend edits + Phase A contracts (already complete by this point).
- If the user asks for a change that requires backend work (e.g., "add a new entity"), **update the plan first**, surface the change to the subagent (or queue it for after the subagent returns), then update the preview.

---

## Frontend Quality Bar

Even in preview mode, frontend MUST meet these standards:
- No `any` types (use local type definitions in `src/web/src/types/`)
- Hooks catch errors and handle loading/error states
- Destructive actions (delete, etc.) require `window.confirm()` before executing
- `.tsx` for files containing JSX, `.ts` for pure TypeScript
- All 4 data states handled: loading, error, empty, data
- **Auto-authenticated preview**: If app has auth, preview MUST auto-login on first load so user sees main content immediately (not login page)

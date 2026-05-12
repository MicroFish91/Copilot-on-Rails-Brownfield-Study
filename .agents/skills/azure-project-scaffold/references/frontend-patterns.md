# Frontend Architecture Patterns

> Conceptual rules for any frontend runtime. Code snippets live in the runtime files.
>
> - React + TypeScript: [`shared-references/runtimes/typescript.md` → Frontend Patterns](../../shared-references/runtimes/typescript.md#frontend-patterns)
> - Blazor (Server / WASM): [`shared-references/runtimes/dotnet.md` → Frontend Patterns](../../shared-references/runtimes/dotnet.md#frontend-patterns)

## Core Principle

Same quality bar as backend: typed, tested, structured. Frontend consumes the shared types package, has its own test gate (Step 11), and follows consistent patterns for data fetching, error handling, and component structure.

## Framework Vocabulary Map

The rules below use conceptual terms. Translate to your framework via this table.

| Concept | React | Vue 3 | Svelte | Angular | Blazor |
|---------|-------|-------|--------|---------|--------|
| Component state | `useState` | `ref` / `reactive` | `let` + `$state` | property + `signal` | field |
| Side effect | `useEffect` | `watchEffect` / `onMounted` | `$effect` | `effect` / `ngOnInit` | `OnInitializedAsync` / `OnParametersSetAsync` |
| Computed / derived | `useMemo` | `computed` | `$derived` | `computed` | computed property / `[Computed]` |
| Memoized callback | `useCallback` | inline / `unref` | inline | inline | inline / cached `Func` |
| Component inputs | props | `defineProps` | export `let` | `@Input()` | `[Parameter]` |
| Trigger / event | `onClick` | `@click` | `on:click` | `(click)` | `@onclick` |
| List render | `.map()` | `v-for` | `{#each}` | `@for` | `@foreach` |
| Conditional render | `&&` / ternary | `v-if` | `{#if}` | `@if` | `@if` |
| Form binding | controlled `value` + `onChange` | `v-model` | `bind:value` | `[(ngModel)]` | `@bind` |
| Navigation / link | `<Link>` (RR) | `<RouterLink>` | `<a use:link>` | `routerLink` | `<a href>` / `NavigationManager` |
| Route guard | wrapper component | `beforeEach` | `+layout.ts` load | `CanActivate` | `<AuthorizeView>` / `[Authorize]` |
| Fetch primitive | `fetch` | `fetch` | `fetch` | `HttpClient` | `HttpClient` |
| Cancel in-flight | `AbortController` | `AbortController` | `AbortController` | `takeUntil` / `unsubscribe` | `CancellationToken` |
| Client storage | `localStorage` / `sessionStorage` | same | same | same | `IJSRuntime` → storage / `ProtectedSessionStorage` |
| Modal / confirm | custom + `<dialog>` | custom + `<dialog>` | custom + `<dialog>` | Angular Material / custom | `IJSRuntime.confirm` / MudBlazor |

## Rule: Consume Shared Types — No Untyped Data

Every entity, request, and response MUST come from the shared types package. No inline `any` / `dynamic` / `object` for API data; no ad-hoc interfaces duplicating shared definitions.

> **Why**: the shared package is the single source of truth across backend and frontend. Duplicating types breaks the contract silently.

## Rule: API Client is the Contract Boundary

A single typed client wraps every endpoint. Components NEVER call `fetch` / `HttpClient` directly. Each method takes a typed request and returns a typed response (or throws a typed error).

> **Why**: centralizes auth headers, error normalization, base URL, and cancellation. Refactors to one file.

## Rule: Handle Errors in Every Async Op

Every async operation MUST catch errors and update an error state visible to the user. Optimistic updates MUST snapshot prior state and roll back on failure.

> **Why**: silent failures look like bugs. Optimistic UIs without rollback corrupt visible state.

### Sub-rule: No Silent Error Swallowing

Catch only *expected* errors (e.g., 404 for "not found yet") narrowly. Log + surface anything unexpected.

## Rule: Confirm Destructive Actions

Permanent delete or irreversible modify MUST require explicit confirmation. Prefer a custom modal over the platform `confirm()` for better UX, but `confirm()` is acceptable as a scaffold default.

## Rule: Validate File Uploads Client-Side AND Server-Side

Client-side validation gives immediate feedback and saves bandwidth. **Server-side validation is mandatory for security** — never trust the client. Validate MIME type and size at both boundaries. Tune `ALLOWED_TYPES` and `MAX_FILE_SIZE` to your domain (images, PDFs, CSVs, etc.).

## Rule: Four-State Data Pages

Every data-fetching view MUST handle all four states:

1. **Loading** — skeleton or spinner
2. **Error** — message + retry trigger
3. **Empty** — call to action ("create your first one")
4. **Populated** — the data

Skipping any state ships a broken UX in production.

## Rule: Cancel Stale Requests

When a fetch is keyed on inputs that can change (route param, search query, filter), supersede the in-flight request when inputs change. Use `AbortController` (web fetch) or `CancellationToken` (.NET). Without this, slow responses overwrite fresh ones — "flickering wrong data" bug.

## Rule: Protected Routes via Guard, Not Per-Page Checks

Wrap private routes in a guard component / route metadata that runs the auth check before render. Don't repeat `if (!user) navigate('/login')` in every page — it leaks across new pages.

> **Concept**: route-level authorization fails closed by default; page-level checks fail open whenever a developer forgets one.

## Rule: Auth Token Lifecycle

Pick ONE storage strategy and apply it consistently:

| Storage | When to use | Trade-off |
|---------|-------------|-----------|
| HTTP-only cookie | SSR, same-origin API, CSRF mitigated | Server-set, can't read from JS — best for security |
| `localStorage` | SPA + cross-origin API + bearer token | Vulnerable to XSS — accept only with strict CSP |
| In-memory | Highest security, short sessions | Lost on reload |

On 401 from the API client: attempt one refresh, then redirect to login. On logout: clear token AND any cached user/profile/feature state — not just the token.

## Rule: No Secrets in the Frontend Bundle

Build-time env vars (`VITE_*`, `NEXT_PUBLIC_*`, Blazor WASM `appsettings.json`) ship to the browser. NEVER put API keys, client secrets, or DB URLs there. Public values only: API base URL, feature flags, public anon keys with row-level security. Server-side secrets stay in Functions config, accessed via Managed Identity or Key Vault.

## Rule: 404 + Scroll Restoration

Every router config MUST include a catch-all `*` / `NotFound` route. SPA routers MUST scroll to top on navigation (most don't by default).

## Pattern: Shared Form Pattern

When 2+ pages share >50% form structure, extract a shared component / partial / composable. Compose via:

| Framework | Composition primitive |
|-----------|----------------------|
| React | `children` props |
| Vue | named slots |
| Svelte | `<slot>` |
| Angular | `ng-content` projection |
| Blazor | `RenderFragment` |

## Pattern: Consistent Styling

Pick ONE approach and use it consistently. Do NOT mix inline styles with CSS classes.

| Approach | Use When |
|----------|----------|
| **CSS Modules / scoped styles** | Component-scoped, medium-large apps |
| **Global CSS + BEM** | Small apps, rapid prototyping |
| **CSS-in-JS** (styled-components, Emotion, vanilla-extract) | Dynamic themes, state-based styling |
| **Tailwind / utility-first** | Utility-first, design-system projects |

> Never mix inline `style` props with CSS classes. Pick one, document it in the README.

## Frontend Tests

Frontend test gate (Step 11) coverage + setup patterns: see [testing.md](testing.md) → "Frontend Testing" section.

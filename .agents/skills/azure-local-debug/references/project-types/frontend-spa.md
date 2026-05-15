# Project Type: Frontend SPA

Reference guide for local development setup of frontend single-page application projects.

---

## Detection Signals

| Signal | Notes |
|--------|-------|
| `vite.config.*` or `vite` in devDependencies | Vite-based SPA |
| `next.config.*` or `next` in dependencies | Next.js app |
| `angular.json` | Angular app |
| `react-scripts` in dependencies | Create React App |

---

## Runtime Support Matrix

| Runtime | Status | Reference |
|---------|--------|-----------|
| node | ✅ Full | [runtimes/node.md](../runtimes/node.md) |

---

## Dependency Discovery

Frontend SPAs communicate with backend services via HTTP during local development — they do not connect to Azure emulators directly. In monorepo setups, Azure service dependencies (storage, databases, etc.) are handled by the backend project type. In standalone SPA projects, the backend may already be running as a deployed service or a separate local process — no emulator setup is needed for the SPA itself.

---

## Backend Proxy Detection

Frontend SPAs often proxy API requests to a local backend during development (e.g., Vite's `server.proxy`, webpack's `devServer.proxy`, Angular's `proxy.conf.json`). When a proxy is detected **and** the proxy target matches a backend service in the same workspace, the frontend's dev-server task **must** depend on the backend's top-level startup task. This ensures the backend is accepting requests before the frontend starts and the browser makes its first API call.

### Detection Signals

| Framework | Proxy Config Location | Target Pattern |
|-----------|----------------------|----------------|
| Vite | `vite.config.*` → `server.proxy` | URL with `localhost:{port}` |
| webpack / CRA | `package.json` → `"proxy"` field, or `src/setupProxy.js` | URL with `localhost:{port}` |
| Angular | `proxy.conf.json` or `proxy.conf.js` | `target` field with `localhost:{port}` |
| Next.js | `next.config.*` → `rewrites()` or `middleware.ts` | URL with `localhost:{port}` |

### Matching Rule

Extract the proxy target port and match it against the application ports of other services in the workspace:

| Backend Project Type | Application Port |
|---------------------|------------------|
| Azure Functions | 7071 |
| App Service / Container App | Framework-specific (e.g., 3000, 8080) |

If the proxy target port matches a backend service's application port, record the dependency:

```yaml
frontendProxy:
  from: {frontend-service-id}
  to: {backend-service-id}
  targetPort: {port}
```

### Task Dependency

When a proxy dependency is detected, the frontend's dev-server task **must** depend on the backend's top-level startup task. The exact mechanism is IDE-specific (e.g., `dependsOn` in VS Code tasks) — see [ide/{ide}.md](../ide/) for the implementation format. See [multi-service.md § Startup Ordering](../multi-service.md) for the general orchestration rule.

> **No proxy detected?** If no proxy configuration is found, or the proxy target does not match any backend service in the workspace, do not add a backend dependency. The frontend dev server starts independently.

---

## Startup Command

The startup command is the framework's dev server:

| Framework | Default Command | Default Dev Port |
|-----------|---------|-----------------|
| Vite | `npm run dev` | 5173 |
| Next.js | `npm run dev` | 3000 |
| Angular | `npm start` or `ng serve` | 4200 |
| Create React App | `npm start` | 3000 |

---

## Runtime Wiring

<!-- Combines with runtimes/{rt}.md (protocol, port) and ide/{ide}.md to produce IDE task config. -->

| Runtime | Startup command | Startup task label | Debug Config | Notes |
|---------|----------------|-------------------|--------------|-------|
| node | `npm run dev` | `{id} dev` | `launch` (chrome) | Chrome config's `preLaunchTask` triggers the dev server task chain |

---

## Framework Detection & Problem Matchers

Each frontend framework emits different console output when the dev server is ready. These patterns are used for background problem matchers in the IDE build configuration.

| Framework | Detection | Ready Pattern (endsPattern) |
|-----------|----------|-----------------------------|
| Vite | `vite.config.*` or `vite` in devDependencies | `Local:` |
| Next.js | `next.config.*` or `next` in dependencies | `Ready in` |
| Angular | `angular.json` | `Compiled successfully` |
| Create React App | `react-scripts` in dependencies | `Compiled` |

> **Pattern selection guidance:** Choose patterns that are plain-text anchors resistant to ANSI escape code interference. See the active IDE adapter in [ide/](../ide/) for ANSI considerations and idempotent re-run rules.

> All background problem matchers must include `"activeOnStart": true` and a no-op error pattern (`"regexp": "^$"`). The `owner` field should be set to the framework name (lowercased).

# {IDE Name} — IDE Configuration

> **Template** — Copy this file to `ide/{ide}.md` when adding support for a new IDE.

---

## Overview

<!-- Brief description of how this IDE handles debug/run configurations. -->

## Configuration File Paths

| Purpose | File Path |
|---------|-----------|
| Debug configuration | `{path}` |
| Build configuration | `{path}` |

---

## Debug Configuration

<!-- How the debugger connects to the running app.
     In VS Code this is launch.json; in JetBrains this is a Run/Debug Configuration. -->

Data sources:
- `runtimes/{rt}.md` → Debug protocol (map to this IDE's adapter identifier), base debug port — for server-side project types
- `project-types/{type}.md` → Request Mode (attach or launch); for browser-based project types, also provides the debugger adapter type

### Template

<!-- Generic config shape with placeholder fields. -->

### Field Reference

<!-- Table showing where each field value comes from.
     Include rows for the debugger adapter type — mapped from the runtime's debug protocol for server-side types,
     or from the project type for browser-based types (e.g., Frontend SPA → chrome). -->

### Example

<!-- Any implemented examples. -->

---

## Build Configuration

<!-- How to build and start the app.
     In VS Code this is tasks.json; in JetBrains this may be Run Configurations or External Tools. -->

Data sources:
- `runtimes/{rt}.md` → Build chain commands (install, clean, watch, build)
- `project-types/{type}.md` → Startup command, startup task label, request mode
- This file → IDE-specific problem matchers for compiler output

Two kinds of tasks:
1. **Runtime build tasks** — install, clean, watch, build
2. **Project type top-level task** — the task that starts the application (e.g., `func host start`, `npm start`, `dotnet run`). The debug configuration's pre-launch step points to this. It sits at the top of the dependency chain.

### Chain Shape

<!-- Dependency order diagram. -->

### Runtime Task Reference

<!-- Table with IDE-specific problem matchers (commands come from runtimes). -->

### Per-Project-Type Subsections

> Only add a subsection when the project type requires an IDE-specific task type or custom problem matcher (e.g., Azure Functions uses a custom `func` task type in VS Code). If the project type uses a standard shell command, no subsection is needed — the generic chain shape already covers it.

When a project type's top-level task is a background process, it needs a problem matcher so the IDE knows when startup is complete. There are two sources:

1. **Extension-provided named matcher** — a string reference such as `"$func-node-watch"`. Use this when an extension (see the Extension-Provided Task Types and Problem Matchers section in this file) registers the matcher. List the extension as a prerequisite.
2. **Inline matcher** — an object defined directly in the task. Use this when no extension provides a named matcher. Refer to the IDE-specific reference (e.g. `ide/vscode.md § Authoring an Inline Background Problem Matcher`) for the required shape and guidance on deriving ready-signal patterns from the process's stdout.

### Extension-Provided Task Types and Problem Matchers

<!-- Optional section. Include when this IDE supports extensions that register additional task types
     or problem matchers needed by generated build/launch configurations.
     List each extension here so the inventory phase (inventory.md § IDE Extension Prerequisites)
     can surface it as a prerequisite in the plan.

     To add support for a new extension dependency:
     1. Add a row to this section's lookup table.
     The inventory phase cross-references this table against the task types and problem matchers
     being generated, so no changes to project-type files are needed. -->

<!-- Remove this section entirely if this IDE has no extension prerequisites. -->

| Task Type / Problem Matcher | Runtime(s) | Extension Name | Extension ID | Install URL | Status |
|-----------------------------|------------|----------------|--------------|-------------|--------|
| `{task-type}` / `{$matcher}` | {runtime(s)} | {Extension Name} | `{publisher.name}` | [{label}]({url}) | {✅/🔲} |

### Example

<!-- A worked example for an implemented runtime. -->

---

## Multi-Service / Compound Configuration

<!-- How this IDE handles running multiple services simultaneously. -->

Data sources:
- [multi-service.md](../multi-service.md) → service IDs, port assignments, startup ordering

---

## Debug Configuration Checklist Validation

<!-- MANDATORY — Maps to Phase 3 of the skill workflow.
     You MUST execute every validation step defined here. Do NOT skip or assume results.
     Do NOT proceed until every checklist entry has a real ✅ or ❌ result. -->

---

## Quick Start

<!-- One-liner instructions for the user (e.g., "Press F5", "Click Run", etc.) -->

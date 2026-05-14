---
name: workspace-reset
description: "Fully reset a study workspace back to match origin/main after a user study session. Stops Docker containers, kills interfering processes, removes all generated artifacts, and validates the workspace is clean. WHEN: \"prepare for next study\", \"reset for study\", \"clean up after study\", \"start fresh\"."
license: MIT
metadata:
  author: Microsoft
  version: "0.0.1"
---

# Workspace Reset

> **DESTRUCTIVE SKILL — CONFIRM BEFORE EXECUTING**
>
> This skill performs a hard reset of the workspace. All local changes, untracked files, and generated artifacts will be permanently deleted. Always confirm with the user before proceeding.

---

## Triggers

Activate this skill when the user wants to:

- Reset the workspace after a user study session
- Revert all changes back to the original commit
- Clean up generated artifacts (node_modules, emulator data, configs)
- Prepare the repo for the next study participant

## Global Rules (NO EXCEPTIONS)

1. **Confirm before executing** — This is a destructive operation. Always use `ask_user` to confirm before starting cleanup.
2. **Verify correct repository** — Before any cleanup, confirm the workspace is a known study repository by checking `git remote get-url origin` against the two known remotes. Match on the git remote URL, never the local folder name (users may rename folders). Refuse to proceed if the remote does not match.
3. **Stop all Docker containers** — Stop and remove all Docker containers. This runs on a dedicated devbox so global cleanup is safe.
4. **Report results** — After cleanup, show the user exactly what was cleaned and the validation outcome.

---

## Phase 1: Safety Checks

Before doing any work, verify the environment:

| # | Action | Details |
|---|--------|---------|
| 1 | **Verify repository** | Run `git remote get-url origin` and confirm it matches one of the two known study repositories: `https://github.com/MicroFish91/Copilot-On-Rails-Skills-Study` (Greenfield) or `https://github.com/MicroFish91/Copilot-on-Rails-Brownfield-Study` (Brownfield). Match on the remote URL — do NOT rely on the local folder name since users may rename it. If the remote does not match either repo, warn the user and stop. |
| 2 | **Confirm with user** | Use `ask_user` to confirm the reset. Warn that all local changes, untracked files, and Docker containers will be removed. |
| 3 | **Fetch latest remote** | Run `git fetch origin main` to ensure we have the latest remote state. |

---

## Phase 2: Stop Running Services

Stop any services that could hold file locks or recreate cleaned artifacts.

| # | Action | Details |
|---|--------|---------|
| 1 | **Check Docker availability** | Run `command -v docker && docker info` to verify Docker is available. If Docker is not installed or not running, warn and skip to Phase 3. |
| 2 | **Stop and remove all Docker containers** | Run `docker stop $(docker ps -aq) 2>/dev/null; docker rm $(docker ps -aq) 2>/dev/null`. Skip gracefully if no containers exist. This is safe — the skill runs on a dedicated devbox. |
| 3 | **Check for interfering processes** | Look for processes that might recreate artifacts (e.g., Azurite extension, running Node.js servers, file watchers). If found, warn the user and ask them to close the relevant VS Code extensions or processes before continuing. Common culprits: Azurite VS Code extension (recreates `.azurite/`), running `tsc --watch` or `npm run dev` (holds locks on `node_modules/`). |

---

## Phase 3: Reset Workspace

Use Git to restore the workspace to match `origin/main` exactly.

| # | Action | Command |
|---|--------|---------|
| 1 | **Hard reset to origin/main** | `git reset --hard origin/main` — This restores all tracked files to the remote state AND moves HEAD to match origin/main. This handles modified files like `package.json`, `package-lock.json`, `.gitignore`, etc. |
| 2 | **Remove all untracked and ignored files** | `git clean -ffdx` — The `-x` flag removes ignored files too (node_modules, .azurite, .postgres, etc.). The double `-f` handles nested git repos if any exist. This removes: `node_modules/`, `.vscode/`, `.azurite/`, `.postgres/`, `api-test-collections/`, `docker-compose.yml`, `.azure/local-development-plan.md`, and any other generated artifacts. |

---

## Phase 4: Validate

Verify the workspace is fully clean and matches `origin/main`.

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | **HEAD matches origin/main** | `test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"` | Exit code 0 |
| 2 | **No modified or staged files** | `git status --porcelain` | Empty output |
| 3 | **No diff with origin/main** | `git diff --exit-code origin/main` | Exit code 0 |
| 4 | **No remaining untracked/ignored files to clean** | `git clean -ndx` | Empty output (nothing to remove) |
| 5 | **Branch status** | `git status --short --branch` | Shows `## main...origin/main` with no ahead/behind |

### Handling Validation Failures

If any validation check fails:

1. **Identify the cause** — Inspect what files or differences remain.
2. **Check for recreating processes** — If files like `.azurite/` reappear immediately after cleaning, a VS Code extension or background process is likely recreating them. Identify the process and ask the user to close it.
3. **Re-clean if needed** — Run `git clean -ffdx` again after the interfering process is stopped.
4. **Re-validate** — Run all validation checks again.
5. **Do not loop indefinitely** — If validation fails after 2 remediation attempts, report the remaining issues to the user and ask for manual intervention.

---

## Phase 5: Report

Present the user with a summary:

| Item | Details |
|------|---------|
| **Docker containers** | Stopped and removed (or skipped if none) |
| **Files removed** | List key artifacts that were cleaned |
| **Git state** | HEAD commit hash, branch, and confirmation it matches origin/main |
| **Validation** | ✅ All checks passed (or ❌ with details on remaining issues) |

### Example closing message:

> ## Workspace Reset Complete
>
> - 🐳 Docker containers stopped and removed
> - 🗑️ Generated artifacts cleaned (node_modules, .vscode, .azurite, .postgres, api-test-collections, docker-compose.yml)
> - 🔄 Workspace reset to `origin/main` (`be7266c`)
> - ✅ All validation checks passed — workspace is clean and ready for the next study

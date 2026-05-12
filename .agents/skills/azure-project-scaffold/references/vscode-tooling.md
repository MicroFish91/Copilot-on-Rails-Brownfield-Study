# VS Code Tooling (Custom Agent Reference)

> **Audience**: a custom agent running inside **VS Code** with access to VS Code-specific tools (e.g. `vscode_askQuestions`, `run_vscode_command`).
>
> The main `azure-project-scaffold` SKILL.md uses **agent-agnostic** language ("structured option prompt", "auto-open the dev URL"). This file maps those generic calls to the concrete VS Code tools that fulfill them. Other surfaces (CLI agents, web-based agents, IDEs other than VS Code) should map the same generic calls to their own equivalents.

---

## Generic Call → VS Code Tool

| Generic instruction in SKILL.md | VS Code tool to use |
|--------------------------------|---------------------|
| "Ask the user with a structured option prompt" | `vscode_askQuestions` (`question`, `options[]`, `allowFreeformInput`, `multiSelect`) |
| "Auto-open the dev URL in the user's preferred browser" | `run_vscode_command` → `simpleBrowser.show` with the URL |
| "Open the IDE debugger launch config" | `run_vscode_command` → `workbench.action.debug.start` |

---

## Pattern: Structured Option Prompt → `vscode_askQuestions`

Use `vscode_askQuestions` for every place SKILL.md says "structured option prompt":

| SKILL.md location | Question | Options |
|------------------|----------|---------|
| **P2** Gather Requirements | App Type, Runtime, Data Stores, Frontend Framework, Auth | Per-question fixed choices; `multiSelect: true` only for Data Stores |
| **P4** Approval Gate | "Approve the project plan?" | "Approve plan" (recommended), "Request changes" (`allowFreeformInput: true`) |
| **Step 0.5** Frontend edit loop | "Preview is ready. What next?" | "Approve preview", "Request changes" (`allowFreeformInput: true`), "Check backend status" |
| **Step 12** Next-step prompt | "Scaffolding complete! What would you like to do next?" | "Verify project", "Set up local dev", "Prepare for deployment" |

### Rules

- Batch ALL unanswered P2 questions into a **single** `vscode_askQuestions` call.
- Set `allowFreeformInput: false` for fixed choices; `true` only for "Request changes" entries.
- Set `multiSelect: true` only when explicitly noted (Data Stores in P2).
- Never fall back to plain-text "does this look good?" chat — always use the structured prompt.

---

## Pattern: Auto-Open Preview → `simpleBrowser.show`

For Step 0.5 (Frontend Preview), after the dev server is running:

1. Start the dev server with `cwd = src/web/` (e.g., `npx vite --host`). Run async — must keep running.
2. Auto-open: `run_vscode_command` with command `simpleBrowser.show` and argument `"http://localhost:{port}/"`.
3. Embedded browser tab opens inside VS Code — no external browser needed.
4. After every edit-loop iteration, re-issue `simpleBrowser.show` with the same URL if the tab was closed (Vite hot-reloads, so the page itself does not need to be rebuilt).

> **CRITICAL**: Do NOT prompt "Would you like to preview?" — auto-open. The user opted into this workflow by approving a plan with frontend.

---

## Fallback for Non–VS Code Surfaces

If the agent does NOT have VS Code tools available (CLI agent, web chat, other IDE):

| Generic call | Fallback |
|--------------|----------|
| Structured option prompt | Use the host's structured-input mechanism (CLI prompt with numbered choices, web form, REPL menu). If none available, print options as a numbered list and parse the user's reply. |
| Auto-open dev URL | Print the URL clearly and instruct the user to open it in their browser. Do NOT block on confirmation. |
| Open IDE debugger | Print the equivalent terminal command (e.g., `func start`) and the launch config path (`.vscode/launch.json` or `launch.json` if the user's IDE supports it). |

---

## Notes for Custom Agent Authors

- This reference is **not loaded** by the main scaffold workflow. It exists so a VS Code-specific custom agent (or its system prompt) can reference it once and route every "structured option prompt" / "auto-open dev URL" mention in SKILL.md to the correct VS Code tool.
- When porting `azure-project-scaffold` to a new host, write a sibling reference (e.g., `cli-tooling.md`, `web-tooling.md`) instead of editing SKILL.md.

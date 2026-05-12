# Azure Services Catalog (Scaffold → Prepare Bridge)

> Read during Phase 1, Step P3. Use to populate plan **Section 4** (Services Required) and **Section 4a** (Infrastructure Summary).
>
> **Scope**: Declare deployment intent in `.azure/project-plan.md`. Do NOT generate `infra/`, `azure.yaml`, Bicep, Terraform, Dockerfiles, or any IaC. `azure-prepare` consumes this plan and owns IaC.

## Compute Target

`azure-project-scaffold` scaffolds **Azure Functions v4** projects today — the only backend template wired into the workflow (directory layout, `host.json`, handler-per-file). Container Apps / App Service are valid Azure backends but not yet templated here; users wanting those should pick `azure-prepare` against an existing codebase.

| Choice | Value | Notes |
|--------|-------|-------|
| Backend compute | Azure Functions v4 | Node.js v4 / .NET 10 isolated |
| Hosting plan | Flex Consumption | `azure-prepare` default |
| Frontend hosting (if SPA) | Static Web Apps | `azure-prepare` may swap |

> Hand-off: record compute choice in plan Section 4a. Do NOT instantiate hosting here.

## Functions Runtime Essentials (always required)

Minimum viable Functions app cannot run without these. Always list in plan Section 4a → "Runtime Essentials".

| Service | ARM Resource Type | Role |
|---------|------------------|------|
| Azure Functions app | `Microsoft.Web/sites` | Backend compute |
| App Service Plan (Flex) | `Microsoft.Web/serverfarms` | Functions hosting |
| Storage Account (runtime) | `Microsoft.Storage/storageAccounts` | Functions runtime + deployment. Separate from user-data Blob/Queue/Table account. |

> `azure-prepare` ref: `services/functions/README.md`, `services/functions/bicep.md`.

## Recommended Baseline (opt-in defaults)

Strongly recommended for non-trivial projects but not strictly required. Default to **on** for Prod/Dev; opt **out** for throwaway POCs or smallest footprint. List user choices in plan Section 4a → "Baseline Services".

| Service | ARM Resource Type | Role | When to skip |
|---------|------------------|------|--------------|
| Application Insights | `Microsoft.Insights/components` | APM, tracing | Throwaway POC |
| Log Analytics Workspace | `Microsoft.OperationalInsights/workspaces` | Centralized logs | If App Insights skipped |
| Managed Identity (system-assigned) | (Functions sub-resource) | Service-to-service auth | No Azure data services or user wants connection-string auth |
| Key Vault | `Microsoft.KeyVault/vaults` | Secret storage | No Enhancement service uses an API key |

> `azure-prepare` ref: `services/app-insights/README.md`, `services/key-vault/README.md`.
>
> Default baseline **on**. Drop only with a concrete reason — record it in the plan.

## User-Selectable Services

Detect via workspace inference (P2 rules) or ask with a structured option prompt. Add selections to plan Section 4 (env-var hint) and Section 4a → "User-Selected Resources" (ARM type).

### Data

| Service | ARM Resource Type | Env Var (Local Default) | Local Emulator | `azure-prepare` Reference |
|---------|------------------|-------------------------|----------------|--------------------------|
| Blob Storage | `Microsoft.Storage/storageAccounts` (separate from Functions runtime SA) | `STORAGE_CONNECTION_STRING` (`UseDevelopmentStorage=true`) | Azurite | `services/storage/README.md` |
| Queue Storage | `Microsoft.Storage/storageAccounts` | `STORAGE_CONNECTION_STRING` (`UseDevelopmentStorage=true`) | Azurite | `services/storage/README.md` |
| Table Storage | `Microsoft.Storage/storageAccounts` | `STORAGE_CONNECTION_STRING` (`UseDevelopmentStorage=true`) | Azurite | `services/storage/README.md` |
| Cosmos DB (NoSQL) | `Microsoft.DocumentDB/databaseAccounts` | `COSMOSDB_CONNECTION_STRING` | Cosmos DB Emulator | `services/cosmos-db/README.md` |
| Azure SQL Database | `Microsoft.Sql/servers` + `Microsoft.Sql/servers/databases` | `SQL_CONNECTION_STRING` | mssql-server container | `services/sql-database/README.md` (Entra-only auth — no admin login/password) |
| PostgreSQL Flexible Server | `Microsoft.DBforPostgreSQL/flexibleServers` | `DATABASE_URL` (`postgresql://localdev:localdevpassword@localhost:5432/{db}`) | postgres container | _(no service ref — handle directly per `azure-prepare/references/research.md`)_ |
| Azure Cache for Redis | `Microsoft.Cache/Redis` | `REDIS_URL` (`redis://localhost:6379`) | redis container | _(no service ref — handle directly)_ |

### Messaging & Events

| Service | ARM Resource Type | Env Var (Local Default) | Local Emulator | `azure-prepare` Reference |
|---------|------------------|-------------------------|----------------|--------------------------|
| Service Bus | `Microsoft.ServiceBus/namespaces` | `SERVICE_BUS_CONNECTION_STRING` | _(none — use Storage Queues locally)_ | `services/service-bus/README.md` |
| Event Grid | `Microsoft.EventGrid/topics` or `systemTopics` | `EVENT_GRID_TOPIC_ENDPOINT`, `EVENT_GRID_TOPIC_KEY` | _(none)_ | `services/event-grid/README.md` |
| Event Hubs | `Microsoft.EventHub/namespaces` | `EVENT_HUBS_CONNECTION_STRING` | _(none)_ | _(no service ref — handle directly)_ |

### AI

| Service | ARM Resource Type | Env Var (Local Default) | Local Emulator | `azure-prepare` Reference |
|---------|------------------|-------------------------|----------------|--------------------------|
| Azure OpenAI / Foundry | `Microsoft.CognitiveServices/accounts` (kind: `OpenAI` or `AIServices`) | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` | _(none)_ | `services/foundry/README.md` (also invoke `microsoft-foundry` skill for AI patterns) |
| AI Search | `Microsoft.Search/searchServices` | `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY` | _(none)_ | _(no service ref — invoke `azure-ai` skill if needed)_ |

---

## Files NOT Created by This Skill

| File / Path | Created By |
|-------------|-----------|
| `infra/**/*.bicep`, `infra/**/*.tf` | `azure-prepare` |
| `azure.yaml` | `azure-prepare` |
| `Dockerfile` (any component) | `azure-prepare` |
| `.github/workflows/*.yml` (deploy pipelines) | `azure-prepare` |
| `.azure/deployment-plan.md` | `azure-prepare` |

> If user asks for any of these during scaffold: "Scaffolding doesn't generate IaC. After scaffold + verify, hand off to `azure-prepare` — it reads `.azure/project-plan.md` Section 4a."

## Hand-Off Contract

When ready to deploy (after `azure-local-debug`):

1. `azure-prepare` reads `.azure/project-plan.md` (Sections 4 + 4a)
2. Runtime Essentials + included Baseline + User-Selected become its initial service inventory — no re-asking
3. `azure-prepare` honors explicit "No" choices — do NOT silently re-add opted-out services
4. `azure-prepare` runs Phase 1 quota/region/policy checks then generates `.azure/deployment-plan.md` + IaC

> `azure-prepare` still prompts for subscription/location and may add baseline supporting services per its own rules — only with user confirmation.

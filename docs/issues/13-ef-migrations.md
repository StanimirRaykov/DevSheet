title: Replace EnsureCreated() with EF Core migrations
labels: tech-debt
milestone: M2 Later
---
**Branch:** `13-ef-migrations`  |  **Depends on:** none (do before any deployment)

## Scope
Install the `dotnet-ef` tool, create the initial migration from the current model, remove `EnsureCreated()`, apply migrations at startup in Development only (explicit step in production). Document in README. Add a CI step that fails if the model has pending changes without a migration.

## Tests
A migrated database matches the model (`dotnet ef migrations has-pending-model-changes` in CI).

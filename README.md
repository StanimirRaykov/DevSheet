# DevSheet

A portfolio and CV platform for software engineers: syncs from GitHub, maps skills to projects,
and generates CVs from one user-confirmed source of truth.

## Architecture

```
Next.js (web/)  ──HTTP/cookie──▶  ASP.NET Core API (api/)  ──▶  PostgreSQL
                                        │
                                        └──▶ GitHub API (Octokit, server-side only)
```

API layers: `Domain` (entities) ← `Application` (interfaces) ← `Infrastructure` (EF Core, GitHub, token
encryption) ← `Api` (controllers, auth).

Key design decisions
- **Two data layers.** `GithubRepo` is a read-only synced copy; `Project` is the user-owned layer that survives re-sync.
- **Approve-first.** Newly synced repos are `Pending` and never public until the user approves them.
- **Rejected skill links are kept**, so dismissed suggestions are not proposed again.
- **GitHub tokens are encrypted at rest** (ASP.NET Data Protection) and never sent to the browser.
- **Public pages read stored data only** and never call GitHub.
- **LinkedIn:** no API access; planned as a one-time import of the user's own data export (CSV).

## Run locally

Prerequisites: .NET 8 SDK, Node 20+, PostgreSQL (Docker or local).

1. Database: `docker compose up -d` (or point `ConnectionStrings:Default` at your own Postgres).
2. Register a GitHub OAuth app (Settings → Developer settings → OAuth Apps):
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:5217/signin-github`
3. API secrets (never commit these):
   ```bash
   cd api/src/DevSheet.Api
   dotnet user-secrets set "Authentication:GitHub:ClientId" "<id>"
   dotnet user-secrets set "Authentication:GitHub:ClientSecret" "<secret>"
   dotnet run        # http://localhost:5217 (Swagger at /swagger)
   ```
4. Web:
   ```bash
   cd web && npm install && npm run dev   # http://localhost:3000
   ```

Dev note: tables are created with `EnsureCreated()` for the demo; switch to EF migrations before deploying.

## Status
- [x] Skeleton: layered API, Next.js app, schema, GitHub login + repo sync, approve/hide, public page
- [ ] Skills detect / suggest / confirm
- [ ] Work history + education forms
- [ ] CV PDF (modern IT template), then Europass-style
- Cut for now: custom domains, payments, live-demo iframes, per-job CV tailoring (future work)

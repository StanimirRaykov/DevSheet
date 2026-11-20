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
- **Accounts stand on their own.** A DevSheet account can have several sign-in methods (GitHub now; Google and Apple
  planned) and, separately, one connected GitHub account that repositories sync from. Accounts are never matched by
  email; a second sign-in method is added only while signed in (`GET /auth/link/{provider}`), and the last one cannot
  be removed. Disconnecting GitHub deletes its token and keeps the synced projects.
- **Two data layers.** `GithubRepo` is a read-only synced copy; `Project` is the user-owned layer that survives re-sync.
- **Approve-first.** Newly synced repos are `Pending` and never public until the user approves them.
- **Rejected skill links are kept**, so dismissed suggestions are not proposed again.
- **GitHub tokens are encrypted at rest** (ASP.NET Data Protection) and never sent to the browser.
- **Public pages read stored data only** and never call GitHub.
- **LinkedIn:** no API access; planned as a one-time import of the user's own data export (CSV).

## Run locally

Prerequisites: .NET 8 SDK, Node 20+, PostgreSQL (Docker or local).

1. Database: `docker compose up -d db` (or point `ConnectionStrings:Default` at your own Postgres).
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

In Development the API applies EF Core migrations on start, so the database is always up to date.

## Run with Docker

The whole platform (database, API, web) with only Docker installed:

```bash
cp .env.example .env      # fill in GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (same OAuth app as above)
docker compose up --build # web http://localhost:3000, API http://localhost:5217
```

- Start order: `db` (healthy), then `migrate` (applies migrations and seeds skills, then exits), then `api` (healthy at `/health`), then `web`.
- The API runs as Production inside Docker: no Swagger, and it does not migrate on start; the `migrate` service does that.
- Data Protection keys live in the `dpkeys` volume, so `docker compose restart api` keeps you logged in and stored GitHub tokens stay readable.
- `NEXT_PUBLIC_API_URL` is baked into the web image at build time (the browser uses it). Rebuild the `web` image if it changes.
- Daily development stays on the host with hot reload; `docker compose up -d db` starts only the database.
- `docker compose down` stops everything; add `-v` to also delete the database and the keys.

## Database

ER diagram and design notes: [`docs/DATABASE.md`](docs/DATABASE.md). Full DDL: [`docs/schema.sql`](docs/schema.sql) (generated from the EF model and checked by a test).

Schema changes go through EF Core migrations (`api/src/DevSheet.Infrastructure/Persistence/Migrations`). From the `api/` folder:
```bash
dotnet tool restore                                     # installs dotnet-ef (pinned in .config/dotnet-tools.json)
dotnet ef migrations add <Name> --project src/DevSheet.Infrastructure --startup-project src/DevSheet.Api --output-dir Persistence/Migrations
UPDATE_SCHEMA=1 dotnet test --filter SchemaScriptTests  # refresh docs/schema.sql
```
Production never migrates on start. Apply migrations as a separate step before starting the new version:
```bash
dotnet DevSheet.Api.dll --migrate                       # applies migrations, seeds skills, exits
```
A test and a CI step fail when the model changes without a migration.

## Tests and CI

```bash
cd api && dotnet test                                   # xUnit (SQLite in-memory, no Postgres needed)
cd web && npm run lint && npm run typecheck && npm test && npm run build
```
GitHub Actions (`.github/workflows/ci.yml`) runs both on every push and pull request.
The backlog lives in `docs/BACKLOG.md` and `docs/issues/` (detailed issues, created with `scripts/create-issues.sh`); workflow in `CONTRIBUTING.md`.

## Status
- [x] Skeleton: layered API, Next.js app, schema, GitHub login + repo sync, approve/hide, public page
- [x] Skills detect / suggest / confirm, public skills matrix
- [x] Profile, work history and education forms
- [x] CV PDF (modern IT template) and a "Europass-style" PDF; languages with CEFR levels and certifications
- [ ] Europass Candidate XML export (importable into the Europass editor), see [`docs/EUROPASS.md`](docs/EUROPASS.md)
- Cut for now: custom domains, payments, live-demo iframes, per-job CV tailoring (future work)
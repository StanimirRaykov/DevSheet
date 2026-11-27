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
- **Accounts stand on their own.** A DevSheet account signs in with an email and password, with Google, or both
  (Apple planned). GitHub never signs in: it is only connected, from onboarding or Settings, so repositories can sync.
  Accounts are never matched by email; a second sign-in method is added only while signed in (`GET /auth/link/{provider}`,
  or a password from Settings), and the last way in cannot be removed. Disconnecting GitHub deletes its token and keeps
  the synced projects.
- **Email and password** (`/auth/register`, `/auth/confirm-email`, `/auth/sign-in`, `/auth/resend-confirmation`,
  `/auth/forgot-password`, `/auth/reset-password`; Settings: `GET`/`POST /api/me/password`). A password signs in only after
  its email link is opened. Links are single-use and stored only as hashes; confirm links last 24 hours, reset links 1 hour.
  Answers never reveal whether an email has an account. Passwords are hashed with ASP.NET Identity's PBKDF2 hasher; a
  reset or a change signs out every other session. Sign-in and email endpoints are rate limited per IP address and per
  email (`Auth:RateLimits`).
- **Two data layers.** `GithubRepo` is a read-only synced copy; `Project` is the user-owned layer that survives re-sync.
- **Approve-first.** Newly synced repos are `Pending` and never public until the user approves them.
- **Rejected skill links are kept**, so dismissed suggestions are not proposed again.
- **GitHub tokens are encrypted at rest** (ASP.NET Data Protection) and never sent to the browser.
- **Public pages read stored data only** and never call GitHub.
- **LinkedIn:** no API access; planned as a one-time import of the user's own data export (CSV).

## Run locally

Prerequisites: .NET 8 SDK, Node 20+, PostgreSQL (Docker or local).

1. Database and mail catcher: `docker compose up -d db mailpit` (or point `ConnectionStrings:Default` at your own
   Postgres). Every email the API sends (confirm address, reset password) lands in Mailpit at
   http://localhost:8025 instead of being delivered.
2. Optional, for connecting GitHub (repository sync): register a GitHub OAuth app (Settings → Developer settings →
   OAuth Apps). Accounts themselves need no provider: sign up with an email and password.
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:5217/signin-github`
3. Optional, for "Continue with Google": in the Google Cloud console create an OAuth client
   (APIs & Services > Credentials > Create credentials > OAuth client ID, type "Web application"):
   - Authorised redirect URI: `http://localhost:5217/signin-google`
   - OAuth consent screen: "Testing", with your own Google account as a test user; scopes `openid`, `email`,
     `profile` only.
4. API secrets (never commit these):
   ```bash
   cd api/src/DevSheet.Api
   dotnet user-secrets set "Authentication:GitHub:ClientId" "<id>"
   dotnet user-secrets set "Authentication:GitHub:ClientSecret" "<secret>"
   dotnet user-secrets set "Authentication:Google:ClientId" "<id>"         # optional
   dotnet user-secrets set "Authentication:Google:ClientSecret" "<secret>" # optional
   dotnet run        # http://localhost:5217 (Swagger at /swagger)
   ```
   A provider without both values is left out of `GET /auth/providers`, so the login page only shows buttons that work.
5. Web:
   ```bash
   cd web && npm install && npm run dev   # http://localhost:3000
   ```

In Development the API applies EF Core migrations on start, so the database is always up to date.

## Run with Docker

The whole platform (database, API, web) with only Docker installed:

```bash
cp .env.example .env      # fill in the GitHub (and optionally Google) client id and secret, same apps as above
docker compose up --build # web http://localhost:3000, API http://localhost:5217
```

- Start order: `db` (healthy), then `migrate` (applies migrations and seeds skills, then exits), then `api` (healthy at `/health`), then `web`.
- The API runs as Production inside Docker: no Swagger, and it does not migrate on start; the `migrate` service does that.
- Data Protection keys live in the `dpkeys` volume, so `docker compose restart api` keeps you logged in and stored GitHub tokens stay readable.
- `NEXT_PUBLIC_API_URL` is baked into the web image at build time (the browser uses it). Rebuild the `web` image if it changes.
- Emails go to Mailpit (http://localhost:8025). For a real provider set the `EMAIL_SMTP_*` and `EMAIL_FROM` values in `.env`
  (sending from your own address needs a domain).
- Daily development stays on the host with hot reload; `docker compose up -d db mailpit` starts only the database and the mail catcher.
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
The same step creates the public example page `/demo` (a fictional developer the landing page links to) if it is
missing. Set `Demo:Seed=false` to skip it. `demo` is a reserved slug, so no real account can take the address.
A test and a CI step fail when the model changes without a migration.

## Tests and CI

```bash
cd api && dotnet test                                   # xUnit (SQLite in-memory, no Postgres needed)
cd web && npm run lint && npm run typecheck && npm test && npm run build
cd web && npm run e2e                                   # Playwright + axe (needs docker compose up -d db mailpit)
```
GitHub Actions (`.github/workflows/ci.yml`) runs all three on every push and pull request (end-to-end as its own job).
Details of the end-to-end setup, the accessibility checks and the Lighthouse results: [`docs/TESTING.md`](docs/TESTING.md).
The backlog lives in `docs/BACKLOG.md` and `docs/issues/` (detailed issues, created with `scripts/create-issues.sh`); workflow in `CONTRIBUTING.md`.

## Status
- [x] Skeleton: layered API, Next.js app, schema, GitHub login + repo sync, approve/hide, public page
- [x] Skills detect / suggest / confirm, public skills matrix
- [x] Profile, work history and education forms
- [x] CV PDF (modern IT template) and a "Europass-style" PDF; languages with CEFR levels and certifications
- [x] Accounts with email and password or Google; GitHub only connects for repository sync
- [ ] Sign in with Apple, LinkedIn data import
- [ ] Europass Candidate XML export (importable into the Europass editor), see [`docs/EUROPASS.md`](docs/EUROPASS.md)
- Cut for now: custom domains, payments, live-demo iframes, per-job CV tailoring (future work)
title: Docker: containers for API and web, full stack with one command
labels: tech-debt
milestone: M3 Platform UI
---
**Branch:** `42-docker-full-stack`  |  **Estimate:** 4-5 h  |  **Depends on:** #13 (migrations) recommended first, so the API container can create and update its own schema.

## Context
`docker-compose.yml` runs only PostgreSQL; the API and the web app run on the host (`dotnet run`, `npm run dev`). A new machine (the Windows laptop, the lecturer, a deployment in #16) needs .NET, Node and manual steps. With a container per service, the whole platform starts with `docker compose up`.

## Decision
- **Yes: one container per service** (`db`, `api`, `web`). They build, scale and deploy separately, and #16 can reuse the images.
- **Daily development stays on the host** with hot reload (`dotnet watch`, `next dev`) and only `db` in Docker. Containers are for "run the whole thing", demos, CI and deployment, not for editing code.
- Production-like images (multi-stage, small, non-root). No dev-server containers.

## Scope
In: `api/Dockerfile`, `web/Dockerfile`, `.dockerignore` files, full `docker-compose.yml`, `.env.example`, persisted Data Protection keys, health checks, README section, CI job that builds both images.
Out: HTTPS, reverse proxy, registry push and hosting (#16).

## API image (`api/Dockerfile`)
- Multi-stage: `mcr.microsoft.com/dotnet/sdk:8.0` restores (copy `*.csproj` first for layer caching), publishes `-c Release`; runtime `mcr.microsoft.com/dotnet/aspnet:8.0`.
- Runs as the non-root `app` user; listens on `8080` (`ASPNETCORE_HTTP_PORTS=8080`).
- `GET /health` endpoint (ASP.NET health checks, including the database) for the compose health check.
- **Data Protection keys must survive restarts.** Today `AddDataProtection()` keeps keys in memory or the user profile; in a container they are lost on restart, which logs everyone out **and makes every stored GitHub token undecryptable**. Persist keys to a volume (`PersistKeysToFileSystem("/keys")`, path from config) with a fixed `SetApplicationName("DevSheet")`.
- Schema: after #13, apply migrations at startup only when `Database:MigrateOnStartup=true` (set in compose). Before #13, compose runs with `ASPNETCORE_ENVIRONMENT=Development` so `EnsureCreated()` still works; note this in the README.

## Web image (`web/Dockerfile`)
- `output: "standalone"` in `next.config.ts`.
- Multi-stage on `node:22-alpine`: `npm ci`, `npm run build`, runtime copies `.next/standalone`, `.next/static` and `public`; runs `node server.js` as non-root on `3000`.
- **`NEXT_PUBLIC_API_URL` is baked in at build time** (it is used in the browser), so it is a build argument. `API_URL` (server-side rendering) is a runtime variable pointing to the internal address `http://api:8080`.

## `docker-compose.yml`
| Service | Image | Ports (host:container) | Notes |
|---|---|---|---|
| `db` | `postgres:16` | `5432:5432` | volume `pgdata`; health check `pg_isready` |
| `api` | build `./api` | `5217:8080` | `depends_on: db (healthy)`; `ConnectionStrings__Default=Host=db;...`; secrets from `.env`; volume `dpkeys:/keys`; health check `/health` |
| `web` | build `./web` | `3000:3000` | `depends_on: api (healthy)`; build arg `NEXT_PUBLIC_API_URL=http://localhost:5217`; env `API_URL=http://api:8080` |

- Host ports stay **5217** and **3000**, so the GitHub OAuth callback (`http://localhost:5217/signin-github`), `WebOrigin` (CORS) and the cookies work unchanged.
- `docker compose up db` still starts only the database for daily development.
- Restart policy `unless-stopped`.

## Secrets
- Containers cannot read .NET user-secrets. Use a **git-ignored `.env`** in the repo root, read by compose: `Authentication__GitHub__ClientId`, `Authentication__GitHub__ClientSecret` (later Google, #30).
- Commit `.env.example` with empty values and comments. Check `.gitignore` covers `.env`.
- Database password from `.env` as well (default `devsheet` only for local use).

## CI
New job "Docker (build images)": `docker compose build` on pull requests, no push. Optional: a smoke test that starts the stack and checks `/health` and the home page return 200.

## Tests
- `/health` returns 200 when the database is up and 503 when it is not (integration test).
- Data Protection: a token protected, then unprotected by a new service provider using the same key directory, round-trips (test with a temp directory).
- CI smoke test above.

## Acceptance criteria
- [ ] On a clean machine with only Docker installed: copy `.env.example` to `.env`, fill the GitHub secrets, `docker compose up --build`, open `http://localhost:3000`, log in with GitHub, sync, download a CV.
- [ ] `docker compose restart api` keeps me logged in and sync still works (keys persisted).
- [ ] README has a "Run with Docker" section next to the existing local instructions.
- [ ] CI builds both images.

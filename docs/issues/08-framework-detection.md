title: Detect frameworks and tools from manifest files
labels: feature
milestone: M2 Later
---
**Branch:** `08-framework-detection`  |  **Depends on:** 01

## Context
Languages are not skills. Manifests reveal frameworks (React, Next.js, ASP.NET Core, Express, Django) and tools (Docker, GitHub Actions).

## Scope
Parse via the GitHub contents API (root + one level deep, capped): `package.json` (dependencies/devDependencies), `*.csproj` (PackageReference / TargetFramework / SDK), `requirements.txt` / `pyproject.toml`, `pom.xml` / `build.gradle`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/*`.
Map dependency names to canonical skills through the alias table. Produce `Suggested` links only.

## Design notes
- Extend `IGitHubRepoSource` with a method returning manifest file contents so the logic stays testable without network calls.
- Cost control: one extra request per manifest per repo; respect ETags (issue 10) and the existing sync cap.

## Tests
Fixture manifests per ecosystem; dependency-to-skill mapping; unknown packages ignored; malformed manifest does not fail the whole sync.

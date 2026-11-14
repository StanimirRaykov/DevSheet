title: Deployment and CD pipeline
labels: tech-debt
milestone: M2 Later
---
**Branch:** `16-deployment-cd`  |  **Depends on:** 13

## Scope
Choose hosting for the API, the web app and managed Postgres; production GitHub OAuth app (separate from dev); secrets in the host's secret store and GitHub Actions secrets; deploy workflow on merge to `main` after CI passes; HTTPS and cookie settings (`Secure`, SameSite review for cross-site setup); health check endpoint; backups.

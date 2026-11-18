# Backlog

The detailed, ready-to-create issues live in [`docs/issues/`](issues/), one file per issue
(title, labels, milestone, context, scope, design, tests, acceptance criteria).
Create them on GitHub with `scripts/create-issues.sh` (preview with `DRY_RUN=1`).
Workflow: see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

| # | Issue | Milestone |
|---|-------|-----------|
| 01 | Skills: detect suggested skills from language data | M1 |
| 02 | Skills: confirm / reject / add + public matrix | M1 |
| 03 | Profile, work experience, education | M1 |
| 04 | CV export: modern PDF | M1 |
| 05 | CV export: Europass-style PDF | M1 |
| 06 | Wednesday demo preparation | M1 |
| 07 | LinkedIn data-export import | M2 |
| 08 | Framework detection from manifests | M2 |
| 09 | ESCO taxonomy mapping | M2 |
| 10 | ETag conditional requests | M2 |
| 11 | Expiring GitHub token refresh | M2 |
| 12 | Slug rules and redirects | M2 |
| 13 | EF Core migrations | M2 |
| 14 | Per-application CV tailoring | M2 |
| 15 | Paid tier and payments | M2 |
| 16 | Deployment / CD | M2 |
| 17 | README-rendered project pages | M2 |
| 18 | Thesis: survey write-up | M2 |
| 25 | CV export: Europass Candidate XML ([`europass-candidate-xml-export.md`](issues/europass-candidate-xml-export.md)) | M2 |

### M3 Platform UI

Turns DevSheet from a CV tool into a full platform: landing page, own login (GitHub, Google, Apple), settings,
onboarding, one page per area, and a minimal design with motion. Agreed order: 26, 27, 13 (migrations), 42 (Docker), 29, 28, 30, 32, 33, then the pages 39, 35, 36, 37, 34, 38;
25 (Europass XML) whenever the editor test is done; 40 last; 31 (Apple) only when a domain exists.

| # | Issue | Depends on |
|---|-------|-----------|
| 26 | UI foundation: design tokens, base components, motion | none |
| 27 | Route structure, app shell, navigation | 26 |
| 28 | Landing page, about, privacy, terms | 26, 27 |
| 29 | Accounts independent of GitHub (multi-provider) | 13 |
| 30 | Login page with GitHub and Google | 27, 28, 29 |
| 31 | Sign in with Apple | 30, 16 |
| 32 | Settings (account, connections, public page, delete) | 27, 29 |
| 33 | Onboarding flow | 29, 32 |
| 34 | Dashboard overview | 27 |
| 35 | Projects page | 27 |
| 36 | Skills page | 27 |
| 37 | Profile and career pages | 26, 27 |
| 38 | CV page (templates, preview, export) | 27 |
| 39 | Public profile redesign | 26 |
| 40 | Polish, accessibility, end-to-end tests | all M3 |
| 42 | Docker: API and web containers, full stack | 13 |

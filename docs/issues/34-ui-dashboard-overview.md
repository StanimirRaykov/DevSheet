title: UI: dashboard overview page
labels: feature
milestone: M3 Platform UI
---
**Branch:** `34-ui-dashboard-overview`  |  **Estimate:** 4 h  |  **Depends on:** #27

## Context
`/dashboard` currently holds everything: sync, the repo list, skills per repo and publish. Once projects and skills get their own pages (#35, #36), the dashboard becomes a short overview that says what to do next.

## Scope
In: overview page, completeness score, summary endpoint.
Out: the project and skill lists themselves.

## Content
- Greeting with the display name; public page status (Published / Draft) with a link.
- **Profile completeness** (0-100 %) with the missing items as links: headline, summary, at least one experience, one education, one language, 3 confirmed skills, 3 visible projects, GitHub connected, published.
- **Needs your attention:** pending repos count (to Projects), suggested skills count (to Skills).
- **GitHub:** last synced ("2 hours ago"), "Sync now".
- **Quick actions:** Download CV, View public page, Edit profile.
- Skeletons while loading; numbers animate in.

## API
`GET /api/me/summary` returns the counts and flags in one call (no N calls from the page). Owner only.

## Tests
- Completeness function (pure TypeScript in `web/src/lib/`): empty profile 0 %, full profile 100 %, each item weighted as documented.
- `GET /api/me/summary` counts only the user's own data; anonymous returns 401.
- Relative time helper ("just now", "5 minutes ago", "yesterday").

## Acceptance criteria
- [ ] The overview loads with one API call and links to every page that needs work.

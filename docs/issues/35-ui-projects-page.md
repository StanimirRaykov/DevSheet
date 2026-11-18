title: UI: projects page (review, approve, hide)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `35-ui-projects-page`  |  **Estimate:** 5 h  |  **Depends on:** #27

## Context
Approving and hiding repos happens in one long list on the dashboard, reloading everything after each click. With many repos it is slow and hard to scan.

## Scope
In: `/dashboard/projects`, filters, search, bulk actions, optimistic updates, project detail panel.
Out: skill editing (the panel links to Skills, #36), README rendering (#17).

## Design
- Tabs **Pending / Visible / Hidden** with counts; Pending is the default when it is not empty.
- Search by name; sort by stars, last updated, name.
- Project card: title, description, language bar (top languages), stars, last updated, "source missing" badge, Approve / Hide.
- **Bulk:** select several, Approve selected / Hide selected.
- **Optimistic update:** the card moves to its new tab immediately with a layout animation; on API failure it moves back and a toast explains.
- Detail panel (side sheet): full description, languages, linked skills, link to GitHub.
- Empty states per tab ("No pending repos. Sync to check for new ones.").

## API
- Reuse `PATCH /api/me/projects/{id}/status`.
- Add `PATCH /api/me/projects/status` for bulk (list of ids + status), applied in one transaction, only for the caller's projects (others ignored or 404, decide and test).

## Tests
- Bulk endpoint: updates only the caller's projects; invalid status rejected; anonymous 401.
- Filter, search and sort helpers (pure functions).
- Optimistic update rolls back on failure (component test with a mocked fetch).

## Acceptance criteria
- [ ] I can review 20+ repos quickly with filters and bulk actions.
- [ ] Hidden and pending repos never appear on the public page (existing tests still pass).

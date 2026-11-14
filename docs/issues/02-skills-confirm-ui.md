title: Skills: confirm / reject / add manually, and public skills matrix
labels: feature
milestone: M1 Wednesday demo
---
**Branch:** `02-skills-confirm-ui`  |  **Estimate:** 4-5 h  |  **Depends on:** 01

## Context
The user is the source of truth. Suggestions from issue 01 are only visible to the owner; the public page shows only `Confirmed` links. The "matrix" is the mapping skill -> projects where it was used.

## Scope
In: owner API + dashboard UI to confirm/reject/add skills per project; public API + page showing confirmed skills per project and a skills summary.
Out: skill levels/years (later), skills on work experience (later).

## API (all under `[Authorize]`, ownership enforced)
- `GET /api/me/projects` : extend each project with `skills: [{ skillId, name, status }]`.
- `PATCH /api/me/projects/{projectId}/skills/{skillId}` body `{ status: Confirmed | Rejected }`. 404 if the project is not the caller's.
- `POST /api/me/projects/{projectId}/skills` body `{ name }`: adds a `Confirmed` link. Name normalized (trim, case-insensitive); if it matches a canonical skill or alias use it, otherwise create a custom `Skill` (no ESCO URI).
- `GET /api/me/skills?query=` : autocomplete over canonical skills.
- `GET /api/public/{slug}` : each visible project includes confirmed skills only; response also includes `skills: [{ name, projects: [title...] }]` (the matrix), sorted by project count desc.

## UI
- Dashboard: under each project a chip row. `Suggested` chips have Confirm / Reject buttons; `Confirmed` chips have a remove (= Reject) button; an "Add skill" input with autocomplete.
- Public page: skills summary section (skill with project count) + confirmed chips on each project card.

## Tests
- Public endpoint never contains `Suggested` or `Rejected` skills (assert on serialized JSON).
- A user cannot change or add skills on another user's project (expect 404/Forbid), for both PATCH and POST.
- Adding an existing skill by alias does not create a duplicate `Skill`.
- Matrix aggregation: skill used by 2 visible projects reports both; a hidden/pending project's skills are excluded.
- Web: unit test for a pure helper that groups skills for display.

## Acceptance criteria
- [ ] I can confirm, reject and manually add skills on the dashboard and the state survives a re-sync.
- [ ] The public page shows only confirmed skills and a correct matrix.
- [ ] Ownership tests pass.

title: Profile, work experience and education (forms + public page)
labels: feature
milestone: M1 Wednesday demo
---
**Branch:** `03-profile-experience-education`  |  **Estimate:** 5-6 h  |  **Depends on:** none (can run parallel to 01/02)

## Context
GitHub cannot provide employers, titles, dates or education, and LinkedIn has no readable API. This is the manual path; the LinkedIn export import (issue 07) later writes into the same tables.

## Scope
In: CRUD for `Profile` (full name, headline, summary, location, email), `WorkExperience`, `Education`; dashboard forms; render on the public page when published.
Out: skills linked to work experience, languages, certifications (issue 05), CSV import (issue 07).

## API (owner only)
- `GET/PUT /api/me/profile` (upsert, one per user).
- `GET/POST /api/me/experience`, `PUT/DELETE /api/me/experience/{id}`; same for `/education`.
- `GET /api/public/{slug}` returns profile, experience (newest first) and education when published.

## Validation rules
- Company/title/institution required, max 200 chars; description max 2000.
- `StartDate` required for experience; `EndDate` null means "present"; `EndDate >= StartDate`.
- Email must be a valid address if provided. Return 400 with field messages.

## Privacy
Email and location are **opt-in public**: add `ShowEmailPublicly` / `ShowLocationPublicly` (default false) so the public page never leaks them by accident. The CV (issue 04) may include them because the user exports it deliberately.

## Tests
- Ownership: user A cannot read, update or delete user B's entries (all verbs).
- Validation: end before start is rejected; missing required fields rejected.
- Public endpoint omits email/location unless the flags are set.
- Ordering: experience returned newest first; null end date sorts as current.

## Acceptance criteria
- [ ] I can enter my profile, add/edit/delete experience and education on the dashboard.
- [ ] The public page shows them (respecting the privacy flags).
- [ ] Tests above pass in CI.

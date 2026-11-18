title: UI: settings page (account, connections, public page, delete account)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `32-ui-settings`  |  **Estimate:** 6-7 h  |  **Depends on:** #27, #29

## Context
There is no settings page. Sync and publish are buttons on the dashboard, the slug cannot be changed, and an account cannot be deleted. With accounts independent of GitHub (#29), GitHub is connected and synced from here.

## Scope
In: `/settings` with four tabs, the API endpoints they need.
Out: slug validation rules themselves (#12, reused here), billing (cut).

## Tabs
1. **Account:** display name, email (contact, not a login), avatar (from a provider, or initials), theme (light / dark / system).
2. **Sign-in and connections:**
   - Sign-in methods: GitHub, Google, Apple, each "Connected" with an Unlink button (disabled for the last one) or a Link button (`/auth/link/{provider}`).
   - GitHub data connection: connected account (`@login`, avatar), "Sync now" with progress, last synced time, "Disconnect GitHub" (confirm dialog explaining the repos stay but stop updating).
3. **Public page:** slug with live availability check and preview URL, Publish toggle, privacy toggles (show email, show location), "View public page" link.
4. **Danger zone:** delete account. Confirm dialog; the user types their slug to enable the button.

## API
- `GET /api/me/account`, `PATCH /api/me/account` (display name, email; validated).
- `GET /api/me/logins` (linked providers).
- `GET /api/me/slug-available?slug=...`, `PATCH /api/me/slug` (rules from #12).
- `DELETE /api/me`: deletes the user and **all** their data in one transaction, revokes nothing at GitHub (token is simply deleted; tell the user they can revoke the app in GitHub settings), signs out.

## Rules
- Every change shows a toast on success and the field error on failure.
- Unsaved changes warn before leaving the tab.

## Tests
- `PATCH /api/me/account` validation (email format, name length).
- Slug: reserved, taken and invalid slugs rejected; available slug accepted.
- `DELETE /api/me` removes every row owned by the user (profile, repos, projects, skills links, experience, education, languages, certifications, logins, connection) and nothing of another user.
- Anonymous calls return 401.

## Acceptance criteria
- [ ] I can sync, disconnect and reconnect GitHub from Settings.
- [ ] I can change my slug and the public page moves to the new URL.
- [ ] Deleting the account removes everything and signs me out.

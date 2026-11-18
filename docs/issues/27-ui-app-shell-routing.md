title: UI: route structure, app shell and navigation
labels: feature
milestone: M3 Platform UI
---
**Branch:** `27-ui-app-shell-routing`  |  **Estimate:** 5-6 h  |  **Depends on:** #26

## Context
Today there are four pages (`/`, `/dashboard`, `/dashboard/profile`, `/[slug]`) and each one checks login on its own in client code. The platform needs separate areas (public site, login, logged-in app) with a shared layout and navigation. The page title is still "Create Next App".

## Scope
In: route groups and layouts, auth guard, app navigation, user menu, page metadata, reserved slugs for the new routes. Existing page content moves into the new structure mostly unchanged.
Out: redesigning the content of each page (later issues).

## Routes
| Group | Routes | Layout |
|---|---|---|
| `(marketing)` | `/`, `/about`, `/privacy`, `/terms` | Top nav + footer |
| `(auth)` | `/login` | Centred card, no nav |
| `(app)` | `/welcome`, `/dashboard`, `/dashboard/projects`, `/dashboard/skills`, `/dashboard/profile`, `/dashboard/cv`, `/settings` | Sidebar (desktop), drawer (mobile), user menu |
| public | `/[slug]` | Own minimal layout |

New routes may be empty placeholder pages ("Coming soon" with `EmptyState`) until their issue is done.

## Design
- **Auth guard:** the `(app)` layout calls `GET /api/me` on the server, forwarding the request cookie. 401 redirects to `/login?next=<path>`. One shared `getMe()` (server) and `useMe()` (client), replacing the per-page `fetch` + `"anon"` state.
- `next` must be a relative path that starts with `/` and not `//` (no open redirect). Unit-test the check.
- **Sidebar:** Overview, Projects, Skills, Profile, CV, Settings, with icons; the active item is highlighted. Collapses to a drawer below `md`.
- **User menu** (Avatar + DropdownMenu): View public page, Settings, Theme, Sign out (`POST /auth/logout`, then go to `/`).
- **Metadata:** root `title.template` `"%s · DevSheet"`, a real description, favicon kept. Every page sets its own title.
- **Reserved slugs:** every top-level route name (`login`, `welcome`, `dashboard`, `settings`, `about`, `privacy`, `terms`, `dev`, `api`, `auth`, ...) must be blocked as a public slug. Keep one list in the API (used by #12) and a copy in the web app; a test fails if a folder in `web/src/app` is not in the list.

## Tests
- `next` parameter validation: `/dashboard` allowed; `//evil.com`, `https://evil.com`, `javascript:` rejected.
- Reserved slug test above.
- Navigation: active item matches the current path (unit test on the helper).

## Acceptance criteria
- [ ] Logged out, any `(app)` route redirects to `/login` and comes back after login.
- [ ] The sidebar works on desktop and as a drawer on a phone-width screen.
- [ ] Sign out works from the user menu.
- [ ] Every page has a proper title in the browser tab.
- [ ] Existing features (sync, approve, skills, profile, CV download, public page) still work.

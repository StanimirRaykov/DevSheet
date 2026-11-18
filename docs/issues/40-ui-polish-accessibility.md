title: UI: polish pass (loading/error states, animations, accessibility, end-to-end tests)
labels: feature,accessibility
milestone: M3 Platform UI
---
**Branch:** `40-ui-polish-accessibility`  |  **Estimate:** 6 h  |  **Depends on:** the other M3 issues (do this last)

## Context
After the pages are rebuilt, one pass makes the whole platform consistent: every page loads, fails and animates the same way, works with a keyboard and a screen reader, and the main journeys are covered by end-to-end tests.

## Scope
In: shared loading/error/not-found pages, animation consistency, accessibility audit and fixes, responsive check, Playwright smoke tests.
Out: new features.

## Checklist
- **States:** `loading.tsx`, `error.tsx` (with retry) and `not-found.tsx` for each route group; every list has an empty state; every action has a pending state.
- **Motion:** page transitions and list animations use only the #26 presets; nothing animates with reduced motion on; no layout shift while loading (skeletons match the final size).
- **Accessibility:** keyboard-only run through every page (visible focus ring, logical order, no traps); labels on every input and icon button; colour contrast AA in both themes; headings in order; `lang` set; announcements for toasts (`aria-live`).
- **Responsive:** check 360, 768, 1280 px on every page; no horizontal scroll.
- **Performance:** Lighthouse at least 90 on landing, login and a public profile.

## End-to-end tests (Playwright)
- Public: landing page loads, navigation links work, a seeded public profile renders, unknown slug shows 404.
- Logged in: use a **test-only sign-in** that exists only when the API runs in the `Testing` environment (never in Development or Production; a test asserts it returns 404 otherwise). Journey: sign in, sync stubbed, approve a project, confirm a skill, add an experience, download a CV.
- Automated accessibility check (`@axe-core/playwright`) on every page: no serious or critical violations.
- Run in CI as a separate job.

## Acceptance criteria
- [ ] Checklist above done, issues found are fixed or filed.
- [ ] Playwright job green in CI.

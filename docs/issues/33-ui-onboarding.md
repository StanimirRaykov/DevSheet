title: UI: onboarding flow for new accounts
labels: feature
milestone: M3 Platform UI
---
**Branch:** `33-ui-onboarding`  |  **Estimate:** 4-5 h  |  **Depends on:** #29, #32 (reuses the connection and sync parts)

## Context
A new user lands on an empty dashboard with a sync button and no guidance. A short guided start gets them to a useful profile in a few minutes.

## Scope
In: `/welcome` step flow, redirect after first sign-in, "completed" flag.
Out: product tours or tooltips on later pages.

## Steps
1. **About you:** display name, headline (prefilled from the provider when possible).
2. **Connect GitHub:** "Connect GitHub" button, or "Skip for now" (Google/Apple users). Already connected (signed in with GitHub): skipped automatically.
3. **First sync:** progress indicator while `POST /api/me/sync` runs, then the number of repos found.
4. **Review repos:** the pending repos as a checklist with "Approve selected"; nothing is public yet, and the page says so.
5. **Done:** links to Skills, Profile and the public page; "Go to dashboard".

## Design
- Progress bar with step names; Back and Next; step transitions with the slide preset (off with reduced motion).
- Each step saves on Next, so leaving halfway keeps the progress.
- `POST /api/me/onboarding/complete` sets `User.OnboardingCompletedAt`. Until it is set, sign-in redirects to `/welcome`; after that, never again. "Skip onboarding" is always available.
- A sync error shows a retry button and does not block the rest of the flow.

## Tests
- Redirect rule: new account goes to `/welcome`, completed account goes to `/dashboard` (unit test on the decision function).
- `POST /api/me/onboarding/complete` sets the timestamp and is idempotent; anonymous returns 401.
- Step 2 is skipped when a GitHub connection exists.

## Acceptance criteria
- [ ] A new Google account and a new GitHub account each reach a filled dashboard through the flow.
- [ ] Leaving and returning resumes at the right step.

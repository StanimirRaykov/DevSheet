title: Auth: login page with GitHub and Google sign-in
labels: feature,security
milestone: M3 Platform UI
---
**Branch:** `30-auth-login-google`  |  **Estimate:** 4-5 h  |  **Depends on:** #27, #29, #28 (privacy and terms pages, needed by Google)

## Context
Sign-in is a single "Continue with GitHub" link on the home page. The platform needs its own login page and a second provider for people who do not want to start from GitHub.

## Scope
In: `/login` page, Google OAuth on the API, sign-up and sign-in with Google, error handling, post-login redirect.
Out: Apple (#31), email/password accounts (not planned: no password storage to secure).

## Setup (project owner, manual)
- Google Cloud console: create an OAuth client (Web application). Authorised redirect URI `http://localhost:5217/signin-google`. Consent screen in "Testing" mode with your own account added as a test user. Scopes: `openid`, `email`, `profile` only.
- Secrets in user-secrets: `Authentication:Google:ClientId`, `Authentication:Google:ClientSecret`. Never committed. Add them to `README.md` and `.env`/secret docs.

## API
- `Microsoft.AspNetCore.Authentication.Google` (pin the version matching .NET 8).
- `GET /auth/google?returnUrl=...` challenges Google; on success finds or creates the account through the #29 logic.
- Same placeholder pattern as GitHub so the API boots without the secrets; the login page hides a provider whose secrets are missing (`GET /auth/providers` returns the enabled list).
- OAuth errors (user cancels, state mismatch) redirect to `/login?error=<code>`, never to an API error page.

## Login page
- Centred card: logo, "Sign in to DevSheet", buttons "Continue with GitHub" and "Continue with Google" (official brand guidelines for the Google button), a line linking Terms and Privacy.
- Shows a friendly message for each `error` code.
- Already logged in: redirect to `/dashboard`.
- After the first sign-in (no onboarding done yet), go to `/welcome` (#33); otherwise to `next` or `/dashboard`.

## Tests
- `GET /auth/providers` lists only providers with configured secrets.
- Google sign-in callback (test authentication handler) creates the account and an `ExternalLogin` with provider `google`.
- `error` codes map to messages (web unit test).
- `next` handling reuses the #27 check.

## Acceptance criteria
- [ ] I can create an account with Google, sign out and sign back in to the same account.
- [ ] GitHub sign-in still works from the new page.
- [ ] Cancelling at Google shows a message on `/login`.

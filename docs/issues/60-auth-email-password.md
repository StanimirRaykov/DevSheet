title: Auth: email and password accounts; GitHub becomes a connection only
labels: feature,security
milestone: M3 Platform UI
---
**Branch:** `60-auth-email-password`  |  **Estimate:** 8-12 h  |  **Depends on:** #29, #30, #32, #42

## Context
Today you create an account with GitHub or Google. The owner wants DevSheet accounts to stand on their own:
sign up with **email and password**, or with **Google** (and **Apple** later, #31). GitHub is a data source, not
an identity: it is connected in Settings to sync repositories, as it already is, but it can no longer be used to
sign up or sign in. This reverses the #30 note "email/password accounts: not planned", so password storage,
email confirmation and password reset are now in scope and must be done carefully.

Decided with the owner:
- **Emails:** no domain yet, so development uses **Mailpit** (a local mailbox in Docker). Sending goes through an
  `IEmailSender` with SMTP settings, so a real provider is a configuration change once the domain exists (#16, #31).
- **Existing GitHub sign-ins:** GitHub becomes connect-only for everyone. The existing GitHub login rows are test
  data; a migration removes them (their `GithubConnection` stays). An account left with no sign-in method can no
  longer be reached, which is accepted for test data and stated in the PR.

## Scope
In: sign up, confirm email, sign in, sign out, forgot and reset password, change password and "add a password"
(for Google-only accounts) in Settings, GitHub removed from `/login` and from sign-in/link, Mailpit in Docker,
docs.
Out: Apple (#31), two-factor authentication, magic links, a real email provider (needs the domain).

## Data
- New `PasswordLogin` (one per user): `UserId` (PK, FK), `Email`, `NormalizedEmail` (unique), `PasswordHash`,
  `EmailConfirmedAt`, `CreatedAt`, `PasswordChangedAt`. A sign-in method like `ExternalLogin`, so "the last
  sign-in method cannot be removed" counts it.
- New `AccountToken`: `Id`, `UserId`, `Purpose` (`ConfirmEmail`, `ResetPassword`), `TokenHash` (SHA-256 of a
  32-byte random token; the token itself is only in the email), `ExpiresAt`, `UsedAt`. Confirm: 24 h. Reset: 1 h.
  Single use; a new one replaces older unused ones for the same purpose.
- Migration: delete `ExternalLogin` rows with provider `github`; `LoginProviders` sign-in list is Google and Apple.

## API
- Passwords hashed with ASP.NET Core's `PasswordHasher<T>` (PBKDF2, salted, versioned; `SuccessRehashNeeded`
  upgrades the hash on sign-in). Rules: 10 to 128 characters, no composition rules, rejected if it equals the email.
- `POST /auth/register` `{ email, password, displayName }`: always answers the same "check your email" response.
  New email: creates user and `PasswordLogin`, sends the confirm link. Email already registered: sends that owner
  a "someone tried to sign up with your email; sign in or reset your password" email instead (no account
  enumeration).
- `POST /auth/confirm-email` `{ token }`: confirms, signs in, continues to onboarding (`/welcome`).
- `POST /auth/sign-in` `{ email, password }`: one generic error for wrong email or password; unconfirmed email
  gets "confirm your email first" with a resend action. Sets the same cookie as OAuth (`devsheet:uid` claim).
- `POST /auth/resend-confirmation`, `POST /auth/forgot-password` `{ email }`: same response whether or not the
  email exists.
- `POST /auth/reset-password` `{ token, password }`: sets the password, confirms the email (they proved they own
  it), signs in. Signs out other sessions: add a `SecurityStamp` to `User`, put it in the cookie, check it in
  `OnValidatePrincipal`, change it on reset and password change.
- `POST /api/me/password` (change: current + new; add: new only, when there is no `PasswordLogin` yet; adding
  one sends a confirm link to the account email).
- Rate limiting (ASP.NET 8 rate limiter): sign-in, register, forgot and resend per IP and per email; 429 with
  `Retry-After`. All these endpoints require the existing CSRF/antiforgery protection.
- `GET /auth/github` and `GET /auth/link/github` return 404; `GET /auth/github/connect` stays.
- Emails: `IEmailSender` (MailKit over SMTP), settings `Email:Smtp:Host/Port/User/Password/From`. Plain text and
  simple HTML, links to the web app (`WebOrigin`). Never log tokens or passwords.

## Docker and settings
- `docker-compose.yml`: `mailpit` service (`axllent/mailpit`, pinned version), SMTP `1025`, web UI
  `http://localhost:8025`. Development defaults point at it. `.env.example` and README updated.

## Web
- `/login`: email and password form, "Continue with Google" (Apple when #31 lands), links "Create an account" and
  "Forgot password?". GitHub button removed.
- `/signup`, `/check-email`, `/confirm-email?token=`, `/forgot-password`, `/reset-password?token=`. Tokens are read
  from the URL and posted; the page then replaces the URL so the token is not left in history.
- Settings: "Password" section (change, or add one); sign-in methods list Google (and Apple), no GitHub;
  GitHub stays in "Connections".
- Onboarding: the GitHub step says "connect GitHub to import your repositories" (optional), since accounts no
  longer start from GitHub.
- Error messages in plain words for every error code; password field with show/hide and `autocomplete`
  (`new-password` / `current-password`).

## Tests
- Hashing and rules; register (new, existing, confirmed, unconfirmed email) gives identical responses and sends
  the right email (fake `IEmailSender`); tokens: expired, used, wrong purpose, replaced.
- Sign-in: right, wrong password, unknown email (same error), unconfirmed, rate limit 429.
- Reset signs out other sessions (old cookie rejected). Cannot remove the last sign-in method.
- `/auth/github` sign-in returns 404; GitHub connect still works.
- Web unit tests for the forms; Playwright: sign up, read the link from Mailpit's API, confirm, sign out, sign in,
  forgot and reset password. The e2e test sign-in (#40) stays.

## Acceptance criteria
- [ ] I can create an account with email and password, confirm it from the email in Mailpit, sign out and sign in.
- [ ] I can reset a forgotten password; my other sessions are signed out.
- [ ] Google sign-up and sign-in still work; a Google account can add a password in Settings.
- [ ] There is no way to sign up or sign in with GitHub, and connecting GitHub in Settings still syncs repositories.
- [ ] Nothing reveals whether an email has an account.

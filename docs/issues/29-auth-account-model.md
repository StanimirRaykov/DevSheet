title: Auth: accounts independent of GitHub (multiple sign-in providers, GitHub as a connection)
labels: feature,security
milestone: M3 Platform UI
---
**Branch:** `29-auth-account-model`  |  **Estimate:** 6-8 h  |  **Depends on:** #13 (EF Core migrations) strongly recommended first, because this changes the `User` table.

## Context
Today the account **is** the GitHub login: `User.GithubId` is the identity key and the GitHub token is stored on `User`. To sign in with Google or Apple, and to connect or disconnect GitHub from Settings, the account must exist on its own and GitHub must become one connected service.

## Scope
In: new data model, sign-in with any provider creating or finding an account, linking and unlinking providers while logged in, GitHub connection separate from sign-in, sync requiring a connection.
Out: the Google provider itself (#30), Apple (#31), the Settings UI (#32).

## Data model
- `User`: `Id`, `DisplayName`, `Email?`, `AvatarUrl?`, `Slug`, `IsPublished`, `CreatedAt`, `OnboardingCompletedAt?`. Remove `GithubId`, `GithubLogin`, `EncryptedGithubToken`, `LastSyncedAt` from it.
- `ExternalLogin`: `Id`, `UserId`, `Provider` (`github` | `google` | `apple`), `ProviderKey` (the provider's stable user id, **never the email**), `Email?`, `CreatedAt`. Unique (`Provider`, `ProviderKey`).
- `GithubConnection` (0 or 1 per user): `UserId` (unique), `GithubId` (unique), `Login`, `EncryptedToken`, `ConnectedAt`, `LastSyncedAt?`.
- Signing in with GitHub creates **both** an `ExternalLogin` and a `GithubConnection` (keeps today's one-click flow).
- Update `docs/schema.sql`, `docs/DATABASE.md` and the schema drift test.

## Rules
- **No automatic linking by email.** A new provider sign-in with an email that matches an existing account does not merge into it (account takeover risk). Linking happens only from Settings while logged in: `GET /auth/link/{provider}`.
- Unlinking: `DELETE /api/me/logins/{provider}`; refused (409) if it is the last sign-in method.
- `POST /api/me/github/disconnect` deletes the connection and its token; synced repos are kept but marked as source missing (same as today's `sourceMissing`). `GET /auth/github/connect` connects GitHub to the current account.
- `POST /api/me/sync` returns 409 with a clear message when GitHub is not connected.
- Slug for a non-GitHub account: from the display name, lower-cased and made unique; must pass the #12 rules and the reserved list.
- The cookie claim `devsheet:uid` stays the identity.
- `returnUrl` on every auth endpoint: relative paths only (no open redirect).

## Migration of existing data
For each existing user: create a `github` `ExternalLogin` and a `GithubConnection` from the old columns, then drop the columns. Done as an EF migration (hence #13).

## Tests
- First GitHub sign-in creates `User`, `ExternalLogin` and `GithubConnection`; a second sign-in finds the same user.
- A Google sign-in with the same email as a GitHub account creates a **separate** account.
- Linking a provider already linked to another account is refused.
- Unlinking the last sign-in method is refused.
- Disconnecting GitHub deletes the token; sync then returns 409.
- Open redirect: `returnUrl=https://evil.com` falls back to `/dashboard`.
- All existing API tests still pass.

## Acceptance criteria
- [ ] Existing GitHub users can still sign in and see their data after the migration.
- [ ] Tests above pass in CI.

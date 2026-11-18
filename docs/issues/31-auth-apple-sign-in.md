title: Auth: Sign in with Apple
labels: feature,security
milestone: M3 Platform UI
---
**Branch:** `31-auth-apple-sign-in`  |  **Estimate:** 4-6 h  |  **Depends on:** #30, and a deployed HTTPS domain (#16). **Decide before starting** (see below).

## Context
Requested as a third sign-in option. Apple is harder than Google and has real costs and constraints, so it is a separate issue that can be postponed without blocking anything.

## Constraints (read first)
- Needs a paid **Apple Developer Program** membership (99 USD per year).
- Apple does **not accept `localhost`** as a return URL: it needs a real, verified domain with HTTPS. Testing locally requires a tunnel or the deployed site (#16).
- The client secret is a short-lived **JWT signed with a `.p8` private key**, not a fixed string. The key is a secret: user-secrets locally, a secret store in production.
- Users may hide their email (`@privaterelay.appleid.com` address). The name is sent **only on the first sign-in**, so it must be saved then.
- Apple posts the callback (`response_mode=form_post`), so the auth cookie must work with a cross-site POST (`SameSite=None; Secure` for the correlation cookie).

## Scope
In: Apple provider on the API, button on `/login`, linking from Settings (#32).
Out: native iOS sign-in.

## Design
- `AspNet.Security.OAuth.Apple` (same family as the GitHub provider already used), configured with Team ID, Key ID, Services ID and the `.p8` key.
- Same account rules as #29 (no merge by email; private relay emails stored as given).
- Button follows Apple's design guidelines; hidden when not configured (`/auth/providers`).

## Tests
- Apple callback (test authentication handler) creates the account with provider `apple`.
- The name from the first sign-in is saved; a later sign-in without a name does not erase it.

## Acceptance criteria
- [ ] Decision recorded in this issue: do it now, later, or drop it (cost and domain).
- [ ] If done: sign in with Apple works on the deployed site.

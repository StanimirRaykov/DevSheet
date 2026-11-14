title: Support expiring GitHub tokens (refresh flow)
labels: security
milestone: M2 Later
---
**Branch:** `11-github-token-refresh`  |  **Depends on:** none

## Context
The OAuth app currently has "Expire user access tokens" **disabled** so the stored access token does not expire. Production should use expiring tokens (8 h) with refresh tokens.

## Scope
Store the encrypted refresh token and expiry; refresh before sync when expired; handle revoked authorization (mark the user as needing re-login rather than failing silently). Keep tokens server-side and encrypted.

## Tests
Expired token triggers refresh; refresh failure produces a "reconnect GitHub" state; tokens never appear in API responses or logs.

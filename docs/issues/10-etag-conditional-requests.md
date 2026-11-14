title: ETag handling for GitHub requests
labels: tech-debt
milestone: M2 Later
---
**Branch:** `10-etag-conditional-requests`  |  **Depends on:** none

## Context
`GithubRepo.ETag` exists but is unused. Conditional requests (`If-None-Match`) that return 304 do not count against the GitHub rate limit (5,000/hour per user token).

## Scope
Store the ETag per repo/endpoint, send it on the next sync, skip the languages call when 304. Add rate-limit awareness: read `X-RateLimit-Remaining`; stop early and report when low.

## Tests
With the fake source: 304 leaves data unchanged and makes no languages call; changed ETag updates data; low remaining quota aborts gracefully with a clear result.

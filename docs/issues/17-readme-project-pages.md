title: README-rendered project detail pages
labels: feature
milestone: M2 Later
---
**Branch:** `17-readme-project-pages`  |  **Depends on:** none

## Context
Survey feedback: many projects are not web apps, and users will not deploy them just to be shown. Rendering the repo README gives non-web projects a proper showcase.

## Scope
Fetch the README through the API during sync (store raw markdown on the synced layer), render on a per-project public page `/{slug}/{project}` with **sanitized** markdown (no raw HTML/script; rewrite relative image links to the GitHub raw URL). Owner can hide the README.

## Tests
Sanitization strips scripts/event handlers; relative links rewritten; missing README handled.

title: Public URL slug rules, renaming and redirects
labels: feature
milestone: M2 Later
---
**Branch:** `12-slug-rules`  |  **Depends on:** none

## Context
Identity is the GitHub numeric id; the slug is a separate, user-editable field defaulting to the lower-cased login. Publishing is already opt-in.

## Scope
Validation (lowercase letters, digits, hyphen; 3-30 chars; no leading/trailing hyphen); reserved-word blocklist (`api`, `admin`, `dashboard`, `login`, `auth`, `settings`, `_next`, ...); uniqueness with a friendly error; `SlugHistory` so old links redirect (301) after a change; protection against another user claiming a recently released slug (cooldown).

## Tests
Reserved and invalid slugs rejected; collision rejected; old slug redirects; renamed GitHub login does not change the slug or break the page.

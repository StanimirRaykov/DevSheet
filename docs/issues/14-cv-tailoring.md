title: Per-application CV tailoring (paid core)
labels: feature
milestone: M2 Later
---
**Branch:** `14-cv-tailoring`  |  **Depends on:** 02, 03, 04, 09

## Context
Survey feedback asked for a CV tailored to each job posting; this recurs on every application, which justifies a subscription, unlike a one-time CV export.

## Design: selection first, generation second
1. **Match:** extract skills from the pasted posting and map them to canonical skills (same list as the matrix). Rank the user's confirmed projects/experience by overlap. No LLM needed; deterministic and cheap.
2. **Compose:** the CV may contain only items from the user's confirmed data: reorder, filter, emphasize; never add.
3. **Optional polish:** an LLM may rephrase existing bullet text only; reject its output if it mentions any skill outside the confirmed set.
4. **Cap:** monthly tailoring limit per paid user to keep API cost predictable.

## Tests
Ranking is deterministic for a fixture posting; composed CV never contains an unconfirmed skill; LLM output containing an unknown skill is rejected and the original text is used.

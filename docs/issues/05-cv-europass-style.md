title: CV export: Europass-style PDF (+ languages and certifications)
labels: feature
milestone: M1 Wednesday demo
---
**Branch:** `05-cv-europass-style`  |  **Estimate:** 5-7 h  |  **Depends on:** 04. Build last; cut this issue's scope first if time is short.

## Context
Europass is the EU's standard CV format and a differentiator for European users. Do not claim "official Europass export" until verified.

## Step 0 (30 min, record the outcome in the PR)
Check europass.europa.eu for whether a machine-readable import/export format (e.g. JSON/XML schema) is currently offered. If yes, open a follow-up issue to export it; for this issue still produce the visual layout. If unsure, label the feature **"Europass-style"** everywhere in UI and README.

## Scope
In: a second template (`?template=europass`) following the Europass section structure: personal information, work experience, education and training, personal skills (mother tongue, other languages with CEFR levels A1-C2), digital/technical skills (confirmed skills), certifications.
New data: `Language(UserId, Name, Level)` with CEFR enum and a `IsMotherTongue` flag; `Certification(UserId, Name, Issuer, IssueDate, Url)`. CRUD endpoints + forms, mirroring issue 03 (ownership checks, validation).

Out: ESCO-coded skills (issue 09), official file import (see Step 0).

## Tests
- Languages: invalid CEFR level rejected; ownership enforced.
- PDF text contains the expected Europass section headings and the user's languages with levels.
- Same confirmed-only guarantees as issue 04 (suggested/rejected/pending absent).

## Acceptance criteria
- [ ] `?template=europass` downloads a Europass-style PDF using the same data as the modern CV.
- [ ] Language and certification forms work on the dashboard.
- [ ] Step 0 outcome documented.

title: LinkedIn data-export import (CSV)
labels: feature
milestone: M2 Later
---
**Branch:** `07-linkedin-export-import`  |  **Depends on:** 03

## Context
LinkedIn does not let third-party apps read a member's positions or education without partner approval, and scraping violates its terms. The legitimate path is the user's own data export (Settings -> Data privacy -> Get a copy of your data), which they upload. This is an **import, not a sync**; the UI and docs must say so.

## Scope
In: upload of the export ZIP (or individual CSVs); parse `Positions.csv`, `Education.csv`, `Skills.csv` (and Profile.csv if present); a **review screen** listing what will be created before saving; writes into the same tables as issue 03.
Out: any scraping or LinkedIn API calls.

## Design
- Parse defensively: column names and date formats change; match headers case-insensitively, tolerate missing columns, parse "Mon YYYY" and "YYYY" dates, treat empty end date as present.
- Skills from the export become `Suggested` custom/canonical skills, never auto-confirmed.
- Duplicate detection: same company + title + start date is skipped.
- Process in memory; do not store the uploaded file. Max upload size (e.g. 10 MB). Reject non-CSV/ZIP content types.
- Privacy: tell the user which fields are read and that the file is not kept.

## Tests
- Parser unit tests with fixture CSVs: normal, missing columns, BOM, quoted commas, empty end date, odd date formats, Cyrillic text.
- Importing the same file twice creates no duplicates.
- Oversized or malformed upload returns 400 without side effects.

## Acceptance criteria
- [ ] Uploading a real export shows a review screen and, on confirm, fills experience and education.

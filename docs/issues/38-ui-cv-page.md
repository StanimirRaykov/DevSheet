title: UI: CV page (templates, preview and export)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `38-ui-cv-page`  |  **Estimate:** 4 h  |  **Depends on:** #27. Adds the Europass XML option once #25 is merged.

## Context
The CV is two download buttons on the dashboard. Users cannot see what will be included before downloading.

## Scope
In: `/dashboard/cv` with template cards, a preview, an "included data" summary, downloads.
Out: per-application tailoring (#14).

## Design
- **Template cards:** Modern (PDF), Europass-style (PDF), Europass XML (when #25 is merged; explains it is for import into the Europass editor). Each with a preview thumbnail and a one-line description.
- **Preview:** the selected template's PDF shown inline (`<iframe>` / `<object>` of `GET /api/me/cv.pdf?template=...&inline=true`), with a loading skeleton. On mobile, a "Open preview" button instead.
- **What's included:** counts of visible projects, confirmed skills, experience, education, languages, certifications, with links to fix gaps ("No education yet").
- **Download** button per template; file names as today.

## API
- `inline=true` returns `Content-Disposition: inline` instead of `attachment`. Same auth and privacy rules.

## Tests
- `inline=true` changes only the disposition header; unknown template still 400; anonymous 401.
- "Included" summary helper (pure function).

## Acceptance criteria
- [ ] I can preview each template before downloading it.
- [ ] Missing sections are pointed out with links to fix them.

title: CV export: modern IT template (PDF)
labels: feature
milestone: M1 Wednesday demo
---
**Branch:** `04-cv-pdf-modern`  |  **Estimate:** 5-6 h  |  **Depends on:** 02, 03

## Context
One-click export of the user's confirmed data. The value is that the CV is built only from user-confirmed information.

## Decisions to record in the PR
- Library: **QuestPDF** in the API (C#, no headless browser). Set `QuestPDF.Settings.License = LicenseType.Community` (free for individuals and small companies; re-check the license terms before any commercial launch). Alternative considered: HTML print via Puppeteer (heavier to run in CI/hosting).
- Endpoint: `GET /api/me/cv.pdf?template=modern` returns `application/pdf` with a download filename.

## Content rules
- Sections: header (name, headline, contact), summary, experience, education, skills (confirmed only), projects.
- Projects: only `Visible` status, with their confirmed skills. `Pending`/`Hidden` never appear.
- Empty sections are omitted, not rendered as blank headings.
- Fits 1-2 pages for typical data; long descriptions wrap rather than overflow.
- **Cyrillic must render correctly** (the author and many users write in Bulgarian). Verify the chosen font supports Cyrillic and bundle a font if the default does not.

## Tests
- Output starts with `%PDF` and is non-trivially sized.
- Extract text (e.g. PdfPig) and assert: confirmed skill present; suggested/rejected skill absent; pending and hidden project titles absent.
- Cyrillic name/headline appears in extracted text.
- Empty profile still produces a valid PDF with no crash.
- Auth: anonymous request returns 401.

## Acceptance criteria
- [ ] "Download CV" on the dashboard produces a correct PDF from real synced data.
- [ ] All tests above pass in CI.

title: LinkedIn data-export import (CSV)
labels: feature
milestone: M2 Later
---
**Branch:** `07-linkedin-export-import`  |  **Depends on:** 03, #60 (do it after the email/password accounts)

## Context
The goal is to fill as much of the CV as possible automatically: GitHub gives projects and skills, LinkedIn gives
the rest (name, headline, about, jobs, education, skills, certifications, languages, projects).
LinkedIn does not let third-party apps read a member's positions or education without partner approval, and
scraping violates its terms. The legitimate path is the user's own data export (LinkedIn: Settings -> Data
privacy -> Get a copy of your data), which they upload. The export is a **ZIP of CSV files** (not XML). This is an
**import, not a sync**; the UI and docs must say so.

## Scope
In: upload of the export ZIP (or individual CSVs); a **review screen** listing everything that will be created or
changed, each row selectable, before saving; writes into the same tables as the manual forms.

| Export file | Goes to |
| --- | --- |
| `Profile.csv` | Profile: full name, headline, summary (about), location |
| `Positions.csv` | Work experience: company, title, description, location, start, end |
| `Education.csv` | Education: school, degree, field (notes), start, end |
| `Skills.csv` | Skills, as **Suggested** (the user confirms each, never auto-confirmed) |
| `Certifications.csv` | Certifications: name, authority (issuer), started on (issue date), URL |
| `Languages.csv` | Languages: name, ISO code when known; LinkedIn proficiency shown as a hint, CEFR levels left for the user |
| `Projects.csv` | Projects without a GitHub repo (title, description), arriving **Pending** like synced repos |
| `Email Addresses.csv`, `PhoneNumbers.csv` | Offered for the profile contact fields, unchecked by default |

Out: any scraping or LinkedIn API calls; other export files (messages, connections, and so on) are never read.

## Design
- Parse defensively: column names and date formats change; match headers case-insensitively, tolerate missing
  files and columns, parse "Mon YYYY", "DD Mon YYYY" and "YYYY" dates, treat empty end date as present.
- Profile fields: an empty field is filled; a field that already has a value is shown as "replace X with Y",
  unchecked by default.
- Duplicate detection, so a second import adds only what is new: work (company + title + start), education
  (school + start), certification (name + issuer), language (name), skill (catalogue match or name), project (title).
- Skills are matched to the catalogue the same way as GitHub detection; unknown ones become custom suggestions.
- Process in memory; do not store the uploaded file. Max upload 10 MB, ZIP entries limited in count and
  uncompressed size (zip bomb), only `.csv` entries read, no paths used from the archive.
- Privacy: say which files are read and that the file is not kept.
- Keep the "found, then the user confirms" pattern generic: future sources (for example web findings about the
  user) will reuse it.

## Tests
- Parser unit tests with fictional fixture CSVs: normal, missing files and columns, BOM, quoted commas and line
  breaks, empty end date, odd date formats, Cyrillic text.
- Importing the same file twice creates no duplicates.
- Oversized, malformed, zip-bomb or non-ZIP/CSV upload returns 400 without side effects.
- Review screen: only selected rows are saved; skills arrive Suggested.

## Acceptance criteria
- [ ] Uploading an export shows a review screen and, on confirm, fills profile, experience, education,
      certifications, languages and projects, and suggests skills.
- [ ] Nothing is saved before I confirm, and a second import adds only what is new.

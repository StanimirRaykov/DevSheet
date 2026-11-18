title: UI: profile and career pages (about, experience, education, languages, certifications)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `37-ui-profile-career`  |  **Estimate:** 6 h  |  **Depends on:** #26, #27

## Context
`/dashboard/profile` is one long page of forms (`forms.tsx`, `languages-certs.tsx`). Errors from the API are shown generically, and deleting has no confirmation.

## Scope
In: redesign of the profile area with a section sub-navigation, list + dialog editing, inline validation, delete with undo.
Out: new fields (the Europass gaps like given/family name belong to #25), LinkedIn import (#7).

## Sections
Sub-navigation (tabs on desktop, select on mobile): **About** (name, headline, summary, location, email), **Experience**, **Education**, **Languages**, **Certifications**.

## Design
- Lists as cards/timeline (newest first); "Add" opens a `Dialog` with the form; clicking a card edits it.
- Month/year pickers for dates; "I currently work here" toggles the end date.
- Languages: mother tongue toggle; CEFR level selectors per skill with the level descriptions as hints (reuse `web/src/lib/cefr.ts`).
- **Validation:** client checks for instant feedback; API 400 field errors (`ValidationProblemDetails`) mapped onto the matching fields.
- **Delete:** confirm dialog, then a toast with Undo (re-creates the item).
- Summary field shows a character counter against the API limit.

## Tests
- Mapping of an API 400 response to field errors (pure function, several shapes).
- Date helper: "present" handling, end before start flagged.
- Dialog form: submit disabled while saving; errors shown under the right field (component test).

## Acceptance criteria
- [ ] Every section can be added, edited and deleted from the new UI.
- [ ] Validation errors appear next to the field, not as a generic alert.

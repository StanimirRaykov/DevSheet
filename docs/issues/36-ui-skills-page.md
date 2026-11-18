title: UI: skills page (suggestions queue and skills matrix)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `36-ui-skills-page`  |  **Estimate:** 5 h  |  **Depends on:** #27

## Context
Skills are confirmed or rejected per repo inside the dashboard list (`skill-row.tsx`). There is no single view of all skills and the projects behind them.

## Scope
In: `/dashboard/skills` with a suggestions queue, the confirmed skills matrix, adding skills by hand.
Out: framework detection (#8), ESCO mapping (#9).

## Design
- **Suggestions:** one card per suggested skill: name, the projects it was found in, Confirm / Reject. Cards animate out after a choice. "Confirm all from this project" shortcut. Undo in the toast.
- **Your skills:** confirmed skills grouped by category (language, framework, tool, other), each with the number of projects; click to see those projects.
- **Rejected:** collapsed list with "Restore".
- **Add a skill:** combobox with autocomplete over the seeded skills; choose which projects it applies to.
- Keyboard: arrow keys move through suggestions, `C` confirms, `R` rejects (shown in a hint line).

## API
- `GET /api/me/skills` already exists; extend it if needed to return the projects per skill and the category.
- Reuse the existing confirm, reject and add endpoints.

## Tests
- Grouping and counting helper (pure function).
- Undo restores the previous status (component test, mocked fetch).
- API: the extended skills response only contains the caller's projects.

## Acceptance criteria
- [ ] I can clear all suggestions from one page, with undo.
- [ ] The matrix matches what the public page shows (confirmed skills only).

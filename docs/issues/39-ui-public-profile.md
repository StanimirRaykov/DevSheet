title: UI: public profile page redesign
labels: feature
milestone: M3 Platform UI
---
**Branch:** `39-ui-public-profile`  |  **Estimate:** 5-6 h  |  **Depends on:** #26

## Context
`/[slug]` is what recruiters and visitors see, and it is the least designed page. It should look like a clean personal portfolio.

## Scope
In: layout and design of the public page, metadata for sharing, not-found handling.
Out: README rendering per project (#17), custom domains (cut).

## Design
- **Header:** avatar, name, headline, location and email only if the privacy flags allow it, links (GitHub, website), "Download CV" (only if the user enables public CV download; default off, add the flag).
- **About:** summary.
- **Skills:** confirmed skills as a compact matrix, grouped by category.
- **Projects:** grid of visible projects with language bar, stars, link; subtle hover animation.
- **Experience** as a timeline, **Education**, **Languages** (CEFR levels), **Certifications**.
- Footer: "Made with DevSheet" link to the landing page.
- Server-rendered, minimal JavaScript, fast. Light and dark mode. Print stylesheet (one clean page).

## Sharing and SEO
- `generateMetadata`: title "Name · DevSheet", description from the headline.
- Open Graph image generated with `next/og` (name, headline, top skills).
- Unpublished or unknown slug: proper 404 page (`notFound()`), with no hint whether the slug exists.

## Tests
- Privacy: email and location hidden unless the flags are set (existing API tests plus a render test).
- Unpublished profile returns 404.
- Public CV download flag: off means no button and the public CV endpoint refuses.

## Acceptance criteria
- [ ] The page looks good at 360, 768 and 1280 px, light and dark.
- [ ] Sharing the link shows a preview card with the OG image.
- [ ] Lighthouse at least 90 on all four categories.

title: UI: landing page and static pages (about, privacy, terms)
labels: feature
milestone: M3 Platform UI
---
**Branch:** `28-ui-landing-page`  |  **Estimate:** 5-6 h  |  **Depends on:** #26, #27

## Context
The home page is a title, one sentence and a "Continue with GitHub" button. The platform needs a real front door that explains what DevSheet does. Google sign-in (#30) also requires a public privacy policy and terms page.

## Scope
In: landing page, `/about`, `/privacy`, `/terms`, marketing nav and footer.
Out: login (#30), pricing (payments were cut).

## Landing page sections
1. **Nav:** logo, About, Sign in, "Get started" (to `/login`).
2. **Hero:** one-line promise, two-line explanation, "Get started" button, and an animated preview of a public profile card (built from real components with fictional data, not a screenshot).
3. **How it works:** three steps: connect GitHub, confirm your skills, share your page and CV.
4. **Features:** GitHub sync with approve-first privacy, skills matrix, CV export (PDF, Europass), public portfolio page. One short paragraph and an icon each.
5. **Example:** link to a demo public profile (fictional data, seeded).
6. **FAQ:** what data is read from GitHub, what is public, how to delete the account.
7. **Footer:** About, Privacy, Terms, GitHub repository link.

## Rules
- **Honest content only:** no invented user counts, testimonials or company logos.
- Sections fade/slide in on scroll (motion presets from #26, off with reduced motion).
- Server-rendered; no client JavaScript except for animations.
- Logged-in visitors see "Go to dashboard" instead of "Get started".

## Privacy and terms pages
Plain-language pages: what is stored (profile data, GitHub public repo data, an encrypted GitHub token), what is public (only approved repos and confirmed skills, after publishing), how long it is kept, how to delete the account, contact. Mark them as a draft for the thesis, not legal advice.

## Tests
- Landing page renders the CTA for logged-out and the dashboard link for logged-in (component test with a mocked `getMe`).
- Every footer link points to an existing route.

## Acceptance criteria
- [ ] Landing, about, privacy and terms pages look good at 360 px, 768 px and 1280 px wide, in light and dark mode.
- [ ] Lighthouse (performance, accessibility, SEO) at least 90 on the landing page.

# End-to-end tests, accessibility and performance

Issue #40. Unit and API tests are described in the README; this file covers what runs in a real browser.

## How the end-to-end tests run

`cd web && npm run e2e` (or `npx playwright test --ui` to watch). Playwright starts two servers of its own, on other ports than
the dev setup, so a running `npm run dev` / `dotnet run` and the `devsheet` database are never touched:

| Server | Port | How |
| --- | --- | --- |
| API | 5317 | `dotnet run --no-launch-profile -- --migrate`, then `dotnet run`; environment **Testing**, database `devsheet_e2e`, `Testing:StubGitHub=true` |
| Web | 3100 | `next build` into `.next-e2e`, then `next start`, pointed at the API above |

Locally, servers that are still running are reused; in CI (`CI=1`) they are always fresh. PostgreSQL must run on
localhost:5432 and Mailpit on 1025 and 8025 (`docker compose up -d db mailpit`); `E2E_DATABASE` overrides the connection
string and `E2E_MAILPIT` the Mailpit address (CI runs both as service containers).

### Email in the tests

The test API sends its account emails over SMTP to Mailpit, as in development. `linkFromEmail` in `e2e/support.ts`
polls Mailpit's API (`/api/v1/search`, `/api/v1/message/{id}`) for the newest email to an address and returns its confirm
or reset link, so the tests open the same links a person would. Every test uses a new fictional `…@example.test`
address. The per-IP rate limits are raised for the test API (all tests come from one address); the per-email ones stay.

### Test-only sign-in

Most tests need a signed-in account but are not about signing in, so the API has `POST /api/testing/sign-in {login}`
(`api/src/DevSheet.Api/TestingSupport.cs`). It signs the browser in as a fictional user with a confirmed password
(`{login}@e2e.example.test`) and a fake GitHub connection, created on first use with onboarding done, and always the same
account for the same login. Signing up, confirming and resetting are tested through the real pages in `accounts.spec.ts`.

- It is mapped **only in the Testing environment**. In Development, Staging and Production the route does not exist (404);
  `TestingSupportTests` checks this.
- `Testing:StubGitHub=true` replaces the GitHub client with three fixed, fictional repositories (`ledger-api`, `trail-map`,
  `dotfiles`). It is off by default, because the API's own integration tests also run in Testing with their own fakes.

## What is tested

| File | What |
| --- | --- |
| `e2e/public.spec.ts` | Landing page and its links, the seeded `/demo` profile, the 404 page (marked `noindex`), axe on every public page |
| `e2e/journey.spec.ts` | Sign in, sync (stubbed), approve a project, confirm a skill, add work experience, download the CV (checked to be a PDF), settings; axe on each page and on the dialog. A signed-out visitor is sent to the login page |
| `e2e/accounts.spec.ts` | Sign up (field errors, check-email page), sign-in refused until confirmed, the emailed confirm link (token hidden, works once), wrong password, forgot and reset password (the old session is signed out, only the new password works), changing the password in Settings (other devices signed out, notice email); axe on the email pages |
| `e2e/a11y.spec.ts` | On 8 public and 7 signed-in pages, in the light and the dark theme: axe, no horizontal scroll at 360, 768 and 1280 px, headings in order, a keyboard run (every Tab stop visible with a focus ring, no trap). With reduced motion: nothing still animating after load |

axe runs the WCAG 2.1 A and AA rules and fails on **serious and critical** findings. Its checks are soft assertions, so
one run reports every page's problems at once.

## Accessibility decisions

- **Visible label in the name.** Buttons and links are named by what they show (voice control users say what they see),
  with hidden text for the purpose: the account menu is "Name, account menu", a profile entry is "Edit" plus its visible
  content, the overview's waiting items read as one sentence ("4 repositories wait for approval").
- **Loading areas** have `role="status"` with a label; skeletons pulse only with `motion-safe`.
- **The CV preview frame is out of the Tab order.** Chrome hands its focus to the built-in PDF viewer, where no focus ring
  can show. "Open in a new tab", right above it, opens the same PDF in the full viewer, which works by keyboard.
- **Error pages** move focus to their heading, so the change is announced, and offer "Try again" and a way out.

## Lighthouse (2026-11-25)

Lighthouse 13.6.0, desktop defaults, production build (`.next-e2e`) on the test servers, headless Chromium.

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 |
| `/login` | 100 | 100 | 100 | 63 |
| `/demo` (public profile) | 95 | 100 | 100 | 91 |

- **Login SEO 63 is intended.** The only failing audit is "page is blocked from indexing": the login page is `noindex`.
- **Demo SEO 91.** Next.js 16 streams `generateMetadata` for browsers that run JavaScript, so the description reaches the
  page after the head; HTML-only crawlers and link previews get it in the head. Lighthouse reads only the head.
- **One landing run showed accessibility 96**: it sampled a skill badge in the hero while it faded in (3.44:1). Settled,
  the badge is 6.38:1 (light) and 5.91:1 (dark); two reruns gave 100.
- The new "agentic browsing" category (67, no `llms.txt`) is outside this issue.

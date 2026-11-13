# DevSheet backlog

Ready to paste into GitHub Issues. Milestones: **M1 Wednesday demo** and **M2 Later**.
Labels suggested: `feature`, `tech-debt`, `security`, `research`, `docs`.

Convention: every feature issue is "done" only when its tests pass in CI.

---

## M1: Wednesday demo

### 1. Skills: detect from synced language data  `feature`
Detect skills for each project from the repo's language bytes.
- [ ] `Skill` table seeded with a small canonical list (+ aliases, e.g. "React.js" = "React")
- [ ] Detection creates `ProjectSkill` rows with status `Suggested`
- [ ] Re-sync never re-suggests a `Rejected` link
- [ ] Tests: detection, alias mapping, rejected links stay rejected

### 2. Skills: suggest and confirm UI  `feature`
- [ ] Dashboard shows suggested skills per project with Confirm / Reject / Add manually
- [ ] Public page shows only `Confirmed` skills, plus a skills summary
- [ ] Tests: public endpoint never exposes `Suggested` or `Rejected`

### 3. Work history and education forms  `feature`
- [ ] CRUD for `WorkExperience`, `Education` and `Profile` (headline, summary, contact)
- [ ] Public page renders them when published
- [ ] Tests: ownership checks (a user cannot edit another user's entries)

### 4. CV PDF: modern IT template  `feature`
- [ ] Generate a PDF from profile, experience, education and confirmed skills and projects
- [ ] Download button on the dashboard
- [ ] Tests: PDF contains only confirmed data

### 5. Europass-style PDF  `feature`
- [ ] Europass section layout (personal info, experience, education, skills)
- [ ] Verify whether Europass currently offers an official machine-readable import before claiming "official export"
- [ ] Add `Language` and `Certification` entities if needed

### 6. Demo prep  `docs`
- [ ] Seed data and rehearsed run-through; fallback screen recording
- [ ] One architecture slide; "done / next / cut and why" slide

---

## M2: Later

### 7. LinkedIn data-export import  `feature`
LinkedIn has no API for reading a member's positions. Import the user's own data-export ZIP/CSVs
(`Positions.csv`, `Education.csv`, `Skills.csv`) into the same tables as the manual forms.
- [ ] Defensive CSV parsing (columns change); review screen before saving
- [ ] Describe honestly in the UI as an import, not a sync

### 8. Framework detection from manifest files  `feature`
Parse `package.json`, `.csproj`, `requirements.txt`, `docker-compose.yml`, CI configs for frameworks and tools.

### 9. ESCO skill taxonomy  `feature`
Map the canonical skill list to ESCO concept URIs (Europass alignment) with a developer-alias table.

### 10. ETag handling for GitHub requests  `tech-debt`
Store ETags per repo and send conditional requests so unchanged repos cost no rate limit.

### 11. GitHub token refresh handling  `security`
Currently the OAuth app uses non-expiring tokens. Support expiring tokens with refresh tokens.

### 12. Slug rules  `feature`
Reserved-word blocklist, validation, user-editable slug, `SlugHistory` redirects after a change.
Identity key stays the GitHub numeric id; opt-in publishing is already implemented.

### 13. EF Core migrations instead of `EnsureCreated()`  `tech-debt`

### 14. Per-application CV tailoring (paid core)  `feature`
Selection first, generation second: map the job posting to canonical skills, rank the user's confirmed
items, compose only from confirmed data, optional LLM rephrasing validated against the confirmed set,
monthly cap per paid user.

### 15. Payments and paid tier  `feature`
Subscription tier (survey: freemium, EUR 3-8/month). Custom domains and live-demo iframes are cut
(survey rated iframes lowest at 3.7/5).

### 16. Deployment (CD)  `tech-debt`
Hosting, managed Postgres, production OAuth app, deploy workflow.

### 17. README-rendered project detail pages  `feature`
Fetch each repo's README and render it as the project page (answers survey feedback that many
projects are not web apps).

### 18. Research chapter: survey write-up  `research`
n = 7 (count carefully: the CSV has multi-line rows). Report as stated intent. Note the limits:
small convenience sample, ratings clustered at 4-5, questions describe benefits before price,
Europass and PDF were asked as one question.

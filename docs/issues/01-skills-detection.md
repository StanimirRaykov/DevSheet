title: Skills: detect suggested skills from synced language data
labels: feature
milestone: M1 Wednesday demo
---
**Branch:** `01-skills-detection`  |  **Estimate:** 3-4 h  |  **Depends on:** none (sync already exists)

## Context
The Skills Matrix is DevSheet's most distinctive feature. GitHub's API gives us bytes per language per repo, which is a weak signal (a language is not a skill). We use it only to produce *suggestions* that the user later confirms or rejects (issue 02). Nothing detected here is ever public by itself.

## Scope
In:
- Canonical `Skill` list, seeded, with aliases (`SkillAlias`: e.g. "React.js", "ReactJS" -> "React"; GitHub's "Dockerfile" -> "Docker", "PLpgSQL" -> "PostgreSQL", "TSQL" -> "SQL Server").
- `ISkillDetector` (Application layer, pure logic) turning a repo's `LanguagesJson` into canonical skill names.
- Detection runs at the end of every sync and creates `ProjectSkill` rows with status `Suggested`.

Out: framework detection from manifest files (issue 08), ESCO mapping (issue 09), UI (issue 02).

## Design
- A language counts when its share of the repo's total bytes is >= 5%. Constant in one place so it is tunable.
- Skip forks entirely: a fork's languages are not the user's work.
- Languages with no matching skill/alias are ignored (do not auto-create skills from raw GitHub strings).
- **Idempotent by (ProjectId, SkillId):** if a row already exists, leave it untouched. This is what keeps `Confirmed` and `Rejected` stable across re-syncs. Never delete a row because the language later disappeared.
- Seed ~40 skills: C#, TypeScript, JavaScript, Python, Java, Go, Rust, C++, C, Kotlin, Swift, PHP, Ruby, SQL, HTML, CSS, Shell, Docker, PostgreSQL, SQL Server, React, Next.js, ASP.NET Core, Node.js, etc. Seed via EF `HasData` or an idempotent startup seeder (pick one, document why).

## Data model
- New table `SkillAlias(Id, SkillId, Alias)`; unique index on lower-cased `Alias`.
- `Skill.Name` already unique.

## Tests (xUnit, all must exist)
- Language at 4% is not suggested; at 5% is.
- Alias mapping: "Dockerfile" suggests Docker; two aliases of one skill produce one suggestion.
- Fork repo produces no suggestions.
- Unknown language produces no suggestion and no new `Skill` row.
- Re-sync does not duplicate rows.
- A `Rejected` link stays `Rejected` and is not reset to `Suggested`.
- A `Confirmed` link survives a re-sync where the language is gone.

## Acceptance criteria
- [ ] After syncing, each non-fork project has `Suggested` skill rows matching its main languages.
- [ ] Re-running sync never changes the status of an existing link.
- [ ] All tests above pass in CI.

## Definition of done
Branch merged via PR with green CI, README status checklist updated.

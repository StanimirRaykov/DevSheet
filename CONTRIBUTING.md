# Contributing / workflow

## One issue = one branch = one pull request

1. Pick an issue (`docs/issues/NN-*.md`, created on GitHub by `scripts/create-issues.sh`).
2. Branch from an up-to-date `main`, named **`<issue-number>-<kebab-name>`**:
   ```bash
   git checkout main && git pull
   git checkout -b 01-skills-detection
   ```
3. Work in small commits, each prefixed with the issue number: `#1 add SkillAlias table`.
4. Tests come with the feature (see the issue's "Tests" section). Before pushing, run locally:
   ```bash
   (cd api && dotnet test)
   (cd web && npm run lint && npm run typecheck && npm test && npm run build)
   ```
5. Push the branch and open a pull request whose description contains `Closes #1`:
   ```bash
   git push -u origin 01-skills-detection
   gh pr create --fill
   ```
6. **CI runs on the pull request.** Merge only when both jobs (API, Web) are green.
7. Merge (squash), delete the branch, then update local main:
   ```bash
   git checkout main && git pull
   ```

## Why merge through a pull request instead of merging locally first
CI also runs on pushes to `main`, but by then the code is already on `main`: a failure leaves `main` red.
Running CI on the pull request catches the problem before the merge. To make GitHub enforce it:
Settings -> Branches -> Add branch protection rule for `main` -> require a pull request and require the status checks
**API (build + test)** and **Web (lint + typecheck + test + build)** to pass.

## Definition of done (every issue)
- [ ] Acceptance criteria in the issue are met
- [ ] Tests listed in the issue exist and pass in CI
- [ ] README status checklist updated if the feature is user-visible

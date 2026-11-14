#!/usr/bin/env bash
# Creates labels, milestones and one GitHub issue per file in docs/issues/.
# Usage:  DRY_RUN=1 ./scripts/create-issues.sh   (preview only)
#         ./scripts/create-issues.sh             (creates issues in the current repo)
# Run it ONCE on a repo with no existing issues/PRs so issue numbers match the file numbers (01 -> #1).
set -euo pipefail
cd "$(dirname "$0")/.."

command -v gh >/dev/null || { echo "GitHub CLI not found: brew install gh && gh auth login"; exit 1; }
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Repo: $REPO"

if [[ -z "${DRY_RUN:-}" ]]; then
  gh label create feature  --color 0e8a16 --description "New functionality" --force >/dev/null
  gh label create tech-debt --color d93f0b --description "Internal quality / infrastructure" --force >/dev/null
  gh label create security --color b60205 --description "Security-related" --force >/dev/null
  gh label create research --color 5319e7 --description "Thesis / user research" --force >/dev/null
  gh label create docs     --color 0075ca --description "Documentation / demo prep" --force >/dev/null
  for m in "M1 Wednesday demo" "M2 Later"; do
    gh api "repos/$REPO/milestones" -f title="$m" >/dev/null 2>&1 || echo "(milestone '$m' already exists)"
  done
fi

for f in docs/issues/[0-9][0-9]-*.md; do
  expected=$((10#$(basename "$f" | cut -c1-2)))
  title=$(sed -n 's/^title: //p' "$f" | head -1)
  labels=$(sed -n 's/^labels: //p' "$f" | head -1)
  milestone=$(sed -n 's/^milestone: //p' "$f" | head -1)

  if [[ -n "${DRY_RUN:-}" ]]; then
    printf '#%-2s %-70s [%s] (%s)\n' "$expected" "$title" "$labels" "$milestone"
    continue
  fi

  # Body = everything after the first line that is exactly '---'
  url=$(awk 'f{print} /^---$/ && !f{f=1}' "$f" | gh issue create \
        --title "$title" --label "$labels" --milestone "$milestone" --body-file -)
  actual=${url##*/}
  echo "created #$actual  $title"
  [[ "$actual" == "$expected" ]] || echo "  WARNING: file number $expected but GitHub issue is #$actual (branch names in the issue use $expected)"
done

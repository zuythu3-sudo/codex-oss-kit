---
name: release-notes
description: Draft changelog notes from commits and merged PRs since the last git tag. Use before tagging a release. Do not publish a GitHub release until the maintainer approves the exact notes.
---

# release-notes

Draft release notes from git history.

## When to use

- Before `git tag`
- Before creating a GitHub Release
- When CHANGELOG.md needs a new version section

## Steps

1. Find the previous tag. If there is no tag, use the first commit.
2. Collect commits and merged PR titles since that point.
3. Group changes:
   - Added
   - Fixed
   - Changed
   - Documentation
4. Drop noise: formatting-only commits, "wip", merge noise.
5. Propose a version bump: patch, minor, or major. Explain why.
6. Draft CHANGELOG.md text and a GitHub release body. Do not publish.

## Output format

```markdown
# Release notes

- Previous tag:
- Suggested version:
- Why this bump:
- Changelog draft:
- GitHub release draft:
```

## Rules

- Do not invent user-facing changes that are not in the diff.
- If the history is one dump commit, say the notes will be weak until there is real span.
- Wait for an explicit "tag this" or "publish this" before creating a tag or GitHub release.

---
name: pr-first-pass
description: First-pass review of a pull request for an open-source repository. Summarize the diff, list risks, missing tests, and whether a human should look closer. Use on incoming PRs. Never post a review until the maintainer approves the exact text.
---

# pr-first-pass

Give the maintainer a first-pass review, not a merge decision.

## When to use

- A pull request is opened or updated
- The user asks for a summary, risk list, or review draft

## Do not use

- As a replacement for official Codex Security or a human review
- On private or unauthorized repositories
- To approve or merge

## Steps

1. Read the PR title, body, and changed files.
2. Summarize the user-visible change in three bullets or fewer.
3. List risks: behavior change, missing tests, docs drift, secret leakage, scope creep.
4. Run repository checks when they exist:

```bash
npm test
npm run oss-ready
npm run docs-drift
```

5. Say whether a human should review before merge.
6. Draft review comments. Do not submit them.

## Output format

```markdown
# PR first pass

- Summary:
- User impact:
- Risks:
- Tests: ran | not run | missing
- Docs: in sync | drifted | not checked
- Human review needed: yes | no
- Suggested review comments:

  ...
```

## Rules

- Prefer specific file:line comments over vague style notes.
- If tests were not run, say so in the first paragraph.
- Never stamp "LGTM" because the diff looks small.
- Wait for an explicit "post this review" before using `gh pr review`.

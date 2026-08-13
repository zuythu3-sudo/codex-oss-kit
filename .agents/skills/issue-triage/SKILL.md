---
name: issue-triage
description: Triage a GitHub issue for an open-source repository. Suggest labels, reproduction gaps, duplicate risk, and a first maintainer reply. Use when a new issue arrives or the user asks to classify, label, or respond to issues. Never post to GitHub until the maintainer approves the exact text.
---

# issue-triage

Produce a maintainer-ready triage note. Draft only.

## When to use

- A new GitHub issue is opened
- The user pastes an issue body or URL they are authorized to handle
- The user asks for labels, a first reply, or close/need-info advice

## Do not use

- On repositories you do not maintain or lack permission to review
- To auto-close, auto-label, or auto-comment
- To dismiss security reports in public

## Steps

1. Read the issue title, body, labels, and any existing comments.
2. Check open and recently closed issues for likely duplicates. Say when you did not search.
3. Classify:
   - bug
   - documentation
   - skill request
   - question
   - security (stop public discussion; point to SECURITY.md)
4. Decide what is missing for a useful next step.
5. Draft one short maintainer reply. Do not send it.

## Output format

```markdown
# Issue triage

- Type:
- Severity: low | medium | high
- Labels:
- Duplicate of:
- Missing information:
- Suggested action: reply | close | convert to discussion | private security path
- Human-approved reply:

  ...
```

## Rules

- If it might be a security issue, do not ask for a public proof of concept.
- If reproduction steps are missing, ask for them. Do not guess they are real.
- Keep the draft reply under 120 words.
- Wait for an explicit "post this" before using `gh` or the GitHub UI.

# Example `$oss-ready` report

This is the shape of a local report. Numbers will differ on your machine.

```text
codex-oss-kit oss-ready
root: /path/to/repo

[PASS] Open-source license — found LICENSE
[PASS] README with a real description — README.md is 1234 characters
[PASS] Contributor guide — found CONTRIBUTING.md
[PASS] Security policy — found SECURITY.md
[PASS] Codex repository policy — found AGENTS.md
[PASS] Changelog or release notes — found CHANGELOG.md
[PASS] Git ignore file — found .gitignore
[PASS] Issue templates — found .github/ISSUE_TEMPLATE
[PASS] Pull request template — found .github/PULL_REQUEST_TEMPLATE.md
[PASS] At least one Codex skill — found 5: .agents/skills/docs-drift/SKILL.md, .agents/skills/issue-triage/SKILL.md, .agents/skills/oss-ready/SKILL.md, .agents/skills/pr-first-pass/SKILL.md, .agents/skills/release-notes/SKILL.md
[PASS] Skills use a recommended layout — 5 in .agents/skills or skills
[WARN] Recent git activity — last commit 2.0 days ago
[PASS] Maintenance is not a one-night dump — 12 commit(s) spanning 14.0 days

12 passed, 1 warning(s), 0 failing
```

A repository with failing checks is not ready, even if the README looks polished.

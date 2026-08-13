# Changelog

## 0.1.2 — 2026-08-13

### Changed

- `$docs-drift` now checks yarn/pnpm/bun scripts, Python files, pytest layout, Makefile targets, Cargo, Go, and local scripts

## 0.1.1 — 2026-08-13

### Changed

- `$oss-ready` now counts `SKILL.md` under `.agents/skills`, `skills`, and other nearby skill folders
- Non-recommended layouts are a warning, not a failure

## 0.1.0 — 2026-08-13

### Added

- `$oss-ready` local checker for maintainer-readiness files and git activity
- `$docs-drift` local checker for README npm/node commands
- `$issue-triage`, `$pr-first-pass`, and `$release-notes` draft-only skills
- CI workflow that dogfoods the two checkers
- Example workflow for the official Codex GitHub Action

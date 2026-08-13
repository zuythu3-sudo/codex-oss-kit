# Changelog

## 0.3.1 — 2026-08-13

### Fixed

- Regenerated sample reports as UTF-8 without machine-local paths or broken dashes
- Removed stale character counts from the README example
- Aligned the Chinese README with the English Used-by section
- CI now also runs on Node 18, matching `engines`

## 0.3.0 — 2026-08-13

### Added

- Cross-platform CI on Ubuntu and Windows, Node 20 and 22
- `npm run check`
- Installer refuses to copy the kit into itself
- Shared i18n tests and a bootstrap end-to-end run

### Changed

- `$docs-drift` localizes through real string pairs, not regex replacements
- README rewritten around the maintainer job, not the installer trivia

## 0.2.0 — 2026-08-13

### Added

- `--lang en|zh` on `$oss-ready`, `$docs-drift`, and `$bootstrap-kit`
- Auto language from `LANG` / `LC_ALL`
- GitHub Action `lang` input
- Full Chinese README

## 0.1.9 — 2026-08-13

### Changed

- CI workflow is limited to `contents: read`

## 0.1.8 — 2026-08-13

### Changed

- CI and examples use `actions/checkout@v7` and `actions/setup-node@v7`

## 0.1.7 — 2026-08-13

### Added

- `codex-oss-kit` binary so the installer can run via `npx github:zuythu3-sudo/codex-oss-kit`
- Weekly scheduled CI and `workflow_dispatch`
- Dependabot updates for GitHub Actions
- Private vulnerability reporting

## 0.1.6 — 2026-08-13

### Added

- `$bootstrap-kit` installs maintainer skills into another checkout and drafts `AGENTS.md` without overwriting

## 0.1.5 — 2026-08-13

### Added

- GitHub Action writes oss-ready and docs-drift reports to the job summary
- Action still runs the second check when the first one fails

## 0.1.4 — 2026-08-13

### Fixed

- `$docs-drift`: repo-root Go targets, real pytest signals, bun runner, package-script shorthands
- `$oss-ready`: GitHub-canonical contributing/security/PR template paths and lowercase readme
- Security docs no longer send reporters to a missing advisory form
- README points `$skill-installer` at the public GitHub URL

## 0.1.3 — 2026-08-13

### Added

- Reusable GitHub Action (`action.yml`) for `$oss-ready` and `$docs-drift`
- Example workflow other repositories can copy

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

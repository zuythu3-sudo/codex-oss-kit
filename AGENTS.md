# AGENTS.md

## Project overview

codex-oss-kit is a set of local Codex skills for open-source maintainers.

- Repo-local skills live under `.agents/skills/`. `$oss-ready` also accepts `skills/<name>/SKILL.md` and other nearby `SKILL.md` files.
- Executable checkers live under each skill's `scripts/` directory.
- Tests live under `tests/`.
- Copy-paste GitHub Actions live under `examples/` and `.github/workflows/`.

This repository dogfoods its own kit. Treat the skills as the product.

## Mandatory skill usage

- Use `$oss-ready` before claiming the repository is ready to publish or tag.
- Use `$docs-drift` when README, package scripts, Makefiles, or install instructions change.
- Use `$issue-triage` on new GitHub issues. Draft only. Do not post until a human approves.
- Use `$pr-first-pass` on incoming pull requests. Draft only. Do not post until a human approves.
- Use `$release-notes` before tagging a release.
- Use `$bootstrap-kit` when installing these skills into another repository you own. Do not overwrite files unless asked.

Never comment on, label, close, or push to GitHub unless the maintainer explicitly approved the exact text.

## Build and test commands

- `npm test` — run checker tests
- `npm run oss-ready` — audit this repository
- `npm run docs-drift` — check README commands against this repository
- Add `--lang zh` or `--lang en` to force report language. Default follows the locale.

Node.js 18+ is required. There are no production npm dependencies.

## Safety

- Skills may only inspect repositories the operator owns or is authorized to review.
- Do not scan private repositories without permission.
- Do not invent install counts, stars, or user quotes.
- Keep GitHub writes human-gated.

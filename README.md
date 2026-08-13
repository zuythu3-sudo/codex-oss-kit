# codex-oss-kit

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Local Codex skills for people who maintain a public repository.

It uses the usual Codex layout: `AGENTS.md`, repo-local skills, and an optional GitHub Action. The checkers run locally. They do not post to GitHub unless a human approves the exact text.

## What it is for

Open-source maintenance is repetitive: check that the repo still looks maintained, check that the README still tells the truth, triage an issue, glance at a PR, draft a changelog. This kit turns those jobs into small, testable workflows.

| Skill | Job | Kind |
| --- | --- | --- |
| `$oss-ready` | Audit license, README, security policy, `AGENTS.md`, templates, skills, and git activity | Local script |
| `$docs-drift` | Check README commands against npm/yarn/pnpm/bun, Node, Python, Make, Cargo, Go, and local scripts | Local script |
| `$issue-triage` | Draft labels and a first reply | Draft only |
| `$pr-first-pass` | Summarize a PR and list risks | Draft only |
| `$release-notes` | Draft changelog text from git history | Draft only |
| `$bootstrap-kit` | Install the skills into another checkout you own | Local script |

## Quick start

Requires Node.js 18+.

```bash
npm test
npm run check
```

Chinese or English reports:

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --lang zh
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --lang en
```

`--lang` accepts `en` or `zh`. If omitted, the tools follow `LANG` / `LC_ALL`. JSON output stays English so scripts can rely on it.

Saved sample reports:

- [English](examples/sample-oss-ready.en.txt)
- [中文](examples/sample-oss-ready.zh.txt)

## Install into another repository

Only use this on a repository you own or are authorized to maintain.

```bash
npx --yes github:zuythu3-sudo/codex-oss-kit -- /path/to/your/repo --dry-run
npx --yes github:zuythu3-sudo/codex-oss-kit -- /path/to/your/repo --lang zh
```

Existing `AGENTS.md` and skill folders are left alone unless you pass `--force`. The installer refuses to copy the kit into itself.

## GitHub Action

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
- uses: zuythu3-sudo/codex-oss-kit@v0.3.3
  with:
    checks: all
    lang: auto
```

`checks` is `all`, `oss-ready`, or `docs-drift`. `lang` is `auto`, `en`, or `zh`. Reports appear in the job summary. The Action does not call a model API.

A copy-paste workflow is in [`examples/maintainer-check.yml`](examples/maintainer-check.yml).

## Scope

- Local read-only checks and draft text
- Only for repositories you own or are authorized to maintain
- GitHub comments, labels, and releases stay human-gated

## Used by

- [zuythu3-sudo/codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit)
- [zuythu3-sudo/repropack](https://github.com/zuythu3-sudo/repropack)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) or [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md).

## License

[MIT](LICENSE)

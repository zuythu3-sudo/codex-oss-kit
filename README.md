# codex-oss-kit

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Local Codex skills for people who maintain a public repository.

The kit follows the same shape OpenAI documented for OSS maintenance: `AGENTS.md`, repo-local skills, and optional GitHub Actions. It does not call the OpenAI API. It does not post to GitHub unless a human approves the exact text.

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

Example:

```text
[PASS] Open-source license — found LICENSE
[PASS] README with a real description — README.md is 4177 characters
[WARN] Maintenance is not a one-night dump — 14 commit(s) spanning 0.1 days
```

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
- uses: zuythu3-sudo/codex-oss-kit@v0.3.0
  with:
    checks: all
    lang: auto
```

`checks` is `all`, `oss-ready`, or `docs-drift`. `lang` is `auto`, `en`, or `zh`. Reports appear in the job summary. The Action does not need an OpenAI API key.

A copy-paste workflow is in [`examples/maintainer-check.yml`](examples/maintainer-check.yml).

## What this is not

- Not an official OpenAI product
- Not a way to auto-qualify for any OpenAI program
- Not a scanner for private repositories you do not own
- Not a bot that comments, labels, or merges without review

## Used by

- [zuythu3-sudo/codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit)
- [zuythu3-sudo/repropack](https://github.com/zuythu3-sudo/repropack)

## License

[MIT](LICENSE)

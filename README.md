# codex-oss-kit

Codex skills for people who actually maintain a public repository.

The kit follows the same shape OpenAI documented for OSS maintenance: `AGENTS.md`, repo-local skills, and optional GitHub Actions. It is not a ChatGPT wrapper and not an application-form generator.

This kit includes six skills. Three ship with a real local script. The others draft GitHub text or install the kit, and they refuse to overwrite or post unless you say so.

| Skill | What it does | Kind |
| --- | --- | --- |
| `$oss-ready` | Audit license, README, SECURITY, AGENTS.md, templates, skills, git activity. Accepts `.agents/skills`, `skills`, and other nearby `SKILL.md` layouts | Script |
| `$docs-drift` | Check README commands against this repository: npm/yarn/pnpm/bun, node, python, make, cargo, go, local scripts | Script |
| `$issue-triage` | Draft labels and a first reply for a new issue | Draft only |
| `$pr-first-pass` | Summarize a PR, list risks, say if a human must look | Draft only |
| `$release-notes` | Draft changelog text from git history | Draft only |
| `$bootstrap-kit` | Copy skills into another repo and draft `AGENTS.md` if missing | Script |

## Requirements

- Node.js 18 or newer
- Git, if you want activity checks

There are no production npm dependencies.

## Quick start

From this repository:

```bash
npm test
npm run oss-ready
npm run docs-drift
```

JSON reports:

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --json
node .agents/skills/docs-drift/scripts/docs-drift.mjs . --json
```

## Use the skills in Codex

Install into another checkout you own:

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs /path/to/your/repo
```

Preview first:

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs /path/to/your/repo --dry-run
```

That copies `$oss-ready`, `$docs-drift`, `$issue-triage`, `$pr-first-pass`, and `$release-notes` into `.agents/skills`. It writes `AGENTS.md` only when that file is missing. Existing files stay put unless you pass `--force`.

Then, in Codex, run `$oss-ready` in the target repository.

If you use `$skill-installer`, you can still point it at a single skill directory such as `https://github.com/zuythu3-sudo/codex-oss-kit/tree/main/.agents/skills/oss-ready`.

## GitHub Action

Other public repositories can run the same checkers without copying scripts:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: zuythu3-sudo/codex-oss-kit@v0.1.5
  with:
    checks: all
```

`checks` can be `all`, `oss-ready`, or `docs-drift`. Reports also appear in the GitHub Actions job summary. This Action does not call the OpenAI API.

This repository dogfoods that Action in `.github/workflows/ci.yml`. A copy-paste workflow is in `examples/maintainer-check.yml`.

`examples/pr-first-pass-action.yml` is a commented template for running `$pr-first-pass` through the official [`openai/codex-action`](https://github.com/openai/codex-action). Copy it only if you have an API key and permission to review that repository.

## What this is not

- Not an official OpenAI product
- Not a way to auto-approve Codex for Open Source
- Not a scanner for other people's private repositories
- Not a star-farming or application-essay kit

If you use these skills on GitHub, a human must approve the exact comment, label, or release text.

## Used by

- [zuythu3-sudo/codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit) — this repository
- [zuythu3-sudo/repropack](https://github.com/zuythu3-sudo/repropack) — CI runs `codex-oss-kit` on every push

## License

[MIT](LICENSE)

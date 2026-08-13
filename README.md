# codex-oss-kit

Codex skills for people who actually maintain a public repository.

The kit follows the same shape OpenAI documented for OSS maintenance: `AGENTS.md`, repo-local skills, and optional GitHub Actions. It is not a ChatGPT wrapper and not an application-form generator.

**v0.1 includes five skills.** Two of them ship with a real local checker. The other three are instruction skills that draft GitHub text and refuse to post it until a human says so.

| Skill | What it does | Kind |
| --- | --- | --- |
| `$oss-ready` | Audit license, README, SECURITY, AGENTS.md, templates, skills, git activity | Script |
| `$docs-drift` | Check README `npm` / `node` commands against this repository | Script |
| `$issue-triage` | Draft labels and a first reply for a new issue | Draft only |
| `$pr-first-pass` | Summarize a PR, list risks, say if a human must look | Draft only |
| `$release-notes` | Draft changelog text from git history | Draft only |

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

Copy the skill folders into another checkout you own or are authorized to maintain:

```bash
mkdir -p .agents/skills
cp -R /path/to/codex-oss-kit/.agents/skills/oss-ready .agents/skills/
cp -R /path/to/codex-oss-kit/.agents/skills/docs-drift .agents/skills/
cp -R /path/to/codex-oss-kit/.agents/skills/issue-triage .agents/skills/
cp -R /path/to/codex-oss-kit/.agents/skills/pr-first-pass .agents/skills/
cp -R /path/to/codex-oss-kit/.agents/skills/release-notes .agents/skills/
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force .agents\skills | Out-Null
Copy-Item -Recurse <kit>\.agents\skills\* .agents\skills\
```

Then, in Codex:

- `$oss-ready`
- `$docs-drift`
- `$issue-triage`
- `$pr-first-pass`
- `$release-notes`

Copy `AGENTS.md` as well if the target repository does not already tell Codex when to call these skills.

If you use `$skill-installer`, point it at a skill directory in this repository once the GitHub URL exists. Until then, copy the folders.

## GitHub Actions

`.github/workflows/ci.yml` runs tests and the two local checkers on every push. It does not call the OpenAI API.

`examples/pr-first-pass-action.yml` is a commented template for running `$pr-first-pass` through the official [`openai/codex-action`](https://github.com/openai/codex-action). Copy it only if you have an API key and permission to review that repository.

## What this is not

- Not an official OpenAI product
- Not a way to auto-approve Codex for Open Source
- Not a scanner for other people's private repositories
- Not a star-farming or application-essay kit

If you use these skills on GitHub, a human must approve the exact comment, label, or release text.

## Used by

This repository uses the kit on itself. External adopters will be listed here when they exist.

## License

[MIT](LICENSE)

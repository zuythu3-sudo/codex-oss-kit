---
name: oss-ready
description: Audit a public repository for open-source maintainer readiness (license, README, SECURITY, AGENTS.md, issue templates, Codex skills, recent git activity). Use when the user asks if a repo is ready to publish, ready for Codex for Open Source, missing hygiene files, or needs an OSS checklist.
---

# oss-ready

Run a local, read-only audit of maintainer-readiness signals.

## When to use

- Before tagging a release
- Before citing the repository in an application or README
- When the user asks "is this repo ready?" or "what files are we missing?"

## Do not use

- To invent stars, users, or install counts
- To scan a repository you do not own or lack permission to review
- As a substitute for a security review

## Steps

1. Confirm the target path. Default is the current repository root.
2. Run the checker:

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs .
```

JSON output:

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --json
```

3. Report every failing check first, then warnings.
4. Propose the smallest file-level fixes. Do not create filler files with no real policy.
5. Re-run the checker after edits.

## Output format

```markdown
# OSS readiness

- Verdict: ready | not ready
- Failures: ...
- Warnings: ...
- Next edits: ...
```

Failing checks mean the repository is not ready. Warnings are allowed, but say what they cost.

## Rules

- Quote the checker output. Do not paraphrase away a failure.
- If git history is a single dump, say so. That is a real maintainer signal.
- Never claim the repository is ready while any `fail` check remains.

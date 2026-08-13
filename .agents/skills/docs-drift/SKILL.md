---
name: docs-drift
description: Check whether README install and test commands still match package.json scripts and local files. Use when README, scripts, or setup docs change, or when a contributor says the documented commands fail.
---

# docs-drift

Find README instructions that no longer match the repository.

## When to use

- README, package.json scripts, or install docs changed
- A new contributor reports that documented commands fail
- Before a release

## Steps

1. Run the checker:

```bash
node .agents/skills/docs-drift/scripts/docs-drift.mjs .
```

JSON output:

```bash
node .agents/skills/docs-drift/scripts/docs-drift.mjs . --json
```

2. List every failing command and the file it expected.
3. Either fix the README or restore the missing script/file.
4. Re-run the checker.

The script only validates local `npm test`, `npm run <script>`, and `node <relative-file>` commands inside fenced code blocks. Clone, copy, and third-party commands are ignored on purpose.

## Output format

```markdown
# Docs drift

- Verdict: in sync | drifted
- Broken commands: ...
- Fixes: ...
```

## Rules

- Prefer changing the README if the command is stale.
- Prefer restoring the script if the README is the contract.
- Do not add fake scripts just to silence the checker.

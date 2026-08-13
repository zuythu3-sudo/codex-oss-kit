---
name: bootstrap-kit
description: Install codex-oss-kit maintainer skills into another repository the user owns. Copy skill folders and draft AGENTS.md if it is missing. Use when the user asks to add this kit, bootstrap Codex maintainer skills, or install oss-ready into another checkout. Never overwrite files unless the user asks for --force.
---

# bootstrap-kit

Install this kit into a repository you own or are authorized to maintain.

## When to use

- The user wants Codex maintainer skills in another checkout
- A repository is missing `.agents/skills` or `AGENTS.md`
- The user asks to bootstrap, install, or copy the kit

## Do not use

- On repositories the user does not own or lack permission to change
- To overwrite an existing `AGENTS.md` without an explicit `--force`
- As a substitute for `$oss-ready`

## Steps

1. Confirm the target path.
2. Run:

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs <target>
```

Preview only:

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs <target> --dry-run
```

Overwrite existing files only when the user asked:

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs <target> --force
```

3. Show what was copied, skipped, or written.
4. Tell the user to open the target in Codex and try `$oss-ready`.

## Rules

- Default is add-only. Existing `AGENTS.md` and skill folders stay put.
- Do not invent project-specific policy beyond detected test commands.
- Ask before `--force`.

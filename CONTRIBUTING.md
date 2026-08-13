# Contributing

Thanks for helping maintain this kit.

## Before you start

1. Open an issue before a large change.
2. Keep each skill focused on one maintainer job.
3. Prefer a small script when the check can be deterministic.
4. Do not add network calls to the local checkers.

## Development

You need Node.js 18+.

```bash
npm test
npm run oss-ready
npm run docs-drift
```

## Skill rules

- `SKILL.md` must have `name` and `description`.
- The description must say when the skill should and should not run.
- Any skill that talks to GitHub must stay draft-only until a human approves the exact text.
- New checkers need a test under `tests/`.

## Pull requests

Use the pull request template. Include:

- What maintainer job changed
- Commands you ran
- Whether README commands still match the scripts

Do not submit generated essay dumps or unused skill folders.

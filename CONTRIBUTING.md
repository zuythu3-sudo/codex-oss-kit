# Contributing

Thanks for helping maintain this kit.

## Before you start

1. Open an issue before a large change.
2. Keep each skill focused on one maintainer job.
3. Prefer a small script when the check can be deterministic.
4. Do not add network calls to the local checkers.
5. Keep GitHub writes draft-only unless a human approved the exact text.

## Development

Node.js 18 or newer.

```bash
npm test
npm run check
```

If you change user-facing text, update both English and Chinese:

- `README.md` and `README.zh-CN.md`
- `--lang en` / `--lang zh` strings in the scripts

## Skill rules

- `SKILL.md` must have `name` and `description`.
- The description must say when the skill should and should not run.
- New checkers need a test under `tests/`.
- Do not submit unused skill folders or generated essay dumps.

## Pull requests

Use the pull request template. Include the maintainer job you changed and the commands you ran.

# Example `$oss-ready` report

This is the shape of a local report. Numbers will differ on your machine.

```text
codex-oss-kit oss-ready
root: /path/to/repo

[PASS] Open-source license — found LICENSE
[PASS] README with a real description — README.md is 1234 characters
[WARN] Recent git activity — last commit 2.0 days ago

11 passed, 1 warning(s), 0 failing
```

A repository with failing checks is not ready, even if the README looks polished.

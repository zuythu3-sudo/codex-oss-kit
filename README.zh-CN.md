# codex-oss-kit

[English](README.md) | [简体中文](README.zh-CN.md)

给开源维护者用的 Codex 技能包。

它按 OpenAI 公开过的维护方式组织：`AGENTS.md`、仓库内 skills、可选 GitHub Actions。这不是聊天套壳，也不是申请表生成器。

一共六个 skill。三个带本地脚本；其余只起草 GitHub 文本或安装工具包，未经你确认不会覆盖文件或发到 GitHub。

| Skill | 做什么 | 类型 |
| --- | --- | --- |
| `$oss-ready` | 检查许可证、README、SECURITY、AGENTS.md、模板、skill、git 活动 | 脚本 |
| `$docs-drift` | 核对 README 命令是否还和仓库一致：npm/yarn/pnpm/bun、node、python、make、cargo、go、本地脚本 | 脚本 |
| `$issue-triage` | 给新 issue 起草标签和第一句回复 | 只起草 |
| `$pr-first-pass` | 总结 PR、列出风险、判断要不要人再看 | 只起草 |
| `$release-notes` | 根据 git 历史起草 changelog | 只起草 |
| `$bootstrap-kit` | 把 skill 装进另一个仓库，没有 `AGENTS.md` 就起草一份 | 脚本 |

## 环境

- Node.js 18 或更高
- 如需活动检查，需要 Git

没有生产环境 npm 依赖。

## 快速开始

在本仓库里：

```bash
npm test
npm run oss-ready
npm run docs-drift
```

中文或英文报告：

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --lang zh
node .agents/skills/docs-drift/scripts/docs-drift.mjs . --lang en
```

`--lang` 可以是 `en` 或 `zh`。不写则跟随 `LANG` / `LC_ALL`（中文环境输出中文）。JSON 报告始终是英文。

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --json
node .agents/skills/docs-drift/scripts/docs-drift.mjs . --json
```

## 在 Codex 里用

装进你拥有的另一个仓库：

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs /path/to/your/repo --lang zh
npx --yes github:zuythu3-sudo/codex-oss-kit -- /path/to/your/repo --dry-run --lang zh
```

先预览、不写盘：

```bash
node .agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs /path/to/your/repo --dry-run --lang zh
```

这会把 `$oss-ready`、`$docs-drift`、`$issue-triage`、`$pr-first-pass`、`$release-notes` 拷到 `.agents/skills`。只有缺少 `AGENTS.md` 时才起草。已有文件默认不动，除非你加 `--force`。

然后在目标仓库里对 Codex 说 `$oss-ready`。

如果用 `$skill-installer`，也可以只装某一个目录，例如 `https://github.com/zuythu3-sudo/codex-oss-kit/tree/main/.agents/skills/oss-ready`。

## GitHub Action

其他公开仓库不必拷脚本，直接：

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
- uses: zuythu3-sudo/codex-oss-kit@v0.2.0
  with:
    checks: all
    lang: zh
```

`checks` 可以是 `all`、`oss-ready` 或 `docs-drift`。`lang` 可以是 `auto`、`en` 或 `zh`。报告会出现在 Actions 摘要里。这个 Action 不调用 OpenAI API。

本仓库的 `.github/workflows/ci.yml` 已经在用它。可复制的工作流见 `examples/maintainer-check.yml`。

`examples/pr-first-pass-action.yml` 是通过官方 [`openai/codex-action`](https://github.com/openai/codex-action) 跑 `$pr-first-pass` 的注释模板。只有在你有 API key、并且有权审查那个仓库时才复制。

## 这不是什么

- 不是 OpenAI 官方产品
- 不能自动让你通过 Codex for Open Source
- 不是用来扫别人私有仓库的
- 不是刷 star 或申请作文工具

如果这些 skill 要在 GitHub 上发言，必须由人确认具体文本。

## 谁在用

- [zuythu3-sudo/codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit) — 本仓库
- [zuythu3-sudo/repropack](https://github.com/zuythu3-sudo/repropack) — 每次 push 跑 `codex-oss-kit`

## 许可

[MIT](LICENSE)

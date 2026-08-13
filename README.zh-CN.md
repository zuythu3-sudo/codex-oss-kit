# codex-oss-kit

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zuythu3-sudo/codex-oss-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

给开源维护者用的本地 Codex 技能包。

它按 OpenAI 公开过的维护方式组织：`AGENTS.md`、仓库内 skills、可选 GitHub Actions。不调用 OpenAI API。未经人确认具体文本，不会发到 GitHub。

## 用来干什么

开源维护是重复劳动：看仓库还像不像在维护、README 命令还对不对、分流 issue、扫一眼 PR、起草 changelog。这个工具包把这些事收成可测试的小流程。

| Skill | 做什么 | 类型 |
| --- | --- | --- |
| `$oss-ready` | 检查许可证、README、安全政策、`AGENTS.md`、模板、skill、git 活动 | 本地脚本 |
| `$docs-drift` | 核对 README 命令是否还和仓库一致 | 本地脚本 |
| `$issue-triage` | 起草标签和第一句回复 | 只起草 |
| `$pr-first-pass` | 总结 PR 并列出风险 | 只起草 |
| `$release-notes` | 根据 git 历史起草 changelog | 只起草 |
| `$bootstrap-kit` | 把 skill 装进你拥有的另一个仓库 | 本地脚本 |

## 快速开始

需要 Node.js 18+。

```bash
npm test
npm run check
```

中文或英文报告：

```bash
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --lang zh
node .agents/skills/oss-ready/scripts/oss-ready.mjs . --lang en
```

`--lang` 可以是 `en` 或 `zh`。不写则跟随 `LANG` / `LC_ALL`。JSON 始终是英文。

示例报告：

- [English](examples/sample-oss-ready.en.txt)
- [中文](examples/sample-oss-ready.zh.txt)

## 装进另一个仓库

只用于你拥有或有权维护的仓库。

```bash
npx --yes github:zuythu3-sudo/codex-oss-kit -- /path/to/your/repo --dry-run --lang zh
npx --yes github:zuythu3-sudo/codex-oss-kit -- /path/to/your/repo --lang zh
```

已有 `AGENTS.md` 和 skill 目录默认不动。安装器拒绝把工具包装进它自己。

## GitHub Action

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
- uses: zuythu3-sudo/codex-oss-kit@v0.3.2
  with:
    checks: all
    lang: zh
```

不需要 OpenAI API key。报告出现在 Actions 摘要里。

## 这不是什么

- 不是 OpenAI 官方产品
- 不能自动通过任何 OpenAI 计划
- 不是用来扫别人私有仓库的
- 不是无人值守的评论/合并机器人

## 谁在用

- [zuythu3-sudo/codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit)
- [zuythu3-sudo/repropack](https://github.com/zuythu3-sudo/repropack)

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md) 或 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。

## 许可

[MIT](LICENSE)

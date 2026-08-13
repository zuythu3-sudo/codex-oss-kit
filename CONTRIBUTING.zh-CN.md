# 贡献指南

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

谢谢你愿意维护这个工具包。

## 开始之前

1. 大改动先开 issue。
2. 每个 skill 只做一件维护工作。
3. 能写成确定性检查的，优先写小脚本。
4. 本地检查器不要加网络请求。
5. 未经人确认具体文本，不要往 GitHub 写。

## 开发

需要 Node.js 18 或更高。

```bash
npm test
npm run check
```

改用户可见文案时，中英文一起改：

- `README.md` 和 `README.zh-CN.md`
- 脚本里的 `--lang en` / `--lang zh` 字符串

## Skill 规则

- `SKILL.md` 必须有 `name` 和 `description`。
- description 要写清何时用、何时不用。
- 新检查器要在 `tests/` 里加测试。
- 不要提交用不到的 skill 目录或生成的长文。

## Pull request

使用仓库里的 PR 模板。写明改了哪项维护工作，以及你跑过的命令。

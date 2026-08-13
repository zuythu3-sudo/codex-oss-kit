#!/usr/bin/env node
/**
 * Install maintainer skills into another repository you own.
 *
 * Usage:
 *   node bootstrap-kit.mjs <target> [--force] [--dry-run] [--json] [--no-agents-md] [--lang en|zh]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCli, resolveLang, t } from "../../_shared/i18n.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const kitSkillsRoot = path.resolve(here, "..", "..");
const SKIP_SKILLS = new Set(["bootstrap-kit", "_shared"]);
const DEFAULT_SKILLS = ["oss-ready", "docs-drift", "issue-triage", "pr-first-pass", "release-notes"];

const { flags, opts, positionals } = parseCli(process.argv.slice(2));
const jsonMode = flags.has("json");
const force = flags.has("force");
const dryRun = flags.has("dry-run");
const writeAgents = !flags.has("no-agents-md");
const lang = resolveLang(opts.lang);
const targetArg = positionals[0];

function fail(message) {
  if (jsonMode) process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
  else process.stderr.write(`${message}\n`);
  process.exit(1);
}

function detectCommands(root) {
  /** @type {string[]} */
  const commands = [];
  const pkgFile = path.join(root, "package.json");
  if (fs.existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
      const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
      if (scripts.test) commands.push("`npm test`");
      if (scripts.build) commands.push("`npm run build`");
      if (scripts.check) commands.push("`npm run check`");
    } catch {
      // ignore broken package.json
    }
  }
  if (fs.existsSync(path.join(root, "Cargo.toml"))) commands.push("`cargo test`");
  if (fs.existsSync(path.join(root, "go.mod"))) commands.push("`go test ./...`");
  const makefile = ["Makefile", "makefile", "GNUmakefile"]
    .map((name) => path.join(root, name))
    .find((file) => fs.existsSync(file));
  if (makefile) {
    const text = fs.readFileSync(makefile, "utf8");
    if (/^test:/m.test(text)) commands.push("`make test`");
  }
  return commands;
}

function renderAgentsMd(commands) {
  const commandBlock =
    commands.length > 0
      ? commands.map((item) => `- ${item}`).join("\n")
      : lang === "zh"
        ? "- 在这里补上仓库真正的测试和构建命令。"
        : "- Add the repository's real test and build commands here.";
  if (lang === "zh") {
    return `# AGENTS.md

## 项目概览

本仓库使用 [codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit) 维护技能。

## 必须使用的 skill

- 发布或打 tag 前使用 \`$oss-ready\`。
- README、脚本或安装说明变更时使用 \`$docs-drift\`。
- 新 issue 使用 \`$issue-triage\`。只起草。
- 新 PR 使用 \`$pr-first-pass\`。只起草。
- 打 tag 前使用 \`$release-notes\`。

未经维护者确认具体文本，不要评论、打标签、关闭或推送到 GitHub。

## 构建和测试命令

${commandBlock}

## 安全

- 只检查你拥有或有权维护的仓库。
- GitHub 写入必须由人确认。
`;
  }
  return `# AGENTS.md

## Project overview

This repository uses [codex-oss-kit](https://github.com/zuythu3-sudo/codex-oss-kit) maintainer skills.

## Mandatory skill usage

- Use \`$oss-ready\` before claiming the repository is ready to publish or tag.
- Use \`$docs-drift\` when README, package scripts, or install docs change.
- Use \`$issue-triage\` on new issues. Draft only.
- Use \`$pr-first-pass\` on incoming pull requests. Draft only.
- Use \`$release-notes\` before tagging a release.

Never comment on, label, close, or push to GitHub unless a human approved the exact text.

## Build and test commands

${commandBlock}

## Safety

- Only inspect repositories you own or are authorized to review.
- Keep GitHub writes human-gated.
`;
}

function copyShared(destRoot) {
  const source = path.join(kitSkillsRoot, "_shared");
  const dest = path.join(destRoot, ".agents", "skills", "_shared");
  if (!fs.existsSync(source)) {
    return { name: "_shared", action: "missing-source", ok: false };
  }
  if (fs.existsSync(dest) && !force) {
    return { name: "_shared", action: "skipped", ok: true, detail: "already exists" };
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(source, dest, { recursive: true, force });
  }
  return { name: "_shared", action: dryRun ? "would-copy" : "copied", ok: true };
}

function copySkill(name, destRoot) {
  const source = path.join(kitSkillsRoot, name);
  const dest = path.join(destRoot, ".agents", "skills", name);
  if (!fs.existsSync(path.join(source, "SKILL.md"))) {
    return { name, action: "missing-source", ok: false };
  }
  if (fs.existsSync(dest) && !force) {
    return { name, action: "skipped", ok: true, detail: "already exists" };
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(source, dest, { recursive: true, force });
  }
  return { name, action: dryRun ? "would-copy" : "copied", ok: true };
}

function writeAgentsFile(destRoot) {
  const dest = path.join(destRoot, "AGENTS.md");
  if (fs.existsSync(dest) && !force) {
    return { action: "skipped", ok: true, detail: "AGENTS.md already exists" };
  }
  if (!dryRun) fs.writeFileSync(dest, renderAgentsMd(detectCommands(destRoot)));
  return { action: dryRun ? "would-write" : "wrote", ok: true };
}

function main() {
  if (!targetArg) {
    fail(
      t(lang, {
        en: "Usage: node bootstrap-kit.mjs <target-repo> [--force] [--dry-run] [--json] [--lang en|zh]",
        zh: "用法：node bootstrap-kit.mjs <目标仓库> [--force] [--dry-run] [--json] [--lang en|zh]",
      }),
    );
  }
  const target = path.resolve(targetArg);
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    fail(t(lang, { en: `Not a directory: ${target}`, zh: `不是目录：${target}` }));
  }
  const kitRoot = path.resolve(kitSkillsRoot, "..", "..");
  if (target === kitRoot) {
    fail(
      t(lang, {
        en: "Refusing to install the kit into its own repository.",
        zh: "拒绝把工具包装进它自己的仓库。",
      }),
    );
  }

  const shared = copyShared(target);
  const skills = [
    shared,
    ...DEFAULT_SKILLS.filter((name) => !SKIP_SKILLS.has(name)).map((name) => copySkill(name, target)),
  ];
  const agents = writeAgents ? writeAgentsFile(target) : { action: "disabled", ok: true };
  const ok = skills.every((item) => item.ok) && agents.ok;
  const report = { ok, target, lang, skills, agents };

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`codex-oss-kit bootstrap\n`);
    process.stdout.write(`${lang === "zh" ? "目标" : "target"}: ${target}\n\n`);
    for (const item of skills) {
      process.stdout.write(`[${item.action}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}\n`);
    }
    process.stdout.write(
      `[${agents.action}] AGENTS.md${agents.detail ? ` — ${agents.detail}` : ""}\n`,
    );
  }
  process.exit(ok ? 0 : 1);
}

main();

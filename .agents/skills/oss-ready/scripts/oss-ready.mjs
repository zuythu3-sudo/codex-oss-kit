#!/usr/bin/env node
/**
 * Audit a public repository for maintainer-readiness signals.
 *
 * Usage:
 *   node oss-ready.mjs [path] [--json] [--lang en|zh]
 *
 * Exit codes:
 *   0  no failing checks (warnings allowed)
 *   1  one or more failing checks, or the path is not a directory
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseCli, resolveLang, t } from "../../_shared/i18n.mjs";

const FAIL = "fail";
const WARN = "warn";

const { flags, opts, positionals } = parseCli(process.argv.slice(2));
const jsonMode = flags.has("json");
const lang = resolveLang(opts.lang);
const rootArg = positionals[0] ?? ".";
const root = path.resolve(rootArg);

const TITLES = {
  license: { en: "Open-source license", zh: "开源许可证" },
  readme: { en: "README with a real description", zh: "有实质内容的 README" },
  contributing: { en: "Contributor guide", zh: "贡献指南" },
  security: { en: "Security policy", zh: "安全政策" },
  "agents-md": { en: "Codex repository policy", zh: "Codex 仓库说明 AGENTS.md" },
  changelog: { en: "Changelog or release notes", zh: "更新日志或发版说明" },
  gitignore: { en: "Git ignore file", zh: "Git 忽略文件" },
  "issue-templates": { en: "Issue templates", zh: "Issue 模板" },
  "pr-template": { en: "Pull request template", zh: "Pull request 模板" },
  skills: { en: "At least one Codex skill", zh: "至少一个 Codex skill" },
  "skills-layout": { en: "Skills use a recommended layout", zh: "Skill 使用推荐目录" },
  "recent-activity": { en: "Recent git activity", zh: "近期 git 活动" },
  "commit-span": { en: "Commit history has a time span", zh: "提交历史有时间跨度" },
};

function pair(en, zh) {
  return { en, zh };
}

function found(file) {
  return pair(`found ${file}`, `已找到 ${file}`);
}

function missing(what) {
  return pair(`missing ${what}`, `缺少 ${what}`);
}

/**
 * @param {string} relative
 */
function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

/**
 * @param {string} relative
 */
function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

/**
 * @param {string} relative
 */
function isNonEmptyFile(relative) {
  if (!exists(relative)) return false;
  try {
    return read(relative).trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * @param {string[]} names
 */
function firstExisting(names) {
  return names.find((name) => exists(name)) ?? null;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".tmp",
  "tmp",
  "temp",
  "vendor",
]);
const ALLOW_DOT_DIRS = new Set([".agents", ".claude"]);
const MAX_SKILL_DEPTH = 4;
const CANONICAL_SKILL = /^(?:\.agents\/)?skills\/[^/]+\/SKILL\.md$/;

/**
 * @param {string} relative
 */
function isCanonicalSkill(relative) {
  return CANONICAL_SKILL.test(relative);
}

/**
 * @param {string} dir
 * @param {number} depth
 * @param {string} rel
 * @param {string[]} out
 */
function walkSkillFiles(dir, depth, rel, out) {
  if (depth > MAX_SKILL_DEPTH) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".") && !ALLOW_DOT_DIRS.has(entry.name)) continue;
    const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
    const nextPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === "SKILL.md") {
      out.push(nextRel);
    } else if (entry.isDirectory()) {
      walkSkillFiles(nextPath, depth + 1, nextRel, out);
    }
  }
}

function listSkillManifests() {
  /** @type {string[]} */
  const foundSkills = [];
  walkSkillFiles(root, 0, "", foundSkills);
  foundSkills.sort();
  return {
    all: foundSkills,
    canonical: foundSkills.filter((item) => isCanonicalSkill(item)),
    alternate: foundSkills.filter((item) => !isCanonicalSkill(item)),
  };
}

function lastCommitAgeDays() {
  try {
    const raw = execFileSync("git", ["-C", root, "log", "-1", "--format=%ct"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return (Date.now() / 1000 - timestamp) / 86400;
  } catch {
    return null;
  }
}

function commitSpanDays() {
  try {
    const raw = execFileSync(
      "git",
      ["-C", root, "log", "--reverse", "--format=%ct"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { commits: lines.length, spanDays: 0 };
    const first = Number(lines[0]);
    const last = Number(lines[lines.length - 1]);
    if (!Number.isFinite(first) || !Number.isFinite(last)) {
      return { commits: lines.length, spanDays: null };
    }
    return { commits: lines.length, spanDays: (last - first) / 86400 };
  } catch {
    return { commits: 0, spanDays: null };
  }
}

/** @type {Array<{ id: string, level: typeof FAIL | typeof WARN, run: () => { ok: boolean, text: { en: string, zh: string } } }>} */
const checks = [
  {
    id: "license",
    level: FAIL,
    run() {
      const file = firstExisting(["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]);
      return file
        ? { ok: true, text: found(file) }
        : { ok: false, text: missing("LICENSE, LICENSE.md, LICENSE.txt, or COPYING") };
    },
  },
  {
    id: "readme",
    level: FAIL,
    run() {
      const file = firstExisting(["README.md", "README.MD", "Readme.md", "readme.md"]);
      if (!file) return { ok: false, text: missing("README.md") };
      const text = read(file).trim();
      if (text.length < 200) {
        return {
          ok: false,
          text: pair(`${file} is shorter than 200 characters`, `${file} 不足 200 个字符`),
        };
      }
      return {
        ok: true,
        text: pair(`${file} is ${text.length} characters`, `${file} 共 ${text.length} 个字符`),
      };
    },
  },
  {
    id: "contributing",
    level: FAIL,
    run() {
      const file = firstExisting(["CONTRIBUTING.md", "docs/CONTRIBUTING.md", ".github/CONTRIBUTING.md"]);
      return file ? { ok: true, text: found(file) } : { ok: false, text: missing("CONTRIBUTING.md") };
    },
  },
  {
    id: "security",
    level: FAIL,
    run() {
      const file = firstExisting(["SECURITY.md", "docs/SECURITY.md", ".github/SECURITY.md"]);
      return file ? { ok: true, text: found(file) } : { ok: false, text: missing("SECURITY.md") };
    },
  },
  {
    id: "agents-md",
    level: FAIL,
    run() {
      if (!isNonEmptyFile("AGENTS.md")) return { ok: false, text: missing("AGENTS.md") };
      return { ok: true, text: found("AGENTS.md") };
    },
  },
  {
    id: "changelog",
    level: WARN,
    run() {
      const file = firstExisting(["CHANGELOG.md", "CHANGES.md", "HISTORY.md"]);
      return file ? { ok: true, text: found(file) } : { ok: false, text: missing("CHANGELOG.md") };
    },
  },
  {
    id: "gitignore",
    level: WARN,
    run() {
      return exists(".gitignore")
        ? { ok: true, text: found(".gitignore") }
        : { ok: false, text: missing(".gitignore") };
    },
  },
  {
    id: "issue-templates",
    level: WARN,
    run() {
      const dir = path.join(root, ".github", "ISSUE_TEMPLATE");
      if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        return { ok: true, text: found(".github/ISSUE_TEMPLATE") };
      }
      if (exists(".github/ISSUE_TEMPLATE.md") || exists(".github/ISSUE_TEMPLATE.yml")) {
        return {
          ok: true,
          text: pair("found a single issue template", "已找到单个 issue 模板"),
        };
      }
      return {
        ok: false,
        text: pair("no GitHub issue templates", "没有 GitHub issue 模板"),
      };
    },
  },
  {
    id: "pr-template",
    level: WARN,
    run() {
      const file = firstExisting([
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/pull_request_template.md",
        "docs/pull_request_template.md",
        "docs/PULL_REQUEST_TEMPLATE.md",
        "PULL_REQUEST_TEMPLATE.md",
        "pull_request_template.md",
      ]);
      if (file) return { ok: true, text: found(file) };
      const dirNames = [".github/PULL_REQUEST_TEMPLATE", ".github/pull_request_template"];
      for (const relative of dirNames) {
        const dir = path.join(root, relative);
        if (!fs.existsSync(dir)) continue;
        try {
          if (!fs.statSync(dir).isDirectory()) continue;
          const entries = fs.readdirSync(dir).filter((name) => !name.startsWith("."));
          if (entries.length > 0) return { ok: true, text: found(relative) };
        } catch {
          // ignore unreadable template dirs
        }
      }
      return { ok: false, text: missing("pull request template") };
    },
  },
  {
    id: "skills",
    level: FAIL,
    run() {
      const skills = listSkillManifests();
      if (skills.all.length === 0) {
        return {
          ok: false,
          text: pair(
            "no SKILL.md under .agents/skills, skills, or other skill folders",
            "在 .agents/skills、skills 或其他 skill 目录下没有 SKILL.md",
          ),
        };
      }
      const preview = skills.all.slice(0, 8).join(", ");
      const extra = skills.all.length > 8 ? ` (+${skills.all.length - 8} more)` : "";
      const extraZh = skills.all.length > 8 ? `（另有 ${skills.all.length - 8} 个）` : "";
      return {
        ok: true,
        text: pair(
          `found ${skills.all.length}: ${preview}${extra}`,
          `已找到 ${skills.all.length} 个：${preview}${extraZh}`,
        ),
      };
    },
  },
  {
    id: "skills-layout",
    level: WARN,
    run() {
      const skills = listSkillManifests();
      if (skills.all.length === 0) {
        return { ok: true, text: pair("no skills to place", "没有需要放置的 skill") };
      }
      if (skills.canonical.length > 0) {
        return {
          ok: true,
          text: pair(
            `${skills.canonical.length} in .agents/skills or skills`,
            `${skills.canonical.length} 个位于 .agents/skills 或 skills`,
          ),
        };
      }
      return {
        ok: false,
        text: pair(
          `found ${skills.alternate.length} SKILL.md outside .agents/skills or skills`,
          `发现 ${skills.alternate.length} 个 SKILL.md 不在 .agents/skills 或 skills 下`,
        ),
      };
    },
  },
  {
    id: "recent-activity",
    level: WARN,
    run() {
      if (!exists(".git")) {
        return { ok: false, text: pair("not a git repository yet", "还不是 git 仓库") };
      }
      const age = lastCommitAgeDays();
      if (age === null) {
        return { ok: false, text: pair("no commits yet", "还没有提交") };
      }
      if (age > 45) {
        return {
          ok: false,
          text: pair(`last commit was ${age.toFixed(0)} days ago`, `上次提交是 ${age.toFixed(0)} 天前`),
        };
      }
      return {
        ok: true,
        text: pair(`last commit ${age.toFixed(1)} days ago`, `上次提交在 ${age.toFixed(1)} 天前`),
      };
    },
  },
  {
    id: "commit-span",
    level: WARN,
    run() {
      if (!exists(".git")) {
        return { ok: false, text: pair("not a git repository yet", "还不是 git 仓库") };
      }
      const { commits, spanDays } = commitSpanDays();
      if (commits === 0) return { ok: false, text: pair("no commits yet", "还没有提交") };
      const span = spanDays === null ? "?" : spanDays.toFixed(1);
      const text = pair(
        `${commits} commit(s) spanning ${span} days`,
        `${commits} 次提交，跨度 ${span} 天`,
      );
      if (commits === 1 || (spanDays !== null && spanDays < 1 && commits < 3)) {
        return { ok: false, text };
      }
      return { ok: true, text };
    },
  },
];

function main() {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    const message = t(lang, pair(`Not a directory: ${root}`, `不是目录：${root}`));
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: message, lang }, null, 2)}\n`);
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(1);
  }

  const results = checks.map((check) => {
    const result = check.run();
    return {
      id: check.id,
      title: t(lang, TITLES[check.id]),
      title_en: TITLES[check.id].en,
      level: check.level,
      ok: result.ok,
      detail: t(lang, result.text),
      detail_en: result.text.en,
      status: result.ok ? "pass" : check.level,
    };
  });

  const failed = results.filter((item) => !item.ok && item.level === FAIL);
  const warned = results.filter((item) => !item.ok && item.level === WARN);
  const passed = results.filter((item) => item.ok);
  const ok = failed.length === 0;

  const jsonResults = results.map((item) => ({
    id: item.id,
    title: item.title_en,
    level: item.level,
    ok: item.ok,
    detail: item.detail_en,
    status: item.status,
  }));

  const report = {
    ok,
    root,
    lang,
    summary: {
      pass: passed.length,
      warn: warned.length,
      fail: failed.length,
    },
    checks: jsonMode ? jsonResults : results,
  };

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify({ ...report, checks: jsonResults }, null, 2)}\n`);
  } else {
    const mark = (item) => {
      if (item.ok) return lang === "zh" ? "通过" : "PASS";
      if (item.level === WARN) return lang === "zh" ? "警告" : "WARN";
      return lang === "zh" ? "失败" : "FAIL";
    };
    process.stdout.write(`codex-oss-kit oss-ready\n`);
    process.stdout.write(`${lang === "zh" ? "根目录" : "root"}: ${root}\n\n`);
    for (const item of results) {
      process.stdout.write(`[${mark(item)}] ${item.title} — ${item.detail}\n`);
    }
    process.stdout.write(
      lang === "zh"
        ? `\n${passed.length} 项通过，${warned.length} 项警告，${failed.length} 项失败\n`
        : `\n${passed.length} passed, ${warned.length} warning(s), ${failed.length} failing\n`,
    );
    if (!ok) {
      process.stdout.write(
        lang === "zh"
          ? "先修好失败项，再把这个仓库称为 OSS-ready。\n"
          : "Fix failing checks before calling this repository OSS-ready.\n",
      );
    }
  }

  process.exit(ok ? 0 : 1);
}

main();

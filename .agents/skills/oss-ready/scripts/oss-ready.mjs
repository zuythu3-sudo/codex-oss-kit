#!/usr/bin/env node
/**
 * Audit a public repository for maintainer-readiness signals.
 *
 * Usage:
 *   node oss-ready.mjs [path] [--json]
 *
 * Exit codes:
 *   0  no failing checks (warnings allowed)
 *   1  one or more failing checks, or the path is not a directory
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FAIL = "fail";
const WARN = "warn";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const rootArg = args.find((value) => !value.startsWith("-")) ?? ".";
const root = path.resolve(rootArg);

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

function listSkillManifests() {
  const skillsRoot = path.join(root, ".agents", "skills");
  if (!fs.existsSync(skillsRoot)) return [];

  /** @type {string[]} */
  const found = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsRoot, entry.name, "SKILL.md");
    if (fs.existsSync(skillMd)) found.push(`.agents/skills/${entry.name}/SKILL.md`);
  }
  return found;
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

/** @type {Array<{ id: string, title: string, level: typeof FAIL | typeof WARN, run: () => { ok: boolean, detail: string } }>} */
const checks = [
  {
    id: "license",
    title: "Open-source license",
    level: FAIL,
    run() {
      const file = firstExisting(["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]);
      return file
        ? { ok: true, detail: `found ${file}` }
        : { ok: false, detail: "missing LICENSE, LICENSE.md, LICENSE.txt, or COPYING" };
    },
  },
  {
    id: "readme",
    title: "README with a real description",
    level: FAIL,
    run() {
      const file = firstExisting(["README.md", "README.MD", "Readme.md"]);
      if (!file) return { ok: false, detail: "missing README.md" };
      const text = read(file).trim();
      if (text.length < 200) {
        return { ok: false, detail: `${file} is shorter than 200 characters` };
      }
      return { ok: true, detail: `${file} is ${text.length} characters` };
    },
  },
  {
    id: "contributing",
    title: "Contributor guide",
    level: FAIL,
    run() {
      const file = firstExisting(["CONTRIBUTING.md", "docs/CONTRIBUTING.md"]);
      return file
        ? { ok: true, detail: `found ${file}` }
        : { ok: false, detail: "missing CONTRIBUTING.md" };
    },
  },
  {
    id: "security",
    title: "Security policy",
    level: FAIL,
    run() {
      const file = firstExisting(["SECURITY.md", "docs/SECURITY.md"]);
      return file
        ? { ok: true, detail: `found ${file}` }
        : { ok: false, detail: "missing SECURITY.md" };
    },
  },
  {
    id: "agents-md",
    title: "Codex repository policy",
    level: FAIL,
    run() {
      if (!isNonEmptyFile("AGENTS.md")) {
        return { ok: false, detail: "missing AGENTS.md" };
      }
      return { ok: true, detail: "found AGENTS.md" };
    },
  },
  {
    id: "changelog",
    title: "Changelog or release notes",
    level: WARN,
    run() {
      const file = firstExisting(["CHANGELOG.md", "CHANGES.md", "HISTORY.md"]);
      return file
        ? { ok: true, detail: `found ${file}` }
        : { ok: false, detail: "missing CHANGELOG.md" };
    },
  },
  {
    id: "gitignore",
    title: "Git ignore file",
    level: WARN,
    run() {
      return exists(".gitignore")
        ? { ok: true, detail: "found .gitignore" }
        : { ok: false, detail: "missing .gitignore" };
    },
  },
  {
    id: "issue-templates",
    title: "Issue templates",
    level: WARN,
    run() {
      const dir = path.join(root, ".github", "ISSUE_TEMPLATE");
      if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        return { ok: true, detail: "found .github/ISSUE_TEMPLATE" };
      }
      if (exists(".github/ISSUE_TEMPLATE.md") || exists(".github/ISSUE_TEMPLATE.yml")) {
        return { ok: true, detail: "found a single issue template" };
      }
      return { ok: false, detail: "no GitHub issue templates" };
    },
  },
  {
    id: "pr-template",
    title: "Pull request template",
    level: WARN,
    run() {
      const file = firstExisting([
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/pull_request_template.md",
        "docs/pull_request_template.md",
      ]);
      return file
        ? { ok: true, detail: `found ${file}` }
        : { ok: false, detail: "missing pull request template" };
    },
  },
  {
    id: "skills",
    title: "At least one Codex skill",
    level: FAIL,
    run() {
      const skills = listSkillManifests();
      return skills.length > 0
        ? { ok: true, detail: `found ${skills.length}: ${skills.join(", ")}` }
        : { ok: false, detail: "no .agents/skills/*/SKILL.md files" };
    },
  },
  {
    id: "recent-activity",
    title: "Recent git activity",
    level: WARN,
    run() {
      if (!exists(".git")) {
        return { ok: false, detail: "not a git repository yet" };
      }
      const age = lastCommitAgeDays();
      if (age === null) {
        return { ok: false, detail: "no commits yet" };
      }
      if (age > 45) {
        return { ok: false, detail: `last commit was ${age.toFixed(0)} days ago` };
      }
      return { ok: true, detail: `last commit ${age.toFixed(1)} days ago` };
    },
  },
  {
    id: "commit-span",
    title: "Maintenance is not a one-night dump",
    level: WARN,
    run() {
      if (!exists(".git")) {
        return { ok: false, detail: "not a git repository yet" };
      }
      const { commits, spanDays } = commitSpanDays();
      if (commits === 0) return { ok: false, detail: "no commits yet" };
      if (commits === 1 || (spanDays !== null && spanDays < 1 && commits < 3)) {
        return {
          ok: false,
          detail: `${commits} commit(s) spanning ${spanDays === null ? "?" : spanDays.toFixed(1)} days`,
        };
      }
      return {
        ok: true,
        detail: `${commits} commit(s) spanning ${spanDays === null ? "?" : spanDays.toFixed(1)} days`,
      };
    },
  },
];

function main() {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    const message = `Not a directory: ${root}`;
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(1);
  }

  const results = checks.map((check) => {
    const result = check.run();
    return {
      id: check.id,
      title: check.title,
      level: check.level,
      ok: result.ok,
      detail: result.detail,
      status: result.ok ? "pass" : check.level,
    };
  });

  const failed = results.filter((item) => !item.ok && item.level === FAIL);
  const warned = results.filter((item) => !item.ok && item.level === WARN);
  const passed = results.filter((item) => item.ok);
  const ok = failed.length === 0;

  const report = {
    ok,
    root,
    summary: {
      pass: passed.length,
      warn: warned.length,
      fail: failed.length,
    },
    checks: results,
  };

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`codex-oss-kit oss-ready\n`);
    process.stdout.write(`root: ${root}\n\n`);
    for (const item of results) {
      const mark = item.ok ? "PASS" : item.level.toUpperCase();
      process.stdout.write(`[${mark}] ${item.title} — ${item.detail}\n`);
    }
    process.stdout.write(
      `\n${passed.length} passed, ${warned.length} warning(s), ${failed.length} failing\n`,
    );
    if (!ok) {
      process.stdout.write("Fix failing checks before calling this repository OSS-ready.\n");
    }
  }

  process.exit(ok ? 0 : 1);
}

main();

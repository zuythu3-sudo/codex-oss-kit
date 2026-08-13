#!/usr/bin/env node
/**
 * Check README commands against files and package scripts in this repository.
 *
 * Usage:
 *   node docs-drift.mjs [path] [--json]
 *
 * Only inspects local npm scripts and relative `node <file>` paths.
 * Ignores clone, copy, and third-party install commands.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const rootArg = args.find((value) => !value.startsWith("-")) ?? ".";
const root = path.resolve(rootArg);

function readReadme() {
  for (const name of ["README.md", "README.MD", "Readme.md"]) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) return { name, text: fs.readFileSync(file, "utf8") };
  }
  return null;
}

function extractFencedCommands(markdown) {
  const blocks = [...markdown.matchAll(/```(?:bash|sh|shell|zsh|powershell|pwsh)?\s*\n([\s\S]*?)```/gi)];
  /** @type {string[]} */
  const commands = [];
  for (const match of blocks) {
    for (const line of match[1].split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      commands.push(trimmed.replace(/^\$\s+/, ""));
    }
  }
  return commands;
}

function packageScripts() {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} command
 * @param {Record<string, string>} scripts
 */
function inspect(command, scripts) {
  const npmRun = command.match(/^npm(?:\.cmd)?\s+run\s+([A-Za-z0-9:_-]+)/);
  if (npmRun) {
    const name = npmRun[1];
    return scripts[name]
      ? { kind: "npm-run", ok: true, detail: `package.json scripts.${name} exists` }
      : { kind: "npm-run", ok: false, detail: `package.json has no scripts.${name}` };
  }

  if (/^npm(?:\.cmd)?\s+test\b/.test(command)) {
    return scripts.test
      ? { kind: "npm-test", ok: true, detail: "package.json scripts.test exists" }
      : { kind: "npm-test", ok: false, detail: "package.json has no scripts.test" };
  }

  if (/^npm(?:\.cmd)?\s+ci\b/.test(command) || /^npm(?:\.cmd)?\s+install\b/.test(command)) {
    return { kind: "npm-install", ok: true, detail: "install command, not a repo script" };
  }

  const nodeFile = command.match(/^node\s+(?:"([^"]+\.m?js)"|'([^']+\.m?js)'|(\S+\.m?js))/);
  if (nodeFile) {
    const relative = nodeFile[1] || nodeFile[2] || nodeFile[3];
    if (relative.startsWith("http") || path.isAbsolute(relative)) {
      return { kind: "node-file", ok: true, detail: "non-local node target, skipped" };
    }
    const target = path.join(root, relative);
    return fs.existsSync(target)
      ? { kind: "node-file", ok: true, detail: `${relative} exists` }
      : { kind: "node-file", ok: false, detail: `${relative} does not exist` };
  }

  return { kind: "ignored", ok: true, detail: "not a local script or node path" };
}

function main() {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    const message = `Not a directory: ${root}`;
    if (jsonMode) process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    else process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  const readme = readReadme();
  if (!readme) {
    const report = { ok: false, root, error: "missing README.md", findings: [] };
    if (jsonMode) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stdout.write("docs-drift: missing README.md\n");
    process.exit(1);
  }

  const scripts = packageScripts();
  const commands = extractFencedCommands(readme.text);
  const findings = commands.map((command) => {
    const result = inspect(command, scripts);
    return { command, ...result };
  });

  const checked = findings.filter((item) => item.kind !== "ignored");
  const failed = checked.filter((item) => !item.ok);
  const ok = failed.length === 0;

  const report = {
    ok,
    root,
    readme: readme.name,
    summary: {
      commands: commands.length,
      checked: checked.length,
      fail: failed.length,
    },
    findings,
  };

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`codex-oss-kit docs-drift\n`);
    process.stdout.write(`readme: ${readme.name}\n\n`);
    if (checked.length === 0) {
      process.stdout.write("No local npm or node commands found in fenced code blocks.\n");
    }
    for (const item of findings) {
      if (item.kind === "ignored") continue;
      process.stdout.write(`[${item.ok ? "PASS" : "FAIL"}] ${item.command} — ${item.detail}\n`);
    }
    process.stdout.write(
      `\n${checked.length} checked, ${failed.length} failing, ${commands.length - checked.length} ignored\n`,
    );
  }

  process.exit(ok ? 0 : 1);
}

main();

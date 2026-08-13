#!/usr/bin/env node
/**
 * Check README commands against files and package manifests in this repository.
 *
 * Usage:
 *   node docs-drift.mjs [path] [--json]
 *
 * Checks local npm/yarn/pnpm/bun scripts, relative interpreter files,
 * Makefile targets, Cargo/Go manifests, and local script paths.
 * Ignores clone, copy, and third-party install commands.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const rootArg = args.find((value) => !value.startsWith("-")) ?? ".";
const root = path.resolve(rootArg);

function existsHere(relative) {
  const resolved = resolveLocal(relative);
  return Boolean(resolved && fs.existsSync(resolved));
}

function resolveLocal(relative) {
  if (!relative) return null;
  const cleaned = relative.replace(/^(\.\/|\\\.?\\)/, "").replace(/\\/g, "/");
  if (
    !cleaned ||
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("~/") ||
    path.isAbsolute(cleaned)
  ) {
    return null;
  }
  const resolved = path.resolve(root, cleaned);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return resolved;
}

function readReadme() {
  for (const name of ["README.md", "README.MD", "Readme.md"]) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) return { name, text: fs.readFileSync(file, "utf8") };
  }
  return null;
}

function extractFencedCommands(markdown) {
  const blocks = [
    ...markdown.matchAll(/```(?:bash|sh|shell|zsh|powershell|pwsh|console|text)?\s*\n([\s\S]*?)```/gi),
  ];
  /** @type {string[]} */
  const commands = [];
  for (const match of blocks) {
    for (const line of match[1].split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      commands.push(trimmed.replace(/^\$\s+/, "").replace(/^PS>[.\s]*/, ""));
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

function makefileTargets() {
  /** @type {Set<string>} */
  const targets = new Set();
  for (const name of ["Makefile", "makefile", "GNUmakefile"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*):/);
      if (match && match[1] !== ".PHONY") targets.add(match[1]);
    }
  }
  return targets;
}

function hasPythonTests() {
  return [
    "pytest.ini",
    "conftest.py",
    "pyproject.toml",
    "setup.cfg",
    "tox.ini",
    "tests",
    "test",
  ].some((name) => fs.existsSync(path.join(root, name)));
}

/**
 * @param {string} command
 */
function firstToken(command) {
  const match = command.match(/^("([^"]+)"|'([^']+)'|(\S+))/);
  return match ? match[2] || match[3] || match[4] : "";
}

/**
 * @param {string} command
 * @param {Record<string, string>} scripts
 * @param {Set<string>} targets
 */
function inspect(command, scripts, targets) {
  const npmRun = command.match(/^(?:npm(?:\.cmd)?|yarn|pnpm|bun)\s+run\s+([A-Za-z0-9:_-]+)/);
  if (npmRun) {
    const name = npmRun[1];
    return scripts[name]
      ? { kind: "pkg-run", ok: true, detail: `package.json scripts.${name} exists` }
      : { kind: "pkg-run", ok: false, detail: `package.json has no scripts.${name}` };
  }

  if (/^(?:npm(?:\.cmd)?|yarn|pnpm|bun)\s+test\b/.test(command)) {
    return scripts.test
      ? { kind: "pkg-test", ok: true, detail: "package.json scripts.test exists" }
      : { kind: "pkg-test", ok: false, detail: "package.json has no scripts.test" };
  }

  if (
    /^(?:npm(?:\.cmd)?|yarn|pnpm|bun)\s+(?:ci|install|i)\b/.test(command) ||
    /^pip(?:3)?\s+install\s+(?!-r\b)/.test(command) ||
    /^uv\s+pip\s+install\s+(?!-r\b)/.test(command)
  ) {
    return { kind: "pkg-install", ok: true, detail: "install command, not a repo script" };
  }

  const pipReq = command.match(/^(?:pip(?:3)?|uv\s+pip)\s+install\s+-r\s+(\S+)/);
  if (pipReq) {
    const file = pipReq[1];
    return existsHere(file)
      ? { kind: "pip-requirements", ok: true, detail: `${file} exists` }
      : { kind: "pip-requirements", ok: false, detail: `${file} does not exist` };
  }

  const nodeFile = command.match(
    /^(?:node|nodejs)\s+(?:"([^"]+\.m?[jt]s)"|'([^']+\.m?[jt]s)'|(\S+\.m?[jt]s))/,
  );
  if (nodeFile) {
    const relative = nodeFile[1] || nodeFile[2] || nodeFile[3];
    if (!resolveLocal(relative)) {
      return { kind: "node-file", ok: true, detail: "non-local node target, skipped" };
    }
    return existsHere(relative)
      ? { kind: "node-file", ok: true, detail: `${relative} exists` }
      : { kind: "node-file", ok: false, detail: `${relative} does not exist` };
  }

  const pyFile = command.match(
    /^(?:python3?|py(?:\s+-3)?)\s+(?:"([^"]+\.py)"|'([^']+\.py)'|(\S+\.py))/,
  );
  if (pyFile) {
    const relative = pyFile[1] || pyFile[2] || pyFile[3];
    if (!resolveLocal(relative)) {
      return { kind: "python-file", ok: true, detail: "non-local python target, skipped" };
    }
    return existsHere(relative)
      ? { kind: "python-file", ok: true, detail: `${relative} exists` }
      : { kind: "python-file", ok: false, detail: `${relative} does not exist` };
  }

  if (/^(?:python3?|py(?:\s+-3)?)\s+-m\s+pytest\b/.test(command) || /^pytest\b/.test(command)) {
    return hasPythonTests()
      ? { kind: "pytest", ok: true, detail: "python test layout exists" }
      : { kind: "pytest", ok: false, detail: "no pytest.ini, pyproject.toml, or tests/ directory" };
  }

  const makeTarget = command.match(/^make\s+([A-Za-z0-9._-]+)/);
  if (makeTarget) {
    const name = makeTarget[1];
    if (targets.size === 0) {
      return { kind: "make", ok: false, detail: `no Makefile, cannot run make ${name}` };
    }
    return targets.has(name)
      ? { kind: "make", ok: true, detail: `Makefile has target ${name}` }
      : { kind: "make", ok: false, detail: `Makefile has no target ${name}` };
  }
  if (/^make\s*$/.test(command)) {
    return fs.existsSync(path.join(root, "Makefile")) ||
      fs.existsSync(path.join(root, "makefile")) ||
      fs.existsSync(path.join(root, "GNUmakefile"))
      ? { kind: "make", ok: true, detail: "Makefile exists" }
      : { kind: "make", ok: false, detail: "no Makefile" };
  }

  if (/^cargo\s+(?:test|build|run|check|clippy|fmt)\b/.test(command)) {
    return fs.existsSync(path.join(root, "Cargo.toml"))
      ? { kind: "cargo", ok: true, detail: "Cargo.toml exists" }
      : { kind: "cargo", ok: false, detail: "no Cargo.toml" };
  }

  const goRun = command.match(/^go\s+run\s+(\S+)/);
  if (goRun) {
    const target = goRun[1];
    if (target.startsWith(".")) {
      return existsHere(target)
        ? { kind: "go-run", ok: true, detail: `${target} exists` }
        : { kind: "go-run", ok: false, detail: `${target} does not exist` };
    }
    if (target.endsWith(".go")) {
      return existsHere(target)
        ? { kind: "go-run", ok: true, detail: `${target} exists` }
        : { kind: "go-run", ok: false, detail: `${target} does not exist` };
    }
  }
  if (/^go\s+(?:test|build|vet|mod)\b/.test(command)) {
    return fs.existsSync(path.join(root, "go.mod"))
      ? { kind: "go", ok: true, detail: "go.mod exists" }
      : { kind: "go", ok: false, detail: "no go.mod" };
  }

  const script = command.match(
    /^(?:bash|sh|zsh|pwsh|powershell)\s+(?:"([^"]+)"|'([^']+)'|(\.[/\w\\.-]+|\w[\w./\\-]*\.(?:sh|ps1|bash)))/,
  );
  if (script) {
    const relative = script[1] || script[2] || script[3];
    return existsHere(relative)
      ? { kind: "shell-script", ok: true, detail: `${relative} exists` }
      : { kind: "shell-script", ok: false, detail: `${relative} does not exist` };
  }

  const token = firstToken(command);
  if (token.startsWith("./") || token.startsWith(".\\")) {
    return existsHere(token)
      ? { kind: "local-bin", ok: true, detail: `${token} exists` }
      : { kind: "local-bin", ok: false, detail: `${token} does not exist` };
  }

  return { kind: "ignored", ok: true, detail: "not a local script or project command" };
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
  const targets = makefileTargets();
  const commands = extractFencedCommands(readme.text);
  const findings = commands.map((command) => {
    const result = inspect(command, scripts, targets);
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
      process.stdout.write("No local project commands found in fenced code blocks.\n");
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

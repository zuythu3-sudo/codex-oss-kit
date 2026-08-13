#!/usr/bin/env node
/**
 * Check README commands against files and package manifests in this repository.
 *
 * Usage:
 *   node docs-drift.mjs [path] [--json] [--lang en|zh]
 *
 * Checks local npm/yarn/pnpm/bun scripts, relative interpreter files,
 * Makefile targets, Cargo/Go manifests, and local script paths.
 * Ignores clone, copy, and third-party install commands.
 */

import fs from "node:fs";
import path from "node:path";
import { parseCli, resolveLang, t } from "../../_shared/i18n.mjs";

const { flags, opts, positionals } = parseCli(process.argv.slice(2));
const jsonMode = flags.has("json");
const lang = resolveLang(opts.lang);
const rootArg = positionals[0] ?? ".";
const root = path.resolve(rootArg);

/** Package-manager verbs that are not package.json scripts. */
const PACKAGE_MANAGER_RESERVED = new Set([
  "add", "audit", "bin", "cache", "ci", "config", "create", "dedupe", "dlx",
  "exec", "explain", "fund", "global", "help", "i", "import", "info", "init",
  "install", "link", "login", "logout", "outdated", "owner", "pack", "patch",
  "pkg", "plugin", "pm", "prune", "publish", "rebuild", "remove", "rm", "run",
  "search", "set", "test", "unlink", "unplugin", "up", "update", "upgrade",
  "version", "why", "workspace", "workspaces", "x",
]);

function existsHere(relative) {
  const resolved = resolveLocal(relative);
  return Boolean(resolved && fs.existsSync(resolved));
}

function resolveLocal(relative) {
  if (!relative) return null;
  const posix = relative.replace(/\\/g, "/");
  if (posix === "." || posix === "./") {
    return root;
  }
  const cleaned = posix.replace(/^\.\//, "");
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

function readIfFile(relative) {
  const resolved = resolveLocal(relative);
  if (!resolved || !fs.existsSync(resolved)) return null;
  try {
    if (!fs.statSync(resolved).isFile()) return null;
    return fs.readFileSync(resolved, "utf8");
  } catch {
    return null;
  }
}

function listNames(relative) {
  const dir = relative === "." || relative === "./" ? root : resolveLocal(relative);
  if (!dir || !fs.existsSync(dir)) return [];
  try {
    if (!fs.statSync(dir).isDirectory()) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readReadme() {
  for (const name of ["README.md", "README.MD", "Readme.md", "readme.md"]) {
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
  if (
    existsHere("pytest.ini") ||
    existsHere("conftest.py") ||
    existsHere("tests/conftest.py") ||
    existsHere("test/conftest.py") ||
    existsHere("tox.ini")
  ) {
    return true;
  }
  const pyproject = readIfFile("pyproject.toml");
  if (pyproject && /\[tool\.pytest\b/.test(pyproject)) return true;
  const setupCfg = readIfFile("setup.cfg");
  if (setupCfg && /\[(?:tool:)?pytest\]/.test(setupCfg)) return true;
  const names = [...listNames("tests"), ...listNames("test"), ...listNames(".")];
  return names.some(
    (name) =>
      (name.startsWith("test_") && name.endsWith(".py")) || name.endsWith("_test.py"),
  );
}

/**
 * @param {string} command
 */
function firstToken(command) {
  const match = command.match(/^("([^"]+)"|'([^']+)'|(\S+))/);
  return match ? match[2] || match[3] || match[4] : "";
}

/**
 * @param {string} name
 * @param {Record<string, string>} scripts
 */
function pair(en, zh) {
  return { en, zh };
}

function existsText(name) {
  return pair(`${name} exists`, `${name} 存在`);
}

function missingText(name) {
  return pair(`${name} does not exist`, `${name} 不存在`);
}

function scriptCheck(name, scripts) {
  return scripts[name]
    ? { kind: "pkg-run", ok: true, text: pair(`package.json scripts.${name} exists`, `package.json 中存在 scripts.${name}`) }
    : { kind: "pkg-run", ok: false, text: pair(`package.json has no scripts.${name}`, `package.json 没有 scripts.${name}`) };
}

/**
 * @param {string} command
 * @param {Record<string, string>} scripts
 * @param {Set<string>} targets
 */
function inspect(command, scripts, targets) {
  const npmRun = command.match(/^(?:npm(?:\.cmd)?|yarn|pnpm|bun)\s+run\s+([A-Za-z0-9:_-]+)/);
  if (npmRun) {
    return scriptCheck(npmRun[1], scripts);
  }

  if (command === "bun test" || command.startsWith("bun test ")) {
    const bunProject =
      existsHere("package.json") || existsHere("bun.lockb") || existsHere("bun.lock");
    return bunProject
      ? { kind: "bun-test", ok: true, text: pair("bun test does not require scripts.test", "bun test 不需要 scripts.test") }
      : { kind: "bun-test", ok: false, text: pair("no package.json, bun.lock, or bun.lockb", "没有 package.json、bun.lock 或 bun.lockb") };
  }

  if (/^(?:npm(?:\.cmd)?|yarn|pnpm)\s+test\b/.test(command)) {
    return scripts.test
      ? { kind: "pkg-test", ok: true, text: pair("package.json scripts.test exists", "package.json 中存在 scripts.test") }
      : { kind: "pkg-test", ok: false, text: pair("package.json has no scripts.test", "package.json 没有 scripts.test") };
  }

  const npmTokens = command.split(/\s+/);
  const npmBin = npmTokens[0] === "npm" || npmTokens[0] === "npm.cmd";
  const life = npmBin ? npmTokens[1] : "";
  if (life === "start" || life === "stop" || life === "restart") {
    if (life === "restart") {
      return scripts.restart || scripts.start
        ? { kind: "pkg-run", ok: true, text: pair("package.json scripts.restart or scripts.start exists", "package.json 中存在 scripts.restart 或 scripts.start") }
        : { kind: "pkg-run", ok: false, text: pair("package.json has no scripts.restart or scripts.start", "package.json 没有 scripts.restart 或 scripts.start") };
    }
    return scriptCheck(life, scripts);
  }

  if (
    /^(?:npm(?:\.cmd)?|yarn|pnpm|bun)\s+(?:ci|install|i)\b/.test(command) ||
    /^pip(?:3)?\s+install\s+(?!-r\b)/.test(command) ||
    /^uv\s+pip\s+install\s+(?!-r\b)/.test(command)
  ) {
    return { kind: "pkg-install", ok: true, text: pair("install command, not a repo script", "安装命令，不是仓库脚本") };
  }

  const pkgShorthand = command.match(/^(?:yarn|pnpm|bun)\s+([A-Za-z0-9:_-]+)/);
  if (pkgShorthand) {
    const name = pkgShorthand[1];
    if (!PACKAGE_MANAGER_RESERVED.has(name)) {
      return scriptCheck(name, scripts);
    }
  }

  const pipReq = command.match(/^(?:pip(?:3)?|uv\s+pip)\s+install\s+-r\s+(\S+)/);
  if (pipReq) {
    const file = pipReq[1];
    return existsHere(file)
      ? { kind: "pip-requirements", ok: true, text: existsText(file) }
      : { kind: "pip-requirements", ok: false, text: missingText(file) };
  }

  const nodeFile = command.match(
    /^(?:node|nodejs)\s+(?:"([^"]+\.m?[jt]s)"|'([^']+\.m?[jt]s)'|(\S+\.m?[jt]s))/,
  );
  if (nodeFile) {
    const relative = nodeFile[1] || nodeFile[2] || nodeFile[3];
    if (!resolveLocal(relative)) {
      return { kind: "node-file", ok: true, text: pair("non-local node target, skipped", "非本地 node 目标，已跳过") };
    }
    return existsHere(relative)
      ? { kind: "node-file", ok: true, text: existsText(relative) }
      : { kind: "node-file", ok: false, text: missingText(relative) };
  }

  const pyFile = command.match(
    /^(?:python3?|py(?:\s+-3)?)\s+(?:"([^"]+\.py)"|'([^']+\.py)'|(\S+\.py))/,
  );
  if (pyFile) {
    const relative = pyFile[1] || pyFile[2] || pyFile[3];
    if (!resolveLocal(relative)) {
      return { kind: "python-file", ok: true, text: pair("non-local python target, skipped", "非本地 python 目标，已跳过") };
    }
    return existsHere(relative)
      ? { kind: "python-file", ok: true, text: existsText(relative) }
      : { kind: "python-file", ok: false, text: missingText(relative) };
  }

  if (/^(?:python3?|py(?:\s+-3)?)\s+-m\s+pytest\b/.test(command) || /^pytest\b/.test(command)) {
    return hasPythonTests()
      ? { kind: "pytest", ok: true, text: pair("python test layout exists", "已找到 Python 测试布局") }
      : { kind: "pytest", ok: false, text: pair("no pytest.ini, conftest.py, pytest config, or Python test files", "没有 pytest.ini、conftest.py、pytest 配置或 Python 测试文件") };
  }

  const makeTarget = command.match(/^make\s+([A-Za-z0-9._-]+)/);
  if (makeTarget) {
    const name = makeTarget[1];
    if (targets.size === 0) {
      return { kind: "make", ok: false, text: pair(`no Makefile, cannot run make ${name}`, `没有 Makefile，无法执行 make ${name}`) };
    }
    return targets.has(name)
      ? { kind: "make", ok: true, text: pair(`Makefile has target ${name}`, `Makefile 有目标 ${name}`) }
      : { kind: "make", ok: false, text: pair(`Makefile has no target ${name}`, `Makefile 没有目标 ${name}`) };
  }
  if (/^make\s*$/.test(command)) {
    return fs.existsSync(path.join(root, "Makefile")) ||
      fs.existsSync(path.join(root, "makefile")) ||
      fs.existsSync(path.join(root, "GNUmakefile"))
      ? { kind: "make", ok: true, text: pair("Makefile exists", "已找到 Makefile") }
      : { kind: "make", ok: false, text: pair("no Makefile", "没有 Makefile") };
  }

  if (/^cargo\s+(?:test|build|run|check|clippy|fmt)\b/.test(command)) {
    return fs.existsSync(path.join(root, "Cargo.toml"))
      ? { kind: "cargo", ok: true, text: pair("Cargo.toml exists", "已找到 Cargo.toml") }
      : { kind: "cargo", ok: false, text: pair("no Cargo.toml", "没有 Cargo.toml") };
  }

  const goRun = command.match(/^go\s+run\s+(\S+)/);
  if (goRun) {
    const target = goRun[1];
    if (target.startsWith(".")) {
      return existsHere(target)
        ? { kind: "go-run", ok: true, text: existsText(target) }
        : { kind: "go-run", ok: false, text: missingText(target) };
    }
    if (target.endsWith(".go")) {
      return existsHere(target)
        ? { kind: "go-run", ok: true, text: existsText(target) }
        : { kind: "go-run", ok: false, text: missingText(target) };
    }
  }
  if (/^go\s+(?:test|build|vet|mod)\b/.test(command)) {
    return fs.existsSync(path.join(root, "go.mod"))
      ? { kind: "go", ok: true, text: pair("go.mod exists", "已找到 go.mod") }
      : { kind: "go", ok: false, text: pair("no go.mod", "没有 go.mod") };
  }

  const script = command.match(
    /^(?:bash|sh|zsh|pwsh|powershell)\s+(?:"([^"]+)"|'([^']+)'|(\.[/\w\\.-]+|\w[\w./\\-]*\.(?:sh|ps1|bash)))/,
  );
  if (script) {
    const relative = script[1] || script[2] || script[3];
    return existsHere(relative)
      ? { kind: "shell-script", ok: true, text: existsText(relative) }
      : { kind: "shell-script", ok: false, text: missingText(relative) };
  }

  const token = firstToken(command);
  if (token.startsWith("./") || token.startsWith(".\\")) {
    return existsHere(token)
      ? { kind: "local-bin", ok: true, text: existsText(token) }
      : { kind: "local-bin", ok: false, text: missingText(token) };
  }

  return { kind: "ignored", ok: true, text: pair("not a local script or project command", "不是本地脚本或项目命令") };
}

function main() {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    const message = t(lang, { en: `Not a directory: ${root}`, zh: `不是目录：${root}` });
    if (jsonMode) process.stdout.write(`${JSON.stringify({ ok: false, error: message, lang }, null, 2)}\n`);
    else process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  const readme = readReadme();
  if (!readme) {
    const error = t(lang, { en: "missing README.md", zh: "缺少 README.md" });
    const report = { ok: false, root, lang, error, findings: [] };
    if (jsonMode) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stdout.write(`docs-drift: ${error}\n`);
    process.exit(1);
  }

  const scripts = packageScripts();
  const targets = makefileTargets();
  const commands = extractFencedCommands(readme.text);
  const findings = commands.map((command) => {
    const result = inspect(command, scripts, targets);
    return {
      command,
      kind: result.kind,
      ok: result.ok,
      detail: result.text.en,
      text: result.text,
    };
  });

  const checked = findings.filter((item) => item.kind !== "ignored");
  const failed = checked.filter((item) => !item.ok);
  const ok = failed.length === 0;

  const report = {
    ok,
    root,
    lang,
    readme: readme.name,
    summary: {
      commands: commands.length,
      checked: checked.length,
      fail: failed.length,
    },
    findings: findings.map(({ command, kind, ok, detail }) => ({ command, kind, ok, detail })),
  };

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`codex-oss-kit docs-drift\n`);
    process.stdout.write(`readme: ${readme.name}\n\n`);
    if (checked.length === 0) {
      process.stdout.write(
        t(lang, {
          en: "No local project commands found in fenced code blocks.\n",
          zh: "代码块里没有发现本地项目命令。\n",
        }),
      );
    }
    for (const item of findings) {
      if (item.kind === "ignored") continue;
      const mark = item.ok ? (lang === "zh" ? "通过" : "PASS") : lang === "zh" ? "失败" : "FAIL";
      process.stdout.write(`[${mark}] ${item.command} — ${t(lang, item.text)}\n`);
    }
    process.stdout.write(
      lang === "zh"
        ? `\n已检查 ${checked.length} 条，失败 ${failed.length} 条，忽略 ${commands.length - checked.length} 条\n`
        : `\n${checked.length} checked, ${failed.length} failing, ${commands.length - checked.length} ignored\n`,
    );
  }

  process.exit(ok ? 0 : 1);
}

main();

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const checker = path.join(repoRoot, ".agents/skills/docs-drift/scripts/docs-drift.mjs");

function run(cwd) {
  return spawnSync(process.execPath, [checker, cwd, "--json"], {
    encoding: "utf8",
  });
}

test("self README local commands exist", () => {
  const result = run(repoRoot);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.ok(report.summary.checked >= 2);
});

test("stale npm script is reported", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ scripts: { test: "node --test" } }),
  );
  fs.writeFileSync(
    path.join(root, "README.md"),
    ["# demo", "", "```bash", "npm run missing-script", "```", ""].join("\n"),
  );
  const result = run(root);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((item) => item.ok === false && item.kind === "pkg-run"));
});

function writeReadme(root, commands) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "README.md"),
    ["# demo", "", "```bash", ...commands, "```", ""].join("\n"),
  );
}

test("make, python, cargo, go, and local scripts are checked", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-poly-"));
  writeReadme(root, [
    "make release",
    "python tools/check.py",
    "pytest",
    "pip install -r requirements.txt",
    "cargo test",
    "go test ./...",
    "./scripts/setup.sh",
  ]);
  fs.writeFileSync(path.join(root, "Makefile"), "release:\n\techo ok\n");
  fs.mkdirSync(path.join(root, "tools"));
  fs.writeFileSync(path.join(root, "tools/check.py"), "print('ok')\n");
  fs.mkdirSync(path.join(root, "tests"));
  fs.writeFileSync(path.join(root, "requirements.txt"), "pytest\n");
  fs.writeFileSync(path.join(root, "Cargo.toml"), "[package]\nname = \"demo\"\n");
  fs.writeFileSync(path.join(root, "go.mod"), "module example.com/demo\n");
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "scripts/setup.sh"), "#!/bin/sh\n");

  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.fail, 0);
});

test("stale make, python, cargo, and script commands fail", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-stale-"));
  writeReadme(root, [
    "make missing",
    "python missing.py",
    "cargo test",
    "./bin/setup.sh",
  ]);
  fs.writeFileSync(path.join(root, "Makefile"), "build:\n\techo ok\n");
  const result = run(root);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const kinds = report.findings.filter((item) => !item.ok).map((item) => item.kind);
  assert.ok(kinds.includes("make"));
  assert.ok(kinds.includes("python-file"));
  assert.ok(kinds.includes("cargo"));
  assert.ok(kinds.includes("local-bin"));
});

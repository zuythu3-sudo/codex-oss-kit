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

test("--lang zh localizes the summary", () => {
  const result = spawnSync(
    process.execPath,
    [checker, repoRoot, "--lang", "zh"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /已检查/);
});

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
  fs.writeFileSync(path.join(root, "tests/test_demo.py"), "def test_ok():\n    assert True\n");
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

test("go run . and go run ./ resolve to the repo root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-gorun-"));
  writeReadme(root, ["go run .", "go run ./"]);
  fs.writeFileSync(path.join(root, "main.go"), "package main\nfunc main() {}\n");
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const goRun = report.findings.filter((item) => item.kind === "go-run");
  assert.equal(goRun.length, 2);
  assert.ok(goRun.every((item) => item.ok));
});

test("empty tests directory is not a pytest layout", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-empty-tests-"));
  writeReadme(root, ["pytest"]);
  fs.mkdirSync(path.join(root, "tests"));
  const result = run(root);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const pytest = report.findings.find((item) => item.kind === "pytest");
  assert.equal(pytest.ok, false);
  assert.match(pytest.detail, /Python test files/);
});

test("pytest.ini or tests/test_*.py is a pytest layout", () => {
  const withIni = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-pytest-ini-"));
  writeReadme(withIni, ["pytest"]);
  fs.writeFileSync(path.join(withIni, "pytest.ini"), "[pytest]\n");
  const iniResult = run(withIni);
  assert.equal(iniResult.status, 0, iniResult.stderr || iniResult.stdout);
  assert.equal(JSON.parse(iniResult.stdout).ok, true);

  const withFile = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-pytest-file-"));
  writeReadme(withFile, ["python -m pytest"]);
  fs.mkdirSync(path.join(withFile, "tests"));
  fs.writeFileSync(path.join(withFile, "tests/test_demo.py"), "def test_ok():\n    pass\n");
  const fileResult = run(withFile);
  assert.equal(fileResult.status, 0, fileResult.stderr || fileResult.stdout);
  assert.equal(JSON.parse(fileResult.stdout).ok, true);
});

test("bun test does not require scripts.test", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-bun-"));
  writeReadme(root, ["bun test"]);
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "demo" }));
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const finding = report.findings.find((item) => item.kind === "bun-test");
  assert.equal(finding.ok, true);
});

test("npm start and yarn build check package.json scripts", () => {
  const okRoot = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-scripts-ok-"));
  writeReadme(okRoot, ["npm start", "yarn build"]);
  fs.writeFileSync(
    path.join(okRoot, "package.json"),
    JSON.stringify({ scripts: { start: "node server.js", build: "echo build" } }),
  );
  const okResult = run(okRoot);
  assert.equal(okResult.status, 0, okResult.stderr || okResult.stdout);
  const okReport = JSON.parse(okResult.stdout);
  assert.equal(okReport.ok, true);
  assert.equal(okReport.findings.filter((item) => item.kind === "pkg-run").length, 2);

  const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), "docs-drift-scripts-bad-"));
  writeReadme(badRoot, ["npm start", "yarn build"]);
  fs.writeFileSync(
    path.join(badRoot, "package.json"),
    JSON.stringify({ scripts: { test: "node --test" } }),
  );
  const badResult = run(badRoot);
  assert.equal(badResult.status, 1);
  const badReport = JSON.parse(badResult.stdout);
  const failed = badReport.findings.filter((item) => !item.ok);
  assert.equal(failed.length, 2);
  assert.ok(failed.every((item) => item.kind === "pkg-run"));
});

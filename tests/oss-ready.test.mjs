import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const checker = path.join(repoRoot, ".agents/skills/oss-ready/scripts/oss-ready.mjs");

function run(cwd, extraArgs = []) {
  return spawnSync(process.execPath, [checker, cwd, ...extraArgs], {
    encoding: "utf8",
  });
}

function write(root, relative, contents = "ok\n") {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function makeCompleteRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-complete-"));
  write(root, "LICENSE", "MIT\n");
  write(root, "README.md", `${"A public maintainer kit. ".repeat(20)}\n`);
  write(root, "CONTRIBUTING.md");
  write(root, "SECURITY.md");
  write(root, "AGENTS.md", "# agents\n");
  write(root, "CHANGELOG.md", "## 0.1.0\n");
  write(root, ".gitignore", "node_modules\n");
  write(root, ".github/ISSUE_TEMPLATE/bug.yml", "name: Bug\n");
  write(root, ".github/PULL_REQUEST_TEMPLATE.md", "## What\n");
  write(root, ".agents/skills/demo/SKILL.md", "---\nname: demo\ndescription: demo\n---\n");
  return root;
}

test("self repository is ready or only has warnings", () => {
  const result = run(repoRoot, ["--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.ok(report.summary.fail === 0);
});

test("incomplete repository fails", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-empty-"));
  write(root, "README.md", "too short\n");
  const result = run(root, ["--json"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  const failedIds = report.checks.filter((item) => item.status === "fail").map((item) => item.id);
  assert.ok(failedIds.includes("license"));
  assert.ok(failedIds.includes("skills"));
});

test("complete file set passes fail-level checks", () => {
  const root = makeCompleteRepo();
  const result = run(root, ["--json"]);
  const report = JSON.parse(result.stdout);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(report.ok, true);
  const failed = report.checks.filter((item) => item.status === "fail");
  assert.deepEqual(failed, []);
});

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
  assert.ok(report.findings.some((item) => item.ok === false && item.kind === "npm-run"));
});

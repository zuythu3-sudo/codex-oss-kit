import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const script = path.join(repoRoot, ".agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs");

function run(target, extra = []) {
  return spawnSync(process.execPath, [script, target, ...extra], { encoding: "utf8" });
}

test("dry-run does not write files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-dry-"));
  const result = run(root, ["--dry-run", "--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.ok(report.skills.every((item) => item.action === "would-copy"));
  assert.equal(report.agents.action, "would-write");
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), false);
  assert.equal(fs.existsSync(path.join(root, ".agents")), false);
});

test("bootstrap copies skills and writes AGENTS.md with detected npm test", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-write-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  const result = run(root, ["--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.ok(report.skills.every((item) => item.action === "copied"));
  assert.equal(report.agents.action, "wrote");
  assert.equal(fs.existsSync(path.join(root, ".agents/skills/oss-ready/SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(root, ".agents/skills/docs-drift/scripts/docs-drift.mjs")), true);
  assert.equal(fs.existsSync(path.join(root, ".agents/skills/bootstrap-kit")), false);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /npm test/);
});

test("existing AGENTS.md is left alone without --force", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-keep-"));
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# keep me\n");
  const result = run(root, ["--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.agents.action, "skipped");
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), "# keep me\n");
});

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

test("package exposes a matching npx binary for bootstrap", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.bin["codex-oss-kit"], "./.agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs");
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents/skills/bootstrap-kit/scripts/bootstrap-kit.mjs")),
    true,
  );
});

test("reusable GitHub Action points at real checkers", () => {
  const actionFile = path.join(repoRoot, "action.yml");
  const text = fs.readFileSync(actionFile, "utf8");
  assert.match(text, /oss-ready\.mjs/);
  assert.match(text, /docs-drift\.mjs/);
  assert.match(text, /GITHUB_STEP_SUMMARY/);
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents/skills/oss-ready/scripts/oss-ready.mjs")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents/skills/docs-drift/scripts/docs-drift.mjs")),
    true,
  );
});

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

function hygieneFiles(root) {
  write(root, "LICENSE", "MIT\n");
  write(root, "README.md", `${"A public maintainer kit. ".repeat(20)}\n`);
  write(root, "CONTRIBUTING.md");
  write(root, "SECURITY.md");
  write(root, "AGENTS.md", "# agents\n");
}

function skillCheck(root, id) {
  const result = run(root, ["--json"]);
  const report = JSON.parse(result.stdout);
  return report.checks.find((item) => item.id === id);
}

test("skills/name/SKILL.md counts as a Codex skill", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-skills-dir-"));
  hygieneFiles(root);
  write(root, "skills/demo/SKILL.md", "---\nname: demo\ndescription: demo\n---\n");
  const skills = skillCheck(root, "skills");
  const layout = skillCheck(root, "skills-layout");
  assert.equal(skills.status, "pass");
  assert.equal(layout.status, "pass");
});

test("top-level skill folders pass with a layout warning", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-alt-skill-"));
  hygieneFiles(root);
  write(root, "review-swarm/SKILL.md", "---\nname: review-swarm\ndescription: demo\n---\n");
  const skills = skillCheck(root, "skills");
  const layout = skillCheck(root, "skills-layout");
  assert.equal(skills.status, "pass");
  assert.equal(layout.status, "warn");
});

test("GitHub-canonical hygiene paths and lowercase readme.md are accepted", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-github-paths-"));
  write(root, "LICENSE", "MIT\n");
  write(root, "readme.md", `${"A public maintainer kit. ".repeat(20)}\n`);
  write(root, ".github/CONTRIBUTING.md");
  write(root, ".github/SECURITY.md");
  write(root, ".github/PULL_REQUEST_TEMPLATE.md", "## What\n");
  write(root, "AGENTS.md", "# agents\n");
  write(root, ".agents/skills/demo/SKILL.md", "---\nname: demo\ndescription: demo\n---\n");
  const report = JSON.parse(run(root, ["--json"]).stdout);
  assert.equal(report.checks.find((item) => item.id === "readme").status, "pass");
  assert.equal(report.checks.find((item) => item.id === "contributing").status, "pass");
  assert.equal(report.checks.find((item) => item.id === "security").status, "pass");
  assert.equal(report.checks.find((item) => item.id === "pr-template").status, "pass");
});

test("PULL_REQUEST_TEMPLATE directory counts as a pull request template", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-pr-dir-"));
  hygieneFiles(root);
  write(root, ".agents/skills/demo/SKILL.md", "---\nname: demo\ndescription: demo\n---\n");
  write(root, ".github/PULL_REQUEST_TEMPLATE/default.md", "## What\n");
  const pr = skillCheck(root, "pr-template");
  assert.equal(pr.status, "pass");
  assert.match(pr.detail, /PULL_REQUEST_TEMPLATE/);
});

test("nested foo/skills/bar/SKILL.md counts with a layout warning", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oss-ready-nested-skill-"));
  hygieneFiles(root);
  write(root, "foo/skills/bar/SKILL.md", "---\nname: bar\ndescription: demo\n---\n");
  const skills = skillCheck(root, "skills");
  const layout = skillCheck(root, "skills-layout");
  assert.equal(skills.status, "pass");
  assert.equal(layout.status, "warn");
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseCli, resolveLang, t } from "../.agents/skills/_shared/i18n.mjs";

test("parseCli keeps --lang value out of the path", () => {
  const parsed = parseCli(["--json", "--lang", "zh", "."]);
  assert.equal(parsed.flags.has("json"), true);
  assert.equal(parsed.opts.lang, "zh");
  assert.deepEqual(parsed.positionals, ["."]);
});

test("parseCli accepts --lang=en", () => {
  const parsed = parseCli(["--lang=en", "/tmp/repo"]);
  assert.equal(parsed.opts.lang, "en");
  assert.deepEqual(parsed.positionals, ["/tmp/repo"]);
});

test("resolveLang follows explicit flags then locale", () => {
  assert.equal(resolveLang("zh"), "zh");
  assert.equal(resolveLang("en"), "en");
  assert.equal(resolveLang(undefined, { LANG: "zh_CN.UTF-8" }), "zh");
  assert.equal(resolveLang(undefined, { LANG: "en_US.UTF-8" }), "en");
});

test("t picks the requested language", () => {
  assert.equal(t("zh", { en: "Hello", zh: "你好" }), "你好");
  assert.equal(t("en", { en: "Hello", zh: "你好" }), "Hello");
});

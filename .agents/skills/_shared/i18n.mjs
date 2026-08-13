/**
 * Shared CLI and language helpers for kit scripts.
 */

/**
 * @param {string[]} argv
 */
export function parseCli(argv) {
  /** @type {Set<string>} */
  const flags = new Set();
  /** @type {Record<string, string>} */
  const opts = {};
  /** @type {string[]} */
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--lang" || token === "--checks") {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith("-")) {
        opts[key] = value;
        i += 1;
      }
      continue;
    }
    if (token.startsWith("--lang=")) {
      opts.lang = token.slice("--lang=".length);
      continue;
    }
    if (token.startsWith("--")) {
      flags.add(token.slice(2));
      continue;
    }
    positionals.push(token);
  }

  return { flags, opts, positionals };
}

/**
 * @param {string | undefined} requested
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveLang(requested, env = process.env) {
  const raw = (requested || "").trim().toLowerCase();
  if (raw === "zh" || raw === "zh-cn" || raw === "zh-hans" || raw === "cn") return "zh";
  if (raw === "en" || raw === "en-us" || raw === "en-gb") return "en";
  const loc = `${env.LANG || ""} ${env.LC_ALL || ""} ${env.LANGUAGE || ""}`.toLowerCase();
  if (/\bzh\b/.test(loc) || loc.includes("zh_cn") || loc.includes("zh-cn") || loc.includes("chinese")) {
    return "zh";
  }
  return "en";
}

/**
 * @param {"en" | "zh"} lang
 * @param {{ en: string, zh: string }} pair
 */
export function t(lang, pair) {
  return lang === "zh" ? pair.zh : pair.en;
}

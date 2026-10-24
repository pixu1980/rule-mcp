

/** Test-only fixtures duplicated across suites before this file existed; import directly, not through index.js. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Wait until `predicate()` is true, or fail after `timeout` ms.
 *
 * @param {() => boolean|Promise<boolean>} predicate
 * @param {number} [timeout]
 * @param {number} [step]
 * @returns {Promise<boolean>}
 */
export async function until(predicate, timeout = 5000, step = 50) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, step));
  }

  return false;
}

/**
 * Patch env vars for the duration of `fn`, restoring the prior values (or
 * their absence) afterward, even when `fn` throws.
 *
 * @param {Record<string, string|undefined>} patch - undefined deletes the key
 * @param {() => unknown} fn
 * @returns {unknown} fn's return value
 */
export function withEnv(patch, fn) {
  const saved = {};

  for (const key of Object.keys(patch)) {
    saved[key] = process.env[key];
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Run `fn` synchronously with `RULE_MCP_HOME` pointed at a fresh temp
 * dir, restoring the prior value and removing the temp dir afterward. Stays
 * synchronous (not async) because every existing call site calls it bare,
 * inside a synchronous `test()` body, and relies on `fn` running - and any
 * assertion inside it throwing - before `withHome` returns.
 *
 * @param {(home: string) => unknown} fn
 * @param {string} [prefix] - temp-dir prefix, so a leftover dir names its suite
 * @returns {unknown} fn's return value
 */
export function withHome(fn, prefix = "rule-mcp-home-") {
  const home = mkdtempSync(join(tmpdir(), prefix));
  const previous = process.env.RULE_MCP_HOME;

  process.env.RULE_MCP_HOME = home;

  try {
    return fn(home);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_HOME;
    } else {
      process.env.RULE_MCP_HOME = previous;
    }

    rmSync(home, { recursive: true, force: true });
  }
}

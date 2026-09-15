

/**
 * @module test/guardrails/worker-alias
 *
 * Regression: the guarded guardrail worker must resolve `@src` aliases even
 * when its parent registered the alias hook with a dynamic import (the `bin`
 * entry point) instead of `--import`. The worker is a separate thread with its
 * own module graph, so the parent's registration does not reach it; before the
 * fix it died with ERR_MODULE_NOT_FOUND and every check answered
 * `check-timeout: worker-error`.
 */
import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = new URL("../../../../../", import.meta.url);

/** A child that reproduces the `bin` entry: dynamic import, no --import flag. */
const SCRIPT = `
process.env.RULE_MCP_GUARDED_CHECKS = "1";
const hook = ${JSON.stringify(new URL("scripts/alias-hook.mjs", ROOT).href)};
const dispatch = ${JSON.stringify(new URL("src/core/guardrails/guarded/_dispatch.js", ROOT).href)};

await import(hook);

const { checkCodeGuarded, shutdownGuardrailWorker } = await import(dispatch);
const result = await checkCodeGuarded(
  "rule-styleguide-javascript",
  "export const add = (a, b) => a + b;",
  { fileName: "_add.js", previousPassed: [] },
  { timeoutMs: 20000 },
);
await shutdownGuardrailWorker();

process.stdout.write(JSON.stringify({
  aborted: Boolean(result.aborted),
  failed: (result.failed ?? []).map((entry) => entry.id),
}));
`;

test("the guarded worker answers when the parent imported the alias hook dynamically", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "-e", SCRIPT], {
    cwd: new URL(".", ROOT).pathname,
    timeout: 60_000,
  });
  const parsed = JSON.parse(stdout);

  assert.equal(parsed.aborted, false, "the worker answered instead of aborting");
  assert.ok(!parsed.failed.includes("check-timeout"), `the worker must not report a worker error: ${parsed.failed.join(", ")}`);
});

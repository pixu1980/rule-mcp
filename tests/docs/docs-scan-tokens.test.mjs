/**
 * docs-scan's staleness rule, on a scratch docs tree.
 *
 * The scanner flags `pix_*` tokens no registered tool answers to. A persona
 * run writes into docs/audits and docs/reviews, which are scanned, and prose
 * there legitimately names the tool family by wildcard (`rule_tool_*`): that is
 * not a stale reference, and flagging it failed the suite on a clean repo.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The scanner loads server code, which resolves `@src/*` through a hook
// (ADR 079); a spawned process registers it as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../scripts/alias-hook.mjs", import.meta.url));

const SCAN = fileURLToPath(new URL("docs-scan.mjs", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));

/** Run the scanner over a scratch tree holding one markdown file. */
function scan(contents) {
  const box = mkdtempSync(join(tmpdir(), "rule-docs-scan-"));
  mkdirSync(join(box, "audits"), { recursive: true });
  writeFileSync(join(box, "audits", "probe.md"), contents);

  try {
    return spawnSync(process.execPath, ["--import", ALIAS_HOOK, SCAN, box], { cwd: root, encoding: "utf8" });
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
}

test("the tool-family wildcard is prose, not a stale reference", () => {
  const result = scan("Tool names are `rule_tool_*` in snake case.\n");

  assert.ok(!result.stdout.includes("STALE:"), `the wildcard must not be flagged:\n${result.stdout}`);
});

test("a tool name nothing answers to is still flagged", () => {
  const result = scan("Call `rule_tool_that_does_not_exist` to do it.\n");

  assert.match(result.stdout, /STALE:.*rule_tool_that_does_not_exist/, "a real stale reference must still be reported");
});

test("a registered tool name passes", () => {
  const result = scan("Call `rule_tool_plan` for the operation contract.\n");

  assert.ok(!result.stdout.includes("STALE:"), `a registered tool must not be flagged:\n${result.stdout}`);
});

/**
 * Source contract for the shim: probe before trust, an escape hatch, and a
 * removal that reverses every path an install may have written.
 *
 * The contract used to be asserted against install.sh and uninstall.sh; it
 * moved into src/cli/setup/ with the rest of the logic (ADR 080).
 */
import { strict as assert } from "node:assert";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { globalBinDir, linkCandidates, shimCandidates, skipGlobalLink } from "../../setup/_shim.js";
import { removeGlobalShims } from "../../setup/_shim-apply.js";

test("the escape hatch is honored by both directions", () => {
  const saved = process.env.RULE_MCP_SKIP_GLOBAL_LINK;

  try {
    process.env.RULE_MCP_SKIP_GLOBAL_LINK = "1";

    assert.equal(skipGlobalLink(), true);
    assert.deepEqual(removeGlobalShims(), [{ path: "(all)", kind: "shim", status: "skipped" }], "removal must not touch a sandboxed machine's real shim");
  } finally {
    if (saved === undefined) {
      delete process.env.RULE_MCP_SKIP_GLOBAL_LINK;
    } else {
      process.env.RULE_MCP_SKIP_GLOBAL_LINK = saved;
    }
  }
});

test("PNPM_HOME wins when resolving the global bin directory", () => {
  const saved = process.env.PNPM_HOME;

  try {
    process.env.PNPM_HOME = "/tmp/rule-fake-pnpm";

    assert.equal(globalBinDir(), join("/tmp/rule-fake-pnpm", "bin"));
  } finally {
    if (saved === undefined) {
      delete process.env.PNPM_HOME;
    } else {
      process.env.PNPM_HOME = saved;
    }
  }
});

test("removal sweeps every bin directory an install may have used", () => {
  const home = "/tmp/rule-fake-home";
  const candidates = shimCandidates(home);

  for (const dir of [join(home, "Library", "pnpm", "bin"), join(home, ".local", "share", "pnpm", "bin"), join(home, ".pnpm-global", "bin"), join(home, ".npm-global", "bin")]) {
    assert.ok(candidates.includes(join(dir, "rule-mcp")), `${dir} must be swept`);
  }
});

test("the retired -mcpd alias is swept alongside the current name", () => {
  // ADR 064 retired the alias; a stale shim keeps `command -v` resolving
  // forever and silently breaks the next install.
  assert.ok(
    shimCandidates("/tmp/rule-fake-home").some((path) => path.endsWith("rule-mcpd")),
    "the -mcpd shims must still be cleaned up",
  );
});

test("the pnpm global store link is a removal target too", () => {
  // Only directories that exist are enumerated, so this asserts the shape
  // rather than a count: an install may have left a link in either root.
  for (const path of linkCandidates(homedir())) {
    assert.match(path, /node_modules\/rule-mcp$/, "store links point at the package directory");
  }
});

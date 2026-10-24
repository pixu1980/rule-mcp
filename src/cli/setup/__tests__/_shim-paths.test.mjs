/** Shim path questions that do not touch the machine: candidates and trust. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, platform, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { globalBinDir, linkCandidates, shimCandidates, skipGlobalLink } from "../_shim.js";
import { withEnv } from "../../../shared/_testkit.js";

test("skipGlobalLink follows the sandbox flag", () => {
  withEnv({ RULE_MCP_SKIP_GLOBAL_LINK: "1" }, () => {
    assert.equal(skipGlobalLink(), true, "the flag skips the global link");
  });
  withEnv({ RULE_MCP_SKIP_GLOBAL_LINK: undefined }, () => {
    assert.equal(skipGlobalLink(), false, "an absent flag links globally");
  });
});

test("shimCandidates sweeps every bin dir plus the retired alias", () => {
  const home = "/fake/home";
  const withoutPnpm = withEnv({ PNPM_HOME: undefined }, () => shimCandidates(home));

  assert.equal(withoutPnpm.length, 8, "four bin dirs times two names");
  assert.ok(withoutPnpm.includes(join(home, ".local", "share", "pnpm", "bin", "rule-mcp")), "the platform default bin is swept");
  assert.ok(withoutPnpm.includes(join(home, ".local", "share", "pnpm", "bin", "rule-mcpd")), "the retired -mcpd alias is swept alongside");

  const withPnpm = withEnv({ PNPM_HOME: "/fake/pnpm" }, () => shimCandidates(home));

  assert.ok(withPnpm.includes(join("/fake/pnpm", "bin", "rule-mcp")), "PNPM_HOME leads the sweep");
  assert.ok(new Set(withoutPnpm).size === withoutPnpm.length, "no duplicate paths");
});

test("globalBinDir prefers PNPM_HOME when it is set", () => {
  withEnv({ PNPM_HOME: "/fake/pnpm" }, () => {
    assert.equal(globalBinDir(), join("/fake/pnpm", "bin"), "PNPM_HOME wins outright");
  });
});

test("linkCandidates ignores missing global stores", () => {
  assert.deepEqual(linkCandidates("/fake/home-without-stores"), [], "absent stores yield no candidates");
});

test("globalBinDir falls back to the platform default without pnpm", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const empty = mkdtempSync(join(tmpdir(), "rule-mcp-shim-path-"));
  const expected = platform() === "darwin" ? join(homedir(), "Library", "pnpm", "bin") : join(homedir(), ".local", "share", "pnpm", "bin");

  try {
    const out = execFileSync(process.execPath, [join(here, "_shim-child.fixture.mjs")], {
      encoding: "utf8",
      env: { PATH: empty },
    });

    assert.equal(JSON.parse(out).bin, expected, "no pnpm means the platform default");
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

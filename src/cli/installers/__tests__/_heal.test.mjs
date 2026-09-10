

/**
 * Behavioral: a stale global shim is detected and rewritten.
 *
 * Regression this guards: a `pnpm link --global` shim pins the repo's
 * absolute path. After the project moved the old shim stayed on PATH but
 * crashed on launch, every CLI call failed, the stderr was swallowed, and
 * the installer silently marked agents as "skipped" - nothing was written.
 *
 * The probe, the heal and the fallback moved from bash into
 * src/cli/setup/ (ADR 080), so they are exercised as functions now instead
 * of extracted shell snippets.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const localBin = join(root, "bin", "rule-mcp.js");

/**
 * Run one probe with a doctored PATH and PNPM_HOME.
 *
 * The shim modules read `process.env` at call time and shell out through
 * `tryExec`, so the environment has to be swapped around the call rather
 * than at import.
 */
async function withFakeShim(shimBody, run) {
  const home = mkdtempSync(join(tmpdir(), "rule-shim-heal-"));
  const bin = join(home, "bin");

  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "rule-mcp"), shimBody, { mode: 0o755 });

  const saved = { PATH: process.env.PATH, PNPM_HOME: process.env.PNPM_HOME, skip: process.env.RULE_MCP_SKIP_GLOBAL_LINK };

  // Both the stale shim's directory and the one a repair writes into are on
  // PATH, the way a real machine has them.
  process.env.PNPM_HOME = join(home, ".pnpm");
  process.env.PATH = [bin, join(home, ".pnpm", "bin"), dirname(process.execPath), "/usr/bin", "/bin"].join(":");
  delete process.env.RULE_MCP_SKIP_GLOBAL_LINK;

  try {
    // Fresh module instances: shimPath caches nothing, but the import is
    // dynamic so the doctored PATH is in place before the first call.
    const shim = await import(`../../setup/_shim.js?heal=${encodeURIComponent(home)}`);
    const apply = await import(`../../setup/_shim-apply.js?heal=${encodeURIComponent(home)}`);

    return await run({ shim, apply, home, bin });
  } finally {
    process.env.PATH = saved.PATH;
    process.env.PNPM_HOME = saved.PNPM_HOME;

    if (saved.skip !== undefined) {
      process.env.RULE_MCP_SKIP_GLOBAL_LINK = saved.skip;
    }

    rmSync(home, { recursive: true, force: true });
  }
}

const BROKEN = "#!/bin/sh\nexit 3\n";

test("a shim that resolves but crashes fails the launch probe", async () => {
  await withFakeShim(BROKEN, ({ shim }) => {
    assert.notEqual(shim.shimPath(), "", "the broken shim must still resolve on PATH");
    assert.equal(shim.shimWorks(), false, "and must fail the probe that actually launches it");
  });
});

test("a broken shim is rewritten to point at the local binary", async () => {
  await withFakeShim(BROKEN, ({ apply, home }) => {
    const result = apply.ensureGlobalShim({ localBin });

    assert.equal(result.status, "relinked", "a stale shim must be replaced, not left in place");

    const written = readFileSync(join(home, ".pnpm", "bin", "rule-mcp"), "utf8");

    assert.match(written, /^#!\/bin\/sh/, "the launcher must be a plain script");
    assert.ok(written.includes(localBin), "the launcher must exec the local entrypoint");
    assert.doesNotMatch(written, /pnpm link --global/, "pnpm 10+ rewrites pnpm-workspace.yaml and the lockfile - never use it");
  });
});

test("the rewritten shim launches", async () => {
  await withFakeShim(BROKEN, ({ apply, shim }) => {
    apply.ensureGlobalShim({ localBin });

    assert.equal(shim.shimWorks(), true, "the repaired shim must actually run the CLI");
  });
});

test("a working shim is verified, not rewritten", async () => {
  await withFakeShim(`#!/bin/sh\nexec node ${JSON.stringify(localBin)} "$@"\n`, ({ apply, bin }) => {
    const result = apply.ensureGlobalShim({ localBin });

    assert.equal(result.status, "verified");
    assert.equal(result.path, join(bin, "rule-mcp"), "the existing shim must be kept");
  });
});

test("the escape hatch skips the shim entirely", async () => {
  await withFakeShim(BROKEN, ({ apply }) => {
    process.env.RULE_MCP_SKIP_GLOBAL_LINK = "1";

    const result = apply.ensureGlobalShim({ localBin });

    assert.equal(result.status, "skipped", "sandboxes and tests must be able to opt out");
    assert.match(result.reason, /RULE_MCP_SKIP_GLOBAL_LINK/);
  });
});

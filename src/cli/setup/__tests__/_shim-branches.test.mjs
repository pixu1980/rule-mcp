

/** Branch coverage for shim lookup, configured bin dir, and trust fallbacks. */
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { globalBinDir, shimCandidates, shimPath, shimTarget, shimWorks } from "../_shim.js";

function scratch() {
  return mkdtempSync(join(tmpdir(), "rule-mcp-shim-branches-"));
}

function withPath(dir, fn) {
  const saved = process.env.PATH;
  process.env.PATH = `${dir}:${saved}`;
  try {
    return fn();
  } finally {
    process.env.PATH = saved;
  }
}

test("shimPath resolves the launcher on PATH", () => {
  const dir = scratch();
  const shim = join(dir, "rule-mcp");
  writeFileSync(shim, "#!/bin/sh\n");
  chmodSync(shim, 0o755);
  try {
    assert.equal(
      withPath(dir, () => shimPath()),
      shim,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shimTarget falls back to empty on an unreadable path", () => {
  assert.equal(shimTarget(join(tmpdir(), "rule-mcp-shim-does-not-exist")), "");
});

test("shimWorks refuses an empty version", () => {
  const dir = scratch();
  const shim = join(dir, "rule-mcp");
  writeFileSync(shim, `#!/bin/sh\nexec node ${JSON.stringify(join(process.cwd(), "bin", "rule-mcp.js"))} "$@"\n`);
  chmodSync(shim, 0o755);
  try {
    assert.equal(shimWorks({ path: shim, run: () => "  " }), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("globalBinDir uses pnpm's configured directory when PNPM_HOME is absent", () => {
  const dir = scratch();
  const pnpm = join(dir, "pnpm");
  writeFileSync(pnpm, "#!/bin/sh\necho /configured/bin\n");
  chmodSync(pnpm, 0o755);
  const savedHome = process.env.PNPM_HOME;
  delete process.env.PNPM_HOME;
  try {
    assert.equal(
      withPath(dir, () => globalBinDir()),
      "/configured/bin",
    );
  } finally {
    if (savedHome === undefined) {
      delete process.env.PNPM_HOME;
    } else {
      process.env.PNPM_HOME = savedHome;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("shimCandidates keeps PNPM_HOME first and has no duplicates", () => {
  const saved = process.env.PNPM_HOME;
  process.env.PNPM_HOME = "/x/pnpm";
  try {
    const candidates = shimCandidates("/x/home");
    assert.equal(candidates[0], "/x/pnpm/bin/rule-mcp");
    assert.equal(new Set(candidates).size, candidates.length);
  } finally {
    if (saved === undefined) {
      delete process.env.PNPM_HOME;
    } else {
      process.env.PNPM_HOME = saved;
    }
  }
});

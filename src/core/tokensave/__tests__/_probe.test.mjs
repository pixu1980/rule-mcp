

/**
 * @module test/tokensave/probe
 *
 * Contract for the TokenSave probe: the cheap filesystem check and the
 * enriched status probe, both dependency-free and testable with an injected
 * status reader.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { probeFilesystem, probeTokensave, TOKENSAVE_DIR } from "../_probe.js";

/** Create a scratch project, run `build` on it, and keep it for the test. */
function scratch(build) {
  const dir = mkdtempSync(join(tmpdir(), "rule-tokensave-"));

  build(dir);

  return dir;
}

test("probeFilesystem reports available and the config version", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
    writeFileSync(join(base, TOKENSAVE_DIR, "config.json"), JSON.stringify({ last_indexed_version: "7.12.1" }));
  });

  try {
    const probe = probeFilesystem(dir);

    assert.equal(probe.available, true);
    assert.equal(probe.version, "7.12.1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeFilesystem reports unavailable without a graph", () => {
  const dir = scratch(() => {});

  try {
    const probe = probeFilesystem(dir);

    assert.equal(probe.available, false);
    assert.equal(probe.version, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeFilesystem refuses a graph written by another major", () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
    writeFileSync(join(base, TOKENSAVE_DIR, "config.json"), JSON.stringify({ last_indexed_version: "8.0.0" }));
  });

  try {
    const probe = probeFilesystem(dir);

    assert.equal(probe.available, false, "a major this adapter does not know is refused");
    assert.equal(probe.supported, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeTokensave enriches the probe with status", async () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
  });

  try {
    const probe = await probeTokensave(dir, {
      status: async () => ({ version: "7.12.1", active_branch: "develop", parent_branch: "main", last_sync_at: 1000 }),
    });

    assert.equal(probe.available, true);
    assert.equal(probe.version, "7.12.1");
    assert.equal(probe.branch, "develop");
    assert.equal(probe.parentBranch, "main");
    assert.equal(typeof probe.staleSeconds, "number");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeTokensave keeps staleSeconds null without a status function", async () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
  });

  try {
    const probe = await probeTokensave(dir);

    assert.equal(probe.available, true);
    assert.equal(probe.staleSeconds, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeTokensave reports staleness from the live status", async () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
  });

  try {
    const probe = await probeTokensave(dir, {
      status: async () => ({ version: "7.12.1", last_sync_at: 1000, stale_files: 2, stale_commits: 1 }),
    });

    assert.equal(probe.staleFiles, 2);
    assert.equal(probe.staleCommits, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("probeTokensave stays available when the status reader fails", async () => {
  const dir = scratch((base) => {
    mkdirSync(join(base, TOKENSAVE_DIR));
    writeFileSync(join(base, TOKENSAVE_DIR, "tokensave.db"), "");
  });

  try {
    const probe = await probeTokensave(dir, { status: async () => { throw new Error("offline"); } });

    assert.equal(probe.available, true);
    assert.equal(probe.staleSeconds, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

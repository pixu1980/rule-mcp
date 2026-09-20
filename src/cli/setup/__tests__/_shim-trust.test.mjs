

/**
 * SEC-5: the shim on PATH is resolved before it is run.
 *
 * `rule-mcp --version` executes whatever PATH yields. A program wearing
 * the name is not this project, so the check reads where the shim points and
 * refuses anything that does not resolve to this checkout's entrypoint.
 */
import { strict as assert } from "node:assert";
import { chmodSync, existsSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { ownEntrypoint, shimTarget, shimWorks } from "../_shim.js";

/** Run fn with a PATH whose first entry is dir. */
function withPath(dir, fn) {
  const saved = process.env.PATH;

  process.env.PATH = `${dir}:${saved}`;

  try {
    return fn();
  } finally {
    process.env.PATH = saved;
  }
}

/** A scratch dir with an executable `rule-mcp` whose body is given. */
function scratchShim(body) {
  const dir = mkdtempSync(join(tmpdir(), "rule-shim-trust-"));
  const shim = join(dir, "rule-mcp");

  writeFileSync(shim, body);
  chmodSync(shim, 0o755);

  return { dir, shim };
}

test("a shim naming another program is not ours and is never run", () => {
  const { dir } = scratchShim(`#!/bin/sh\ntouch "${join(tmpdir(), "rule-shim-ran")}"\necho 9.9.9\n`);

  try {
    const ran = withPath(dir, () => shimWorks());

    assert.equal(ran, false, "a foreign shim is not trusted");
    assert.equal(existsSync(join(tmpdir(), "rule-shim-ran")), false, "and it is never executed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a launcher naming this checkout's entrypoint is ours, and the shim is what runs", () => {
  const entrypoint = ownEntrypoint();
  const { dir, shim } = scratchShim(`#!/bin/sh\nexec node ${JSON.stringify(entrypoint)} "$@"\n`);
  const calls = [];

  try {
    const works = shimWorks({
      path: shim,
      run: (file, args) => {
        calls.push([file, args]);

        return "9.9.9";
      },
    });

    assert.equal(works, true, "our launcher is trusted");
    assert.deepEqual(calls, [[shim, ["--version"]]], "the resolved shim is what runs, not the bare name");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a symlink to the entrypoint resolves to it", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-shim-trust-"));
  const link = join(dir, "rule-mcp");

  try {
    symlinkSync(ownEntrypoint(), link);

    assert.equal(shimTarget(link), realpathSync(ownEntrypoint()), "the symlink resolves to this checkout");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a shim naming a checkout-shaped path that is not ours is refused", () => {
  const { dir, shim } = scratchShim(`#!/bin/sh\nexec node "/somewhere/else/bin/rule-mcp.js" "$@"\n`);

  try {
    assert.equal(shimTarget(shim), "", "another checkout's entrypoint is not this one");
    assert.equal(shimWorks({ path: shim, run: () => "9.9.9" }), false, "and the check refuses it without running it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

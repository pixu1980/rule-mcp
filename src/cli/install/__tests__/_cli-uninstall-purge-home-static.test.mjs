/**
 * The runtime home contract: install recreates it, purge removes it,
 * --keep-config spares it.
 *
 * Regression this guards: `uninstall --purge` used to remove only
 * ~/.config/rule-mcp and leave ~/.rule-mcp behind, with the
 * daemon SSE token, telemetry and caches in it. A reinstall then started
 * from stale state and the "purge" promise was quietly false.
 *
 * The contract moved from the shell scripts into src/cli/setup/ (ADR 080),
 * so it is asserted against the module that now owns it.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ensureRuntimeHome, purgeRuntimeDirs, purgeTargets } from "../../setup/_runtime-home.js";

/** Point the runtime home at a sandbox for the duration of one call. */
function withRuntimeHome(run) {
  const previous = process.env.RULE_MCP_HOME;
  const home = mkdtempSync(join(tmpdir(), "rule-runtime-home-"));

  process.env.RULE_MCP_HOME = home;

  try {
    return run(home);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_HOME;
    } else {
      process.env.RULE_MCP_HOME = previous;
    }
  }
}

test("install recreates the whole layout src/cli/paths expects", () => {
  withRuntimeHome((home) => {
    ensureRuntimeHome();

    for (const dir of ["state", "data", "projects", "config"]) {
      assert.ok(existsSync(join(home, dir)), `${dir}/ must be recreated`);
    }
  });
});

test("a dry run creates nothing", () => {
  withRuntimeHome((home) => {
    const result = ensureRuntimeHome({ dryRun: true });

    assert.equal(result.status, "planned");
    assert.ok(!existsSync(join(home, "state")));
  });
});

test("purge names both the runtime home and the env config directory", () => {
  const ids = purgeTargets().map((target) => target.id);

  assert.deepEqual(ids.sort(), ["env-config", "runtime-home"]);
});

test("purge deletes the runtime home, token and all", () => {
  withRuntimeHome((home) => {
    ensureRuntimeHome();
    writeFileSync(join(home, "state", "sse-token"), "test-token\n");

    const removed = purgeRuntimeDirs({ ids: ["runtime-home"] });

    assert.equal(removed[0].id, "runtime-home");
    assert.ok(!existsSync(home), "the whole directory must go, not just its contents");
  });
});

test("a purge that is not selected leaves the directory alone", () => {
  withRuntimeHome((home) => {
    ensureRuntimeHome();
    mkdirSync(join(home, "state"), { recursive: true });
    writeFileSync(join(home, "state", "sse-token"), "test-token\n");

    purgeRuntimeDirs({ ids: ["env-config"] });

    assert.ok(existsSync(join(home, "state", "sse-token")), "--keep-config must keep the SSE token untouched");
  });
});

test("purge counts the files it is about to delete", () => {
  withRuntimeHome((home) => {
    ensureRuntimeHome();
    writeFileSync(join(home, "state", "sse-token"), "token\n");
    writeFileSync(join(home, "data", "notes.json"), "{}");

    const planned = purgeRuntimeDirs({ dryRun: true, ids: ["runtime-home"] });

    assert.equal(planned[0].status, "planned");
    assert.equal(planned[0].files, 2, "the user is told how much is at stake before agreeing");
    assert.ok(existsSync(home), "a dry run must delete nothing");
  });
});

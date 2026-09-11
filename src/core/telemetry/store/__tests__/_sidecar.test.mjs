

/** The usage sidecar: bad input, missing and corrupt files, and the round trip. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { readSidecarUsage, usageFile, writeSidecarUsage } from "../index.js";

const PREV_HOME = process.env.RULE_MCP_HOME;

/** Point RULE_MCP_HOME at a fresh temp dir for one scenario. */
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), "rule-sidecar-"));
  process.env.RULE_MCP_HOME = home;

  try {
    fn(home);
  } finally {
    delete process.env.RULE_MCP_HOME;
    rmSync(home, { recursive: true, force: true });
  }
}

test.after(() => {
  if (PREV_HOME === undefined) {
    delete process.env.RULE_MCP_HOME;
  } else {
    process.env.RULE_MCP_HOME = PREV_HOME;
  }
});

test("non-object usage is refused without touching disk", () => {
  withHome(() => {
    assert.equal(writeSidecarUsage(), false, "absent usage is refused");
    assert.equal(writeSidecarUsage("a string"), false, "a non-object is refused");
  });
});

test("a missing or corrupt sidecar reads as absent", () => {
  withHome(() => {
    assert.equal(readSidecarUsage(), undefined, "no file means no declaration");

    const file = usageFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "{ not json");
    assert.equal(readSidecarUsage(), undefined, "corrupt JSON reads as absent");

    writeFileSync(file, "5");
    assert.equal(readSidecarUsage(), undefined, "a non-object reads as absent");
  });
});

test("declared usage round-trips with its sidecar stamp", () => {
  withHome(() => {
    assert.equal(writeSidecarUsage({ input: 10, output: 5 }), true, "an object stores");

    const back = readSidecarUsage();
    assert.equal(back.input, 10, "the figures come back");
    assert.equal(back.source, "sidecar", "the stamp marks the declaration");
  });
});

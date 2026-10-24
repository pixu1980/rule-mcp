/** purge drops expired and timestamp-less events and keeps the fresh ones. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { purge, readEvents, writeEvents } from "../index.js";
import { withHome as withHomePrefix } from "../../../../shared/_testkit.js";

const PREV_HOME = process.env.RULE_MCP_HOME;
const DAY_MS = 86_400_000;

/** Point RULE_MCP_HOME at a fresh temp dir for one scenario. */
function withHome(fn) {
  return withHomePrefix(fn, "rule-mcp-purge-");
}

test.after(() => {
  if (PREV_HOME === undefined) {
    delete process.env.RULE_MCP_HOME;
  } else {
    process.env.RULE_MCP_HOME = PREV_HOME;
  }
});

test("purge removes expired and timestamp-less events at an explicit now", () => {
  withHome(() => {
    const now = Date.now();
    writeEvents([{ ts: now - 8 * DAY_MS, tool: "old" }, { tool: "no-ts" }, { ts: now, tool: "fresh" }]);

    const { removed, kept } = purge({ now });

    assert.equal(removed, 2, "the expired and the timestamp-less events go");
    assert.equal(kept, 1, "the fresh event stays");
    assert.deepEqual(
      readEvents().map((event) => event.tool),
      ["fresh"],
      "the log on disk matches",
    );
  });
});

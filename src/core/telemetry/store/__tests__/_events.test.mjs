/**
 * The events log: every defensive return the writers and reader take, on a
 * hermetic RULE_MCP_HOME per scenario.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { appendEvents, ensureDirectory, eventsFile, readEvents, stateSize, writeEvents } from "../index.js";

const PREV_HOME = process.env.RULE_MCP_HOME;

/** Write a file next to the events log, creating parents like ensureDirectory would. */
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Point RULE_MCP_HOME at a fresh temp dir for one scenario. */
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), "rule-store-"));
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

test("readEvents skips a malformed line and tolerates a missing file", () => {
  withHome(() => {
    write(eventsFile(), '{"ok":true}\nnot-json\n{"ok":false}\n');
    const events = readEvents();
    assert.equal(events.length, 2, "the malformed line is skipped");
    assert.equal(events[1].ok, false, "the valid lines stay");
  });
});

test("readEvents fails closed when the file cannot be read", () => {
  withHome(() => {
    mkdirSync(eventsFile(), { recursive: true });
    assert.deepEqual(readEvents(), [], "a directory at the events path reads as empty");
  });
});

test("appendEvents refuses non-arrays and empty lists", () => {
  withHome(() => {
    assert.equal(appendEvents([]), false, "empty list is refused");
    assert.equal(appendEvents("nope"), false, "a non-array is refused");
    assert.equal(appendEvents([{ tool: "pix_tool", ok: true }]), true, "a real event writes");
  });
});

test("appendEvents and writeEvents fail closed when the state root is unwritable", () => {
  withHome((home) => {
    writeFileSync(join(home, "blocker"), "i am a file, not a directory", "utf8");
    process.env.RULE_MCP_HOME = join(home, "blocker");
    assert.equal(ensureDirectory(), false, "mkdir under a file cannot happen");
    assert.equal(appendEvents([{ tool: "pix_tool" }]), false, "append gives up silently");
    assert.equal(writeEvents([{ tool: "pix_tool" }]), false, "write gives up silently");
    assert.deepEqual(readEvents(), [], "read gives up silently");
  });
});

test("appendEvents fails closed when the target path is a directory", () => {
  withHome(() => {
    mkdirSync(eventsFile(), { recursive: true });
    assert.equal(appendEvents([{ tool: "pix_tool" }]), false, "appending to a directory fails");
  });
});

test("stateSize counts bytes and returns zero without a file", () => {
  withHome(() => {
    assert.equal(stateSize(), 0, "no events file means zero bytes");
    write(eventsFile(), "abc");
    assert.equal(stateSize(), 3, "the raw log size is measurable");
  });
});

test("writeEvents renders the trailing newline only for a non-empty log", () => {
  withHome(() => {
    assert.equal(writeEvents([]), true, "an empty write still succeeds");
    assert.equal(readFileSync(eventsFile(), "utf8"), "", "an empty log has no newline");

    assert.equal(writeEvents([{ tool: "pix_tool" }]), true, "a real write succeeds");
    assert.match(readFileSync(eventsFile(), "utf8"), /}\n$/, "a non-empty log ends with a newline");
  });
});

test("writeEvents fails closed when the target path is a directory", () => {
  withHome(() => {
    mkdirSync(eventsFile(), { recursive: true });
    assert.equal(writeEvents([{ tool: "pix_tool" }]), false, "writing to a directory fails");
  });
});
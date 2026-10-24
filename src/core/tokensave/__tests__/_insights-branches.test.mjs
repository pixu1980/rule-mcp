/** Branch coverage for the TokenSave reporting reads: every empty and fallback shape. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { affectedTests, formatBytes, graphAgeSeconds, graphStatus, runtimeSnapshot } from "../_insights.js";

const available = () => ({ available: true });
const answering = (value) => () => ({ ok: true, value });

test("graphStatus keeps the non-object and missing-field branches", () => {
  assert.equal(graphStatus("/tmp/x", { probe: available, client: answering("nope") }), null);
  assert.equal(graphStatus("/tmp/x", { probe: available, client: answering(null) }), null);
  assert.deepEqual(graphStatus("/tmp/x", { probe: available, client: answering({}) }), {
    nodes: 0,
    edges: 0,
    files: 0,
    dbBytes: 0,
    sourceBytes: 0,
    lastUpdated: null,
    languages: {},
  });
});

test("graphAgeSeconds covers missing, zero and future timestamps", () => {
  assert.equal(graphAgeSeconds(null), null);
  assert.equal(graphAgeSeconds({ lastUpdated: 0 }), null);
  assert.equal(graphAgeSeconds({ lastUpdated: -1 }), null);
  assert.equal(graphAgeSeconds({ lastUpdated: 1000 }, 1_000_000), 0);
  assert.equal(graphAgeSeconds({ lastUpdated: 1000 }, 1000 * 1000 + 30_000), 30);
  assert.equal(graphAgeSeconds({ lastUpdated: 1000 }, 500), 0);
});

test("affectedTests keeps the empty and fallback branches", () => {
  assert.equal(affectedTests("/tmp/x", []), null);
  assert.equal(affectedTests("/tmp/x", ["a.js"], { probe: available, client: answering("nope") }), null);
  assert.equal(affectedTests("/tmp/x", ["a.js"], { probe: available, client: answering(null) }), null);
  assert.deepEqual(affectedTests("/tmp/x", ["a.js"], { probe: available, client: answering({}) }), { files: ["a.js"], tests: [] });
  assert.deepEqual(affectedTests("/tmp/x", ["a.js"], { probe: available, client: answering({ changed_files: ["b.js"] }) }), {
    files: ["b.js"],
    tests: [],
  });
});

test("runtimeSnapshot keeps the non-object and missing-field branches", () => {
  assert.equal(runtimeSnapshot("/tmp/x", { probe: available, client: answering("nope") }), null);
  assert.equal(runtimeSnapshot("/tmp/x", { probe: available, client: answering(null) }), null);
  assert.deepEqual(runtimeSnapshot("/tmp/x", { probe: available, client: answering({}) }), {
    version: "unknown",
    pid: null,
    rssBytes: 0,
    cpuPercent: 0,
    capturedAt: null,
  });
});

test("formatBytes covers the unit boundaries", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1.0 kB");
  assert.equal(formatBytes(1024 * 1024 - 1), "1024.0 kB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
});

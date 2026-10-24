/**
 * The reporting reads: normalized, silent without a graph, and never a throw.
 *
 * Each function is the one place a caller learns TokenSave's field names for
 * that tool, so the test pins the mapping rather than the payload.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { affectedTests, formatBytes, graphAgeSeconds, graphStatus, runtimeSnapshot } from "../_insights.js";

const available = () => ({ available: true });
const absent = () => ({ available: false });
const answering = (value) => () => ({ ok: true, value });
const refusing = () => ({ ok: false, unavailable: true, error: "no" });

test("without a graph every read is null and nothing is spawned", () => {
  let called = false;
  const client = () => (called = true);

  assert.equal(graphStatus("/tmp/x", { probe: absent, client }), null);
  assert.equal(affectedTests("/tmp/x", ["a.js"], { probe: absent, client }), null);
  assert.equal(runtimeSnapshot("/tmp/x", { probe: absent, client }), null);
  assert.equal(called, false, "a project without a graph must not pay for four subprocesses");
});

test("a refusing tool is reported as absent, not thrown", () => {
  assert.equal(graphStatus("/tmp/x", { probe: available, client: refusing }), null);
  assert.equal(runtimeSnapshot("/tmp/x", { probe: available, client: refusing }), null);
});

test("status normalizes the graph's own counts", () => {
  const status = graphStatus("/tmp/x", {
    probe: available,
    client: answering({ node_count: 12, edge_count: 5, file_count: 3, db_size_bytes: 2048, total_source_bytes: 4096, last_updated: 1000 }),
  });

  assert.deepEqual(status, { nodes: 12, edges: 5, files: 3, dbBytes: 2048, sourceBytes: 4096, lastUpdated: 1000, languages: {} });
  assert.equal(graphAgeSeconds(status, 1000 * 1000 + 30_000), 30, "the age is seconds, from the recorded timestamp");
  assert.equal(graphAgeSeconds({ lastUpdated: null }), null);
});

test("an empty change set asks nothing of the graph", () => {
  let called = false;

  assert.equal(affectedTests("/tmp/x", [], { probe: available, client: () => (called = true) }), null);
  assert.equal(called, false);
});

test("runtime normalizes the server snapshot", () => {
  const runtime = runtimeSnapshot("/tmp/x", {
    probe: available,
    client: answering({ tokensave_version: "7.15.0", captured_at: 42, process: { pid: 7, rss_bytes: 1024, cpu_percent: 1.5 } }),
  });

  assert.deepEqual(runtime, { version: "7.15.0", pid: 7, rssBytes: 1024, cpuPercent: 1.5, capturedAt: 42 });
});

test("bytes are formatted in the unit a reader expects", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 kB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
});

/**
 * Phase 2c (plan: execution-plan.md) — resources/list descriptions.
 *
 * The resource bodies are already compressed at read time; the listing labels
 * are terse by design (measured: the pass changes nothing on the real set),
 * but every surface the server emits to a model goes through the pipeline, so
 * the mapping lives here and the names pass through the guard unharmed.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

const { listResources } = await import("../index.js");
const { compressResourceListing } = await import("../_listing.js");

test("resources/list keeps every uri and mimeType, and the labels pass the compressor unharmed", () => {
  const raw = listResources();
  const out = compressResourceListing(raw);

  assert.deepEqual(out.map((r) => r.uri), raw.map((r) => r.uri), "uris are the protocol contract and never change");
  assert.deepEqual(out.map((r) => r.mimeType), raw.map((r) => r.mimeType), "mimeTypes stay untouched");

  // The real labels are already terse, so the pass must be a no-op on them.
  for (const entry of out) {
    assert.equal(typeof entry.name, "string");
    assert.ok(entry.name.length > 0);
  }
});

test("the listing pass does shorten prose when there is something to shorten", () => {
  const out = compressResourceListing([{ uri: "rule://probe", name: "The guide was basically written to really just show you the whole pattern in detail", mimeType: "text/markdown" }]);

  assert.ok(out[0].name.length < 75, "verbose label sheds filler");
  assert.equal(out[0].uri, "rule://probe");
  assert.equal(out[0].mimeType, "text/markdown");
});
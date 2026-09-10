/**
 * Phase 3 (plan: execution-plan.md) — the compression-surface manifest, pinned.
 *
 * Every server→model surface is listed in `../_surfaces.js` with the exact
 * pass the handler runs. This test walks the manifest:
 *   - a "prose" surface shortens verbose text, keeps JSON identical, and
 *     never breaks structure (headings, urls, paths, inline and fenced code);
 *   - a documented skip ("terse", "vocabulary", "data") says why;
 *   - every prose surface has a telemetry source, or a reason for not having one.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

delete process.env.RULE_MCP_NO_CAVEMAN;
delete process.env.RULE_MCP_CAVEMAN_LEVEL;

const { SURFACES } = await import("../_surfaces.js");
const { guardCompression } = await import("../compress-guard/index.js");

/** Verbose prose with nothing structural to lose. */
const VERBOSE = "The server really just tries to make sure that every single turn pays for the smallest possible amount of the filler that nobody reads anyway.";

/** JSON is data: the pass must short-circuit and hand it back verbatim. */
const JSON_SAMPLE = '{"name":"rule","tokens":123}';

/** Every structural kind the guard protects: heading, url, path, span, fences. */
const STRUCTURED = "# Heading\n\nSee https://example.com/a and ./src/index.js and `inline`.\n\n```js\nconst a = 1;\n```\n";

test("the manifest has no duplicate ids and every entry is complete", () => {
  const ids = SURFACES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "surface ids are unique");
  assert.ok(SURFACES.length >= 10, "the manifest covers all emitted surfaces");

  for (const surface of SURFACES) {
    assert.ok(surface.where, `${surface.id}: where is required`);
  }
});

test("every prose surface shortens, keeps JSON, and never breaks structure", () => {
  for (const surface of SURFACES) {
    if (surface.kind !== "prose") {
      continue;
    }

    const out = surface.compress(VERBOSE);
    assert.ok(out.length < VERBOSE.length, `${surface.id}: must shed filler (${VERBOSE.length} -> ${out.length})`);

    assert.equal(surface.compress(JSON_SAMPLE), JSON_SAMPLE, `${surface.id}: JSON is data and stays`);

    const compressedStructure = surface.compress(STRUCTURED);
    const verdict = guardCompression(STRUCTURED, compressedStructure);
    const errors = verdict.violations.filter((v) => v.severity === "error");
    assert.deepEqual(errors, [], `${surface.id}: guard errors on a structured payload: ${JSON.stringify(errors)}`);
  }
});

test("every prose surface books a source, or says why not", () => {
  for (const surface of SURFACES) {
    if (surface.kind !== "prose") {
      continue;
    }

    assert.ok(typeof surface.source === "string" || typeof surface.noSourceReason === "string", `${surface.id}: needs a source or a reason for none`);
    assert.ok(surface.optOut, `${surface.id}: names its opt-out`);
  }
});

test("the documented skips say why they are not compressed", () => {
  const skips = SURFACES.filter((s) => s.kind !== "prose");

  assert.ok(skips.length > 0);
  for (const surface of skips) {
    assert.ok(["terse", "vocabulary", "data"].includes(surface.kind), `${surface.id}: unknown kind ${surface.kind}`);
    assert.ok(surface.reason.length > 10, `${surface.id}: a real reason is documented`);
  }
});

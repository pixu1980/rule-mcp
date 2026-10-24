

/**
 * The `--surface` flag: one spec string for the server surface question.
 *
 * The grammar is one preset or one list, never both - the same XOR the files
 * selection keeps (`selectionOf` ignores families when a preset is given), so
 * the wizard answer and the flag stay one serialization apart.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { SURFACE_VAR, applySurfaceEnv, surfaceArgs, surfaceOf } from "../_surface-flags.js";

test("surfaceOf reads nothing as untouched", () => {
  assert.equal(surfaceOf({}), null);
  assert.equal(surfaceOf({ surface: "" }), null);
});

test("surfaceOf reads presets and lists", () => {
  assert.deepEqual(surfaceOf({ surface: "standard" }), { preset: "standard" });
  assert.deepEqual(surfaceOf({ surface: "areas:frontend,data" }), { areas: ["frontend", "data"] });
  assert.deepEqual(surfaceOf({ surface: "skills:rule-mcp-ai" }), { skills: ["rule-mcp-ai"] });
});

test("surfaceOf warns and ignores garbage", () => {
  const warned = [];

  assert.equal(surfaceOf({ surface: "nope" }, warned.push.bind(warned)), null);
  assert.equal(warned.length, 1);
});

test("surfaceArgs round-trips the flag", () => {
  assert.deepEqual(surfaceArgs(null), []);
  assert.deepEqual(surfaceArgs(surfaceOf({ surface: "areas:frontend,data" })), ["--surface", "areas:frontend,data"]);
  assert.deepEqual(surfaceArgs({ preset: "minimal" }), ["--surface", "minimal"]);
});

test("applySurfaceEnv writes the canonical spec and touches nothing when unanswered", () => {
  const answered = {};

  applySurfaceEnv({ areas: ["frontend", "data"] }, answered);

  assert.equal(answered[SURFACE_VAR], "areas:frontend,data");

  const untouched = {};

  applySurfaceEnv(null, untouched);

  assert.deepEqual(untouched, {}, "unanswered leaves the saved config alone");
});

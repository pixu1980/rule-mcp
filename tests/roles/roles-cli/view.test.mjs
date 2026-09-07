/** list and show: the merged catalog, its layers, and the unknown-role refusal. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { roles, sandbox } from "./_cli.fixture.mjs";

test("list prints the catalog and says which layer each role came from", () => {
  const box = sandbox();
  const run = roles(box, "list");

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /architect/, "the embedded catalog is listed");
  assert.match(run.stdout, /embedded/, "with the layer it came from");
});

test("show prints one role, as JSON when asked", () => {
  const box = sandbox();
  const run = roles(box, "show", "security", "--json");

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  const shown = JSON.parse(run.stdout);
  assert.equal(shown.id, "security");
  assert.equal(shown.layer, "embedded", "the layer travels with the role");
  assert.ok(Array.isArray(shown.lenses) && shown.lenses.length > 0, "the lenses are what the role is for");
});

test("an unknown role is refused, with the known ones listed", () => {
  const box = sandbox();
  const run = roles(box, "show", "wizard");

  assert.equal(run.status, 1);
  assert.match(`${run.stdout}${run.stderr}`, /wizard/, "the name that was not found");
  assert.match(`${run.stdout}${run.stderr}`, /security/, "and the names that would have worked");
});

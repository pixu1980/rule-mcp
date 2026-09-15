

/** roles CLI edges: json list, show json, usage errors, unknown replacements. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { roles, sandbox } from "./_cli.fixture.mjs";

test("list --json and show --json render machine output", () => {
  const box = sandbox();
  const list = roles(box, "list", "--json");
  assert.equal(list.status, 0);
  const parsed = JSON.parse(list.stdout);
  assert.ok(Array.isArray(parsed.roles), "the json list carries a roles array");
  assert.ok(parsed.roles.length >= 5, "the embedded catalog is in the list");

  const shown = roles(box, "show", "security", "--json");
  const role = JSON.parse(shown.stdout);
  assert.equal(role.id, "security", "the json role is the one asked for");
});

test("new prints usage when the id is missing and complains without skills", () => {
  const box = sandbox();
  const noId = roles(box, "new", "--role", "Solo", "--skills", "x");
  assert.equal(noId.status, 1, "no id is a usage error");
  assert.match(noId.stdout + noId.stderr, /roles new <id>/, "the usage line is printed");

  const noSkills = roles(box, "new", "solo", "--role", "Solo");
  assert.equal(noSkills.status, 1, "no skills is refused");
  assert.match(noSkills.stdout + noSkills.stderr, /at least one skill/, "what is missing is named");
});

test("new refuses to overwrite an existing user role", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");
  const again = roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");
  assert.equal(again.status, 1, "a duplicate id is refused");
  assert.match(again.stdout + again.stderr, /already has/, "the existing file is named");
});

test("deprecate refuses an unknown replacement", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "architect", "--by", "ghost-role");
  assert.equal(run.status, 1, "an unknown replacement is refused");
  assert.match(run.stdout + run.stderr, /ghost-role/, "the unknown name is mentioned");
});

test("deprecating an unknown role lists the known ones", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "ghost-role", "--by", "security");
  assert.equal(run.status, 1, "an unknown role is refused");
  assert.match(run.stdout + run.stderr, /Unknown role|ghost-role/, "the refusal names the role");
});

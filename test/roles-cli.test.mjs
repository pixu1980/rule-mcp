/**
 * Personas B.5: the roles CLI.
 *
 * Overlays were hand-written JSON, which meant the first thing a new role hit
 * was the validator, after the file was already on disk and already wrong. The
 * CLI writes the file, so what lands is valid by construction, and it prints the
 * merged catalog with the layer each entry came from - the one question a stack
 * of three layers makes hard to answer by reading files.
 *
 * Every case runs the real binary against a temporary HOME, because the overlay
 * loader resolves the user layer from the home directory and a test that stubbed
 * that would not be testing the path anyone uses.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { validateRole } from "../src/core/review-roles.js";

const BIN = fileURLToPath(new URL("../bin/rule-mcp.js", import.meta.url));

/** A home and a project of their own, so cases cannot see each other's roles. */
function sandbox() {
  const home = mkdtempSync(join(tmpdir(), "rule-roles-home-"));
  const project = mkdtempSync(join(tmpdir(), "rule-roles-project-"));
  mkdirSync(join(project, ".git"), { recursive: true });

  return { home, project };
}

function roles(box, ...args) {
  return spawnSync(process.execPath, [BIN, "roles", ...args], {
    cwd: box.project,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: box.home,
      RULE_MCP_NO_AUTOUPDATE: "1",
      RULE_MCP_STATE_DIR: join(box.home, ".rule-mcp", "state"),
    },
  });
}

const overlayFile = (box, id) => join(box.home, ".rule-mcp", "config", "roles", `${id}.json`);

test("list prints the catalog and says which layer each role came from", () => {
  const box = sandbox();
  const run = roles(box, "list");

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /architect/, "the embedded catalog is listed");
  assert.match(run.stdout, /embedded/, "with the layer it came from");
});

test("new writes an overlay the validator accepts", () => {
  const box = sandbox();
  const run = roles(
    box,
    "new",
    "perf-hawk",
    "--role",
    "Performance Hawk",
    "--skills",
    "profiling,caching",
    "--years",
    "12",
  );

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  assert.ok(existsSync(overlayFile(box, "perf-hawk")), "the overlay lands in the user layer");

  const written = JSON.parse(readFileSync(overlayFile(box, "perf-hawk"), "utf8"));
  assert.deepEqual(validateRole(written), [], `the file must be valid: ${JSON.stringify(written)}`);
  assert.equal(written.role, "Performance Hawk");
  assert.equal(written.yearsOfExperience, 12);
  assert.deepEqual(written.skills, ["profiling", "caching"]);
});

test("a role created this way shows up as the user's, not as embedded", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const listed = roles(box, "list");
  assert.match(listed.stdout, /perf-hawk/, "the new role is in the merged view");
  assert.match(listed.stdout, /perf-hawk.*user|user.*perf-hawk/s, "and it is attributed to the user layer");
});

test("new refuses to overwrite a role the user already has", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const again = roles(box, "new", "perf-hawk", "--role", "Someone Else", "--skills", "guessing");
  assert.equal(again.status, 1, "a second new must not silently replace the first");
  assert.match(`${again.stdout}${again.stderr}`, /perf-hawk/, "and it says which role is in the way");
});

test("new says what is missing instead of writing an invalid file", () => {
  const box = sandbox();
  const run = roles(box, "new", "perf-hawk");

  assert.equal(run.status, 1);
  assert.match(`${run.stdout}${run.stderr}`, /--role/, "the missing flag is named");
  assert.equal(existsSync(overlayFile(box, "perf-hawk")), false, "nothing is written when the input is incomplete");
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

test("deprecate flips the status in the user layer", () => {
  const box = sandbox();
  roles(box, "new", "perf-hawk", "--role", "Performance Hawk", "--skills", "profiling");

  const run = roles(box, "deprecate", "perf-hawk", "--by", "security");
  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);

  const written = JSON.parse(readFileSync(overlayFile(box, "perf-hawk"), "utf8"));
  assert.equal(written.status, "deprecated");
  assert.equal(written.deprecatedBy, "security");
  assert.deepEqual(validateRole(written), [], "a deprecated role still has to validate");
});

test("deprecating an embedded role writes the user's own copy of it", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "architect", "--by", "security");

  assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
  const written = JSON.parse(readFileSync(overlayFile(box, "architect"), "utf8"));
  assert.equal(written.status, "deprecated", "the embedded catalog is never edited; the overlay wins instead");
  assert.equal(written.role, "Software Architect", "and the copy keeps what the embedded role said");
});

test("deprecate needs to know what replaces the role", () => {
  const box = sandbox();
  const run = roles(box, "deprecate", "architect");

  assert.equal(run.status, 1, "a deprecated role with nothing to point at would not validate");
  assert.match(`${run.stdout}${run.stderr}`, /--by/, "so the flag is named");
});

test("an unknown role is refused, with the known ones listed", () => {
  const box = sandbox();
  const run = roles(box, "show", "wizard");

  assert.equal(run.status, 1);
  assert.match(`${run.stdout}${run.stderr}`, /wizard/, "the name that was not found");
  assert.match(`${run.stdout}${run.stderr}`, /security/, "and the names that would have worked");
});

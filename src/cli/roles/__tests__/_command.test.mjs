

/** rolesCommand's four subcommands and their error branches, none of which had a test before. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, test } from "node:test";

process.env.RULE_MCP_HOME = mkdtempSync(join(tmpdir(), "rule-roles-"));

const { rolesCommand } = await import("../_command.js");
const { mergedRoles, userRolesDir } = await import("../_store.js");

const { roles } = mergedRoles();
const [roleA, roleB] = roles;

const out = (fn) => {
  const chunks = [];
  const write = process.stdout.write;

  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));

    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = write;
  }

  return chunks.join("");
};

beforeEach(() => {
  process.exitCode = 0;
});

test("list prints the table by default and JSON on request", () => {
  const table = out(() => rolesCommand("list"));

  assert.match(table, /Review personas/);
  assert.match(table, new RegExp(roleA.id));

  const json = out(() => rolesCommand("list", { json: true }));
  const parsed = JSON.parse(json);

  assert.ok(Array.isArray(parsed.roles));
  assert.ok(parsed.roles.some((role) => role.id === roleA.id));
});

test("show renders a known role and refuses an unknown one", () => {
  const text = out(() => rolesCommand("show", { id: roleA.id }));

  assert.match(text, new RegExp(roleA.id));
  assert.match(text, /Layer:/);

  const json = out(() => rolesCommand("show", { id: roleA.id, json: true }));

  assert.equal(JSON.parse(json).id, roleA.id);

  process.exitCode = 0;
  const refusal = out(() => rolesCommand("show", { id: "not-a-real-role" }));

  assert.match(refusal, /Unknown role/);
  assert.equal(process.exitCode, 1);
});

test("new refuses with no id, an existing id, or a missing title/skills, and writes on success", () => {
  const noId = out(() => rolesCommand("new", {}));

  assert.match(noId, /Usage: rule-mcp roles new/);
  assert.equal(process.exitCode, 1);

  process.exitCode = 0;
  const noTitle = out(() => rolesCommand("new", { id: "probe-role" }));

  assert.match(noTitle, /needs a title and at least one skill/);
  assert.equal(process.exitCode, 1);

  process.exitCode = 0;
  const written = out(() => rolesCommand("new", { id: "probe-role", role: "Probe Role", skills: "rule-styleguide-css, rule-styleguide-html" }));

  assert.match(written, /Wrote/);
  assert.ok(existsSync(join(userRolesDir(), "probe-role.md")), "the user layer gets the new role file");

  process.exitCode = 0;
  const duplicate = out(() => rolesCommand("new", { id: "probe-role", role: "Probe Role", skills: "rule-styleguide-css" }));

  assert.match(duplicate, /already has "probe-role"/);
  assert.equal(process.exitCode, 1);
});

test("deprecate refuses an unknown id, a missing --by, an unknown --by, and writes on success", () => {
  const unknownId = out(() => rolesCommand("deprecate", { id: "not-a-real-role", by: roleB.id }));

  assert.match(unknownId, /Unknown role/);
  assert.equal(process.exitCode, 1);

  process.exitCode = 0;
  const noBy = out(() => rolesCommand("deprecate", { id: roleA.id }));

  assert.match(noBy, /has to name its replacement/);
  assert.equal(process.exitCode, 1);

  process.exitCode = 0;
  const unknownBy = out(() => rolesCommand("deprecate", { id: roleA.id, by: "not-a-real-role" }));

  assert.match(unknownBy, /Unknown role/);
  assert.equal(process.exitCode, 1);

  process.exitCode = 0;
  const written = out(() => rolesCommand("deprecate", { id: roleA.id, by: roleB.id }));

  assert.match(written, new RegExp(`${roleA.id} is deprecated`));

  const saved = readFileSync(join(userRolesDir(), `${roleA.id}.md`), "utf8");

  assert.match(saved, /deprecated/);
});

test("an unrecognized subcommand prints usage and exits 1", () => {
  const text = out(() => rolesCommand("bogus"));

  assert.match(text, /Usage: rule-mcp roles/);
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
});

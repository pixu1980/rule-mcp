/**
 * Persona catalog contract: every persona lives as one markdown file in
 * `src/roles/` (frontmatter + a lenses bullet list in the body, same format
 * as the user overlay layer), the server reads the folder at startup, and the
 * plan / audit / review surfaces are generated from what is on disk - so
 * adding or removing a file adds or removes a persona everywhere (prompts,
 * slash commands, tools, census).
 *
 * Pinned here: the folder is the single source of truth, a persona can be
 * dropped in and picked up by the loader without touching code, a broken file
 * is reported by name (never fatal for overlays), and the active set that
 * drives every surface is exactly what the folder holds.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { EMBEDDED_ROLES, loadPersonaCatalog, activeRoles, validateRole } from "../index.js";
import { parsePersonaFile, formatPersonaFile } from "../../persona-file/index.js";

const PERSONA_DIR = fileURLToPath(new URL("../../../../roles", import.meta.url));

test("src/roles is the single source of truth for the embedded personas", () => {
  const files = readdirSync(PERSONA_DIR).filter((name) => name.endsWith(".md"));
  assert.ok(files.length >= 18, "the shipped catalog still has the full persona set");
  assert.equal(EMBEDDED_ROLES.length, files.length, "every persona file is loaded, nothing else");

  const ids = new Set(EMBEDDED_ROLES.map((role) => role.id));
  assert.equal(ids.size, EMBEDDED_ROLES.length, "persona ids are unique");
  for (const role of EMBEDDED_ROLES) {
    assert.deepEqual(validateRole(role), [], `${role.id}: persona must validate`);
    assert.ok(/^[a-z][a-z0-9-]*$/.test(role.id), `${role.id}: kebab-case id`);
  }

  for (const file of files) {
    const text = readFileSync(join(PERSONA_DIR, file), "utf8");
    const parsed = parsePersonaFile(text);
    assert.equal(parsed.id, file.replace(/\.md$/, ""), `${file}: id matches the file name`);
    assert.ok(Array.isArray(parsed.lenses) && parsed.lenses.length > 0, `${file}: lenses are a list, in the body`);
    // The persona format is markdown with real frontmatter, not a JSON shim.
    assert.match(text, /^---\s*\n/, `${file}: starts with frontmatter`);
    assert.match(text, /^# /m, `${file}: has a markdown body`);
  }
});

test("a persona can be added and removed at will via the folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-personas-"));
  try {
    const efficiency = {
      id: "efficiency",
      role: "Efficiency Engineer",
      yearsOfExperience: 12,
      skills: ["measuring waste"],
      evidenceSkills: [],
      lenses: ["the measured before the claimed"],
      aliases: [],
      status: "active",
      version: 1,
    };
    writeFileSync(
      join(dir, "architect.md"),
      formatPersonaFile({
        id: "architect",
        role: "Software Architect",
        yearsOfExperience: 30,
        skills: ["architecture"],
        evidenceSkills: [],
        lenses: ["boundaries"],
        aliases: [],
        status: "active",
        version: 1,
      }),
    );
    writeFileSync(join(dir, "efficiency.md"), formatPersonaFile(efficiency));

    const { roles, problems } = loadPersonaCatalog(dir);
    assert.deepEqual(problems, []);
    assert.deepEqual(
      roles.map((r) => r.id),
      ["architect", "efficiency"],
      "both personas load, in filename order",
    );
    assert.deepEqual(roles.find((r) => r.id === "efficiency").lenses, ["the measured before the claimed"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a broken persona file is reported by name, never fatal", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-personas-bad-"));
  try {
    writeFileSync(join(dir, "broken.md"), "no frontmatter here, not a persona");
    const { roles, problems } = loadPersonaCatalog(dir);
    assert.equal(roles.length, 0);
    assert.equal(problems.length, 1, "the broken file is reported");
    assert.match(problems[0].file, /broken\.md/, "and named");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the active set that drives every plan/audit/review surface is the folder", () => {
  const active = activeRoles()
    .map((role) => role.id)
    .sort();
  const onDisk = readdirSync(PERSONA_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parsePersonaFile(readFileSync(join(PERSONA_DIR, name), "utf8")))
    .filter((role) => role.status === "active")
    .map((role) => role.id)
    .sort();
  assert.deepEqual(active, onDisk);
});

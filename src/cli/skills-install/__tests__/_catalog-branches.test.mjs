

/**
 * Branch coverage for getAvailableSkills empty-catalog, missing SKILL.md, and
 * frontmatter fallbacks. Uses a temp embedded catalog via registerHooks so the
 * repo skills/ tree is never touched.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const catalogRoot = mkdtempSync(join(tmpdir(), "rule-mcp-catalog-branches-"));
const embedded = join(catalogRoot, "embedded");
const missing = join(catalogRoot, "missing-embedded");
const stubPathsUrl = pathToFileURL(join(import.meta.dirname, "_catalog-paths.stub.mjs")).href;

mkdirSync(embedded, { recursive: true });

Object.defineProperty(globalThis, "__ruleCatalogBranches", {
  configurable: true,
  value: {
    embeddedSkills: embedded,
    homeSkills: join(catalogRoot, "home"),
  },
});

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "../paths/index.js" && context.parentURL?.includes("skills-install/_catalog.js")) {
      return { url: stubPathsUrl, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});

const { getAvailableSkills } = await import("../_catalog.js");

test.after(() => {
  rmSync(catalogRoot, { recursive: true, force: true });
});

test("a missing embedded catalog returns an empty list", () => {
  globalThis["__ruleCatalogBranches"].embeddedSkills = missing;
  assert.deepEqual(getAvailableSkills(), []);
  globalThis["__ruleCatalogBranches"].embeddedSkills = embedded;
});

test("directories without SKILL.md are skipped and empty frontmatter falls back", () => {
  globalThis["__ruleCatalogBranches"].embeddedSkills = embedded;
  mkdirSync(join(embedded, "no-skill-md"), { recursive: true });
  writeFileSync(join(embedded, "no-skill-md", "README.md"), "# not a skill\n");

  const bare = join(embedded, "bare-meta");
  mkdirSync(bare, { recursive: true });
  writeFileSync(join(bare, "SKILL.md"), "# Body without frontmatter\n");

  // A plain file at the catalog root must not become a skill row.
  writeFileSync(join(embedded, "notes.txt"), "ignore me\n");

  const skills = getAvailableSkills();

  assert.equal(
    skills.some((skill) => skill.name === "no-skill-md"),
    false,
    "a directory without SKILL.md is skipped",
  );
  const row = skills.find((skill) => skill.name === "bare-meta");

  assert.ok(row, "a SKILL.md with empty frontmatter still lists");
  assert.equal(row.displayName, "bare-meta", "empty name falls back to the directory name");
  assert.equal(row.description, "(no description)", "empty description falls back");
});

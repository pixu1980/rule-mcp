/**
 * @module test/skills-docs
 *
 * Documentation quality checks for pix AI skill corpus.
 * Keeps skills portable across LLM clients by enforcing consistent metadata,
 * resolvable cross-references, and no accidental concatenated skill documents.
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSkillFrontmatter, loadAllSkills } from "../src/core/skills.js";
import { listTools } from "../src/tools/router.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skillsRoot = join(root, "skills");

const removedSkillNames = [
  "pix-scaffolding",
  "pix-coverage-gates",
  "pix-devops-docker-standards",
  "pix-frontend-forms",
  "pix-frontend-forms-validation",
];

function skillDirs() {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function stripFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function markdownLinks(markdown) {
  const withoutCode = stripFencedCode(markdown);
  return [...withoutCode.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)/g)].map((match) => match[1]);
}

console.log("pix skill documentation test");

const dirs = skillDirs();
assert(dirs.length > 0, "No skill directories found");
assert(dirs.includes("pix-ui"), "pix-ui umbrella skill must be present");
assert(dirs.includes("pix-ui-design-system"), "pix-ui-design-system skill must be present");
for (const requiredSkill of [
  "pix-backend-graphql",
  "pix-devops-observability",
  "pix-process-code-review",
]) {
  assert(dirs.includes(requiredSkill), `${requiredSkill} must be present`);
}

for (const dir of dirs) {
  const skillPath = join(skillsRoot, dir, "SKILL.md");
  assert(existsSync(skillPath), `Missing SKILL.md for ${dir}`);

  const content = readFileSync(skillPath, "utf8");
  const metadata = parseSkillFrontmatter(content);

  assert.equal(metadata.name, dir, `${dir}: frontmatter name must match directory`);
  assert(metadata.description?.length > 20, `${dir}: description must be present and useful`);
  assert(Array.isArray(metadata.tags) && metadata.tags.length > 0, `${dir}: tags must be a non-empty YAML list`);
  assert(Array.isArray(metadata.frameworks) && metadata.frameworks.length > 0, `${dir}: frameworks must be present`);

  const innerFrontmatterCount = (content.match(/\n---\nname:\s*pix-/g) || []).length;
  assert.equal(innerFrontmatterCount, 0, `${dir}: contains an embedded second SKILL.md document`);

  assert(content.includes("## See also"), `${dir}: missing See also cross-reference section`);

  for (const removedName of removedSkillNames) {
    assert(!content.includes(removedName), `${dir}: references removed/non-existent skill ${removedName}`);
  }

  for (const href of markdownLinks(content)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
    const target = href.split("#")[0];
    if (!target) continue;
    const resolved = resolve(join(skillsRoot, dir), target);
    assert(existsSync(resolved), `${dir}: broken markdown link ${href}`);
  }
}

const dispatcherSkill = readFileSync(join(skillsRoot, "pix", "SKILL.md"), "utf8");
for (const requiredSkill of [
  "pix-backend-graphql",
  "pix-devops-observability",
  "pix-process-code-review",
]) {
  assert(dispatcherSkill.includes(`../${requiredSkill}/SKILL.md`), `pix must link ${requiredSkill}`);
}

const uiSkill = readFileSync(join(skillsRoot, "pix-ui", "SKILL.md"), "utf8");
for (const required of ["pix-ui-design-system", "pix-frontend", "pix-styleguide", "pix_tool_check"]) {
  assert(uiSkill.includes(required), `pix-ui must reference ${required}`);
}

const uiDesignSkill = readFileSync(join(skillsRoot, "pix-ui-design-system", "SKILL.md"), "utf8");
for (const required of ["Zero CSS classes", "Zero inline styles", "Semantic HTML", "adoptedStyleSheets", "WCAG 2.2 AA", "pix_tool_check"]) {
  assert(uiDesignSkill.includes(required), `pix-ui-design-system must enforce ${required}`);
}

const sqlSkill = readFileSync(join(skillsRoot, "pix-data-sql", "SKILL.md"), "utf8");
for (const required of [
  "database is the authority",
  "EAV",
  "COMMENT ON COLUMN",
  "schema tests",
  "ORM",
  "Soft delete is a policy choice",
  "Avoid overloaded tables",
]) {
  assert(sqlSkill.includes(required), `pix-data-sql must cover ${required}`);
}

const postgresSkill = readFileSync(join(skillsRoot, "pix-data-postgresql", "SKILL.md"), "utf8");
for (const required of ["referencing side of a foreign key", "timestamptz", "PostgreSQL 18"]) {
  assert(postgresSkill.includes(required), `pix-data-postgresql must cover ${required}`);
}

const mysqlSkill = readFileSync(join(skillsRoot, "pix-data-mysql", "SKILL.md"), "utf8");
assert(
  mysqlSkill.includes("InnoDB automatically indexes foreign-key columns"),
  "pix-data-mysql must document InnoDB foreign-key indexing",
);

const typescriptSkill = readFileSync(join(skillsRoot, "pix-toolchain-typescript", "SKILL.md"), "utf8");
for (const required of [
  'exactOptionalPropertyTypes": true',
  "verbatimModuleSyntax",
  "noFallthroughCasesInSwitch",
  "unknown over any",
  "discriminated union",
  "branded types",
  "runtime validation",
  "generated types",
  "type-coverage",
  "tsc --noEmit",
]) {
  assert(typescriptSkill.includes(required), `pix-toolchain-typescript must cover ${required}`);
}

await loadAllSkills(true);
const tools = listTools();
assert(tools.some(tool => tool.name === "pix_tool_ui"), "pix_tool_ui MCP tool must be registered");
assert(tools.some(tool => tool.name === "pix_tool_ui_design_system"), "pix_tool_ui_design_system MCP tool must be registered");
for (const tool of tools) {
  assert(tool.description && tool.description.length > 20, `${tool.name}: MCP tool description must be useful`);
}

console.log(`  ✅ ${dirs.length} skills and ${tools.length} tools have consistent docs metadata and cross-references`);

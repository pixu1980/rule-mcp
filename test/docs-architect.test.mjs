/**
 * @module test/docs-architect
 *
 * Regression checks for docs consolidation, ADR summaries, and the
 * rule-architect context template inventory.
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function listFiles(path) {
  return readdirSync(join(root, path), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function placeholdersFromTemplates(templates) {
  const names = new Set();
  for (const template of templates) {
    for (const match of template.content.matchAll(/\[([A-Z_0-9]+)\]/g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

console.log("rule docs + architect test");

// ── Docs are consolidated into fewer, navigable files ─────────────
const expectedDocs = [
  "docs/README.md",
  "docs/01-product-architecture.md",
  "docs/02-tools-operations.md",
  "docs/03-engineering-guides.md",
  "docs/04-roadmap-plans.md",
];
for (const file of expectedDocs) {
  assert.ok(existsSync(join(root, file)), `Missing consolidated doc: ${file}`);
}

const docsRootFiles = listFiles("docs").filter((file) => file.endsWith(".md"));
assert.ok(
  docsRootFiles.length <= 8,
  `Expected <= 8 root docs, found ${docsRootFiles.length}: ${docsRootFiles.join(", ")}`,
);

const docsIndex = read("docs/README.md");
for (const file of expectedDocs.slice(1)) {
  assert.ok(docsIndex.includes(file.replace("docs/", "./")), `docs/README.md must link ${file}`);
}
for (const legacySource of [
  "docs/ANALYSIS.md",
  "docs/ARCHITECTURE.md",
  "docs/TOOLS.md",
  "docs/TROUBLESHOOTING.md",
  "docs/plans/execution-plan.md",
  "docs/plans/refactor-roadmap.md",
]) {
  assert.ok(docsIndex.includes(legacySource), `content manifest must preserve ${legacySource}`);
}

// ── ADR summaries cover every ADR file ────────────────────────────
const allAdrMarkdown = listFiles("docs/adr").filter(
  (file) => file.endsWith(".md") && !["README.md", "DECISIONS.md"].includes(file),
);
assert.ok(
  allAdrMarkdown.every((file) => /^\d{3}-.+\.md$/.test(file)),
  `ADR filenames must be 001-*.md without ADR- prefix: ${allAdrMarkdown.join(", ")}`,
);
const adrFiles = allAdrMarkdown;
assert.ok(adrFiles.length > 0, "No ADR files found");
assert.deepEqual(
  adrFiles.map((file) => file.slice(0, 3)),
  adrFiles.map((_, index) => String(index + 1).padStart(3, "0")),
  "ADR numbering must be contiguous from 001",
);
const adrReadme = read("docs/adr/README.md");
const decisions = read("docs/adr/DECISIONS.md");
for (const file of adrFiles) {
  assert.ok(adrReadme.includes(file), `ADR README missing ${file}`);
  assert.ok(decisions.includes(file), `ADR decisions summary missing ${file}`);
}
assert.ok(decisions.includes("## Decision themes"), "DECISIONS.md must summarize ADR themes");
assert.ok(decisions.includes("## Complete ADR summary"), "DECISIONS.md must include complete ADR summary");

// ── Architect templates are inventoried and placeholder-complete ───
const architectSkill = read("skills/rule-architect/SKILL.md");
for (const required of [
  "rule_tool_detect",
  "rule_tool_fix",
  "rule_tool_process_adr",
  "rule_tool_process_handoff",
  "rule_tool_component",
  "rule_tool_check",
]) {
  assert.ok(architectSkill.includes(required), `rule-architect must reference ${required}`);
}

const inventory = read("skills/rule-architect/knowledge/context-inventory.md");
assert.ok(inventory.includes("## Generated .context files"), "context inventory missing generated files section");
assert.ok(inventory.includes("## Placeholder coverage"), "context inventory missing placeholder coverage");
assert.ok(inventory.includes("## Skill and tool routing"), "context inventory missing skill/tool routing section");

// templates.json is the canonical file (skills/rule-architect/templates.json,
// also used by generator.mjs and context-server.mjs); the stale local copy under
// assets/context-server/ was removed as part of the generation-pipeline unification.
//
// Phase 2 Task 3: assets/context-server/placeholders.json was deleted (context-server
// now serves the canonical wizard-spec.json + shared interview.js). This assertion is
// repointed to skills/rule-architect/placeholders.json, which still exists on disk.
// NOTE: this line is currently unreachable - the docs-count assertion above (line ~52)
// already aborts the script before execution reaches here, and even if that gate were
// fixed, this assertion would still fail because skills/rule-architect/placeholders.json
// is missing the DEVOPS_*/PROCESS_* keys (pre-existing F2/F4 gap, out of scope for this
// task). Repointing here only avoids referencing a now-deleted path; it does not turn
// this test green.
const templates = JSON.parse(read("skills/rule-architect/templates.json"));
const placeholderSchema = JSON.parse(read("skills/rule-architect/placeholders.json"));
const templatePlaceholders = placeholdersFromTemplates(templates);
const schemaKeys = new Set();
function collectSchemaKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaKeys(item);
    }
    return;
  }
  if (value && typeof value === "object") {
    if (typeof value.key === "string" && (value.type || value.label)) {
      schemaKeys.add(value.key);
    }
    for (const child of Object.values(value)) {
      collectSchemaKeys(child);
    }
  }
}
collectSchemaKeys(placeholderSchema);
for (const key of templatePlaceholders) {
  assert.ok(schemaKeys.has(key), `Placeholder ${key} used in templates but missing from placeholders.json`);
}
for (const required of [
  "RULE_MCP_PRIMARY_SKILL",
  "RULE_MCP_SECONDARY_SKILLS",
  "RULE_MCP_RECOMMENDED_TOOLS",
  "ARCHITECTURE_DECISIONS",
  "QUALITY_GATES",
  "DELIVERY_WORKFLOW",
]) {
  assert.ok(templatePlaceholders.includes(required), `Templates must use ${required}`);
}

function skillSectionTitles(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  assert.ok(start !== -1, `Missing heading ${startHeading}`);
  const end = endHeading ? markdown.indexOf(endHeading, start) : markdown.length;
  const body = markdown.slice(start, end > start ? end : markdown.length);
  return [...body.matchAll(/^### (.+)$/gm)]
    .map((match) => match[1])
    .filter((title) => !title.includes("Skill tool naming"));
}

function assertAlphabetical(values, label) {
  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(values, sorted, `${label} must be alphabetical: ${values.join(", ")}`);
}

assertAlphabetical(
  skillSectionTitles(read("skills/rule/SKILL.md"), "## Complete skill inventory", "## Recommended dispatch bundles"),
  "rule skill sections",
);
assertAlphabetical(
  skillSectionTitles(
    read("skills/rule-architect/SKILL.md"),
    "## Complete skill coverage",
    "## Generated `.context/` output",
  ),
  "rule-architect skill sections",
);

const roadmap = read("docs/04-roadmap-plans.md");
assert.ok(
  !roadmap.includes("## 9. Migration Guide"),
  "Roadmap must not include a migration guide section before first release",
);
assert.ok(
  roadmap.includes("Final rule-architect UI/UX Implementation Plan"),
  "Roadmap must include the final mirrored CLI/Web UX plan",
);

console.log("  ✅ docs, ADR summaries, architect inventory, and skill ordering are coherent");

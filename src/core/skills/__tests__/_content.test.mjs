

/** Named skills must keep their load-bearing content, and every MCP tool a useful description. */
import { strict as assert } from "node:assert";

import { loadAllSkills } from "../index.js";
import { listTools } from "../../../tools/router/index.js";
import { skillDoc, skillFile } from "./_docs.fixture.mjs";

console.log("rule-mcp skill documentation test: required content");

const dispatcherSkill = skillDoc("rule-mcp");
for (const requiredSkill of ["rule-mcp-backend-graphql", "rule-mcp-devops-observability", "rule-mcp-process-code-review"]) {
  assert.ok(dispatcherSkill.includes(`../${requiredSkill}/SKILL.md`), `rule-mcp must link ${requiredSkill}`);
}

const uiSkill = skillDoc("rule-mcp-ui");
for (const required of ["rule-mcp-ui-design-system", "rule-mcp-frontend", "rule-mcp-styleguide", "rule_tool_check"]) {
  assert.ok(uiSkill.includes(required), `rule-mcp-ui must reference ${required}`);
}

const uiDesignSkill = skillDoc("rule-mcp-ui-design-system");
for (const required of ["Zero CSS classes", "Zero inline styles", "Semantic HTML", "adoptedStyleSheets", "WCAG 2.2 AA", "rule_tool_check"]) {
  assert.ok(uiDesignSkill.includes(required), `rule-mcp-ui-design-system must enforce ${required}`);
}

const sqlSkill = skillDoc("rule-mcp-data-sql");
for (const required of ["database is the authority", "EAV", "COMMENT ON COLUMN", "schema tests", "ORM", "Soft delete is a policy choice", "Avoid overloaded tables"]) {
  assert.ok(sqlSkill.includes(required), `rule-mcp-data-sql must cover ${required}`);
}

const postgresSkill = skillDoc("rule-mcp-data-postgresql");
for (const required of ["referencing side of a foreign key", "timestamptz", "PostgreSQL 18"]) {
  assert.ok(postgresSkill.includes(required), `rule-mcp-data-postgresql must cover ${required}`);
}

const mysqlSkill = skillDoc("rule-mcp-data-mysql");
assert.ok(mysqlSkill.includes("InnoDB automatically indexes foreign-key columns"), "rule-mcp-data-mysql must document InnoDB foreign-key indexing");

const typescriptSkill = skillDoc("rule-mcp-styleguide-typescript");
for (const required of ["unknown` forces a check", "catch clauses take unknown", "discriminated union", "branded types"]) {
  assert.ok(typescriptSkill.includes(required), `rule-mcp-styleguide-typescript must cover ${required}`);
}

const typescriptCompiler = skillFile("rule-mcp-styleguide-typescript", "COMPILER.md");
for (const required of [
  'exactOptionalPropertyTypes": true',
  "verbatimModuleSyntax",
  "noFallthroughCasesInSwitch",
  "runtime validation",
  "generated types",
  "type-coverage",
  "tsc --noEmit",
]) {
  assert.ok(typescriptCompiler.includes(required), `rule-mcp-styleguide-typescript/COMPILER.md must cover ${required}`);
}

const eslintSkill = skillDoc("rule-mcp-toolchain-eslint");
for (const required of [
  "eslint-plugin-unicorn",
  "unicorn.configs.recommended",
  "unicorn.configs.unopinionated",
  "prefer-set-has",
  "no-array-for-each",
  "prefer-node-protocol",
  "throw-new-error",
  "prefer-string-replace-all",
  "prefer-array-flat-map",
  "new-for-builtins",
  "prevent-abbreviations",
  "no-null",
  "filename-case",
  "recommended-type-checked",
  "FlatCompat",
  "eslint.config.mjs",
]) {
  assert.ok(eslintSkill.includes(required), `rule-mcp-toolchain-eslint must cover ${required}`);
}

const jsStyleguide = skillDoc("rule-mcp-styleguide-javascript");
for (const required of ["new Set(", "Set.has", "for...of", "node:fs", "throw new Error", "replaceAll", "flatMap", "new Map(", "prefer-const"]) {
  assert.ok(jsStyleguide.includes(required), `rule-mcp-styleguide-javascript must cover ${required}`);
}

await loadAllSkills(true);
const tools = listTools();
assert.ok(
  tools.some((tool) => tool.name === "rule_tool_ui"),
  "rule_tool_ui MCP tool must be registered",
);
assert.ok(
  tools.some((tool) => tool.name === "rule_tool_ui_design_system"),
  "rule_tool_ui_design_system MCP tool must be registered",
);
for (const tool of tools) {
  assert.ok(tool.description && tool.description.length > 20, `${tool.name}: MCP tool description must be useful`);
}

console.log(`  \u{2705} ${tools.length} tools carry useful descriptions and the named skills keep their content`);

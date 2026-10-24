/**
 * The SKILL.md frontmatter contract, including the three fields a skill needs
 * to own its guardrails and declare its surface (ADR 089): `guardrails`,
 * `inherits`, `exposeTool`.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { parseSkillFrontmatter } from "../_frontmatter.js";

/** A SKILL.md with the given frontmatter body. */
const skill = (frontmatter) => `---\n${frontmatter}\n---\n\n# A skill\n\nBody.\n`;

test("the existing fields still parse", () => {
  const meta = parseSkillFrontmatter(skill(["name: rule-devops-docker", "description: Use when creating Docker configuration.", "tags:", "  - docker", "  - devops"].join("\n")));

  assert.equal(meta.name, "rule-devops-docker");
  assert.equal(meta.description, "Use when creating Docker configuration.");
  assert.deepEqual(meta.tags, ["docker", "devops"]);
});

test("content with no frontmatter yields nothing rather than throwing", () => {
  assert.deepEqual(parseSkillFrontmatter("# Just a heading\n"), {});
  assert.deepEqual(parseSkillFrontmatter(""), {});
  assert.deepEqual(parseSkillFrontmatter(), {});
});

test("guardrails and inherits parse as block lists", () => {
  const meta = parseSkillFrontmatter(
    skill(
      ["name: rule-backend-express", "guardrails:", "  - express-async-errors", "  - express-helmet", "inherits:", "  - rule-backend", "  - rule-styleguide-javascript"].join("\n"),
    ),
  );

  assert.deepEqual(meta.guardrails, ["express-async-errors", "express-helmet"], "the rules the skill defines");
  assert.deepEqual(meta.inherits, ["rule-backend", "rule-styleguide-javascript"], "the skills it takes rules from");
});

test("guardrails and inherits also parse inline", () => {
  const meta = parseSkillFrontmatter(skill(["name: rule-frontend-react", "guardrails: [react-no-classname, react-hooks-rules]", "inherits: [rule-styleguide-css]"].join("\n")));

  assert.deepEqual(meta.guardrails, ["react-no-classname", "react-hooks-rules"], "an inline list is the same list");
  assert.deepEqual(meta.inherits, ["rule-styleguide-css"]);
});

test("an empty list is an empty list, not a missing field", () => {
  const inline = parseSkillFrontmatter(skill(["name: rule-process-compression", "guardrails: []", "inherits: []"].join("\n")));

  assert.deepEqual(inline.guardrails, [], "a skill can say it defines no rules");
  assert.deepEqual(inline.inherits, [], "and that it inherits none");
});

test("a skill that declares neither field reports neither", () => {
  const meta = parseSkillFrontmatter(skill("name: rule-process-compression"));

  assert.equal(meta.guardrails, undefined, "absent is absent: the loader decides what that means");
  assert.equal(meta.inherits, undefined);
  assert.equal(meta.exposeTool, undefined);
});

test("exposeTool parses as a boolean", () => {
  assert.equal(parseSkillFrontmatter(skill(["name: my-rules", "exposeTool: true"].join("\n"))).exposeTool, true);
  assert.equal(parseSkillFrontmatter(skill(["name: my-rules", "exposeTool: false"].join("\n"))).exposeTool, false);
  assert.equal(parseSkillFrontmatter(skill(["name: my-rules", "exposeTool: yes"].join("\n"))).exposeTool, true, "yaml truthiness is accepted");
  assert.equal(parseSkillFrontmatter(skill(["name: my-rules", "exposeTool: no"].join("\n"))).exposeTool, false);
});

test("quoted list entries lose their quotes", () => {
  const meta = parseSkillFrontmatter(skill(["guardrails: [\"a-rule\", 'b-rule']", "inherits:", '  - "rule-backend"'].join("\n")));

  assert.deepEqual(meta.guardrails, ["a-rule", "b-rule"]);
  assert.deepEqual(meta.inherits, ["rule-backend"]);
});

test("a list ends where the frontmatter's next key begins", () => {
  const meta = parseSkillFrontmatter(skill(["guardrails:", "  - only-one", "inherits:", "  - rule-backend", "description: Still parsed."].join("\n")));

  assert.deepEqual(meta.guardrails, ["only-one"], "the list stops at the next key");
  assert.deepEqual(meta.inherits, ["rule-backend"]);
  assert.equal(meta.description, "Still parsed.", "and the key after it still parses");
});

test("a flow sequence a formatter wrapped across lines still parses", () => {
  // Prettier rewrites a long `guardrails: [a, b, c]` into this shape, and a
  // parser that only knew the two compact forms read it as empty.
  const meta = parseSkillFrontmatter(
    skill(
      ["name: rule-frontend-vanilla-reactive", "guardrails:", "  [", "    vanilla-adopted-stylesheets,", "    vanilla-ce-extends,", "  ]", "inherits: [rule-styleguide]"].join(
        "\n",
      ),
    ),
  );

  assert.deepEqual(meta.guardrails, ["vanilla-adopted-stylesheets", "vanilla-ce-extends"], "the wrapped entries are the list");
  assert.deepEqual(meta.inherits, ["rule-styleguide"], "and the key after it still parses");
});

test("an empty wrapped flow sequence is an empty list", () => {
  const meta = parseSkillFrontmatter(skill(["name: rule-mcp-text-only", "guardrails:", "  [", "  ]"].join("\n")));

  assert.deepEqual(meta.guardrails, []);
});

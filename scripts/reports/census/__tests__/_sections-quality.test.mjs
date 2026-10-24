

/**
 * The census renders documents nobody edits, so a missing field must become a
 * dash and not the word `undefined`. Every arm here is one such field: a role
 * with no lenses, a rule with no label, a resource with no media type.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { guardrailSection, personaSection, resourceSection } from "../_sections-quality.mjs";

const joined = (lines) => lines.join("\n");

test("a fully described role renders every column", () => {
  const out = joined(
    personaSection({
      roles: [
        {
          id: "security",
          role: "Security Engineer",
          yearsOfExperience: 25,
          lenses: ["threat model", "secrets"],
          aliases: ["sec", "appsec"],
          status: "active",
          evidenceSkills: ["rule-mcp-backend-security"],
        },
      ],
    }),
  );

  assert.match(out, /\| `security` +\| Security Engineer +\| 25 +\| 2 +\| active +\| `rule-mcp-backend-security` \|/);
  assert.match(out, /### Security Engineer \(`security`\)/);
  assert.match(out, /- \*\*Lenses\*\*: `threat model`; `secrets`/);
  assert.match(out, /- \*\*Aliases\*\*: `sec`, `appsec`/);
});

test("a role with nothing optional renders dashes, never undefined", () => {
  const out = joined(personaSection({ roles: [{ id: "bare", role: "Bare Role", yearsOfExperience: 1, status: "proposed" }] }));

  assert.match(out, /- \*\*Lenses\*\*: -/, "no lenses is a dash");
  assert.match(out, /- \*\*Aliases\*\*: -/, "no aliases is a dash");
  assert.doesNotMatch(out, /undefined/, "an absent field never reaches the page");
  assert.match(out, /\| 0 +\|/, "an absent lens list counts as zero");
});

test("a rule in two families is cross-referenced from both", () => {
  const shared = { id: "no-emdash", label: "No em dash", description: "An em dash in prose" };
  const out = joined(
    guardrailSection({
      guardrailIds: new Set(["no-emdash", "css-flex-first"]),
      families: [
        ["prose", [shared]],
        ["a11y", [shared, { id: "css-flex-first", label: "Flex first", description: "An unjustified grid" }]],
      ],
    }),
  );

  assert.match(out, /## Guardrail rules \(2 distinct\)/);
  assert.match(out, /### prose/);
  assert.match(out, /### a11y/);
  assert.match(out, /\| `no-emdash` +\| No em dash +\| An em dash in prose +\| a11y +\|/, "the prose row names the other family");
  assert.match(out, /\| `css-flex-first` +\| Flex first +\| An unjustified grid +\| - +\|/, "a rule in one family gets a dash");
});

test("a rule with no label or description renders empty cells rather than undefined", () => {
  const out = joined(guardrailSection({ guardrailIds: new Set(["bare"]), families: [["prose", [{ id: "bare" }]]] }));

  assert.doesNotMatch(out, /undefined/, "an absent label never reaches the page");
  assert.match(out, /\| `bare` +\|/);
});

test("a family with no declared scope leaves the cell empty", () => {
  const out = joined(guardrailSection({ guardrailIds: new Set(["x"]), families: [["not-a-real-family", [{ id: "x", label: "X", description: "Y" }]]] }));

  assert.match(out, /\[`not-a-real-family`\]\(#not-a-real-family\)/, "the anchor strips nothing it does not have to");
  assert.doesNotMatch(out, /undefined/);
});

test("a family name with a colon is anchored without it", () => {
  const out = joined(guardrailSection({ guardrailIds: new Set(["x"]), families: [["rule-mcp:prose", [{ id: "x", label: "X", description: "Y" }]]] }));

  assert.match(out, /\[`rule-mcp:prose`\]\(#rule-mcpprose\)/, "the colon is dropped from the anchor, not from the label");
});

test("the resource section separates the fixed indexes from the per-skill pair", () => {
  const out = joined(
    resourceSection({
      resources: [
        { uri: "rulemcp://skills", name: "All rule-mcp skills index", mimeType: "application/json" },
        { uri: "rulemcp://rule-mcp-styleguide-css", name: "css skill", mimeType: "text/markdown" },
        { uri: "rulemcp://rule-mcp-styleguide-css/summary", name: "css summary", mimeType: "text/markdown" },
      ],
      skillDirs: ["rule-mcp-styleguide-css"],
    }),
  );

  assert.match(out, /## MCP resources \(3\)/);
  assert.match(out, /\| `rulemcp:\/\/skills` +\| All rule-mcp skills index +\| `application\/json` \|/);
  assert.match(out, /^2 more, two for each skill that mints them:$/m, "the per-skill pair is counted, not listed");
  assert.doesNotMatch(out, /\| `rulemcp:\/\/rule-mcp-styleguide-css` /, "a skill resource is not in the fixed table");
});

test("a fixed resource with no name or media type renders dashes", () => {
  const out = joined(resourceSection({ resources: [{ uri: "rulemcp://bare" }], skillDirs: [] }));

  assert.match(out, /\| `rulemcp:\/\/bare` +\| - +\| `-` \|/);
  assert.doesNotMatch(out, /undefined/);
});

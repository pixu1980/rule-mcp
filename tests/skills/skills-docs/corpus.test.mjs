/** Every skill directory: frontmatter, cross-references, resolvable links, no embedded docs. */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parseSkillFrontmatter } from "../../../src/core/skills/index.js";
import { markdownLinks, skillDirectories, skillsRoot } from "./_docs.fixture.mjs";

const removedSkillNames = ["rule-scaffolding", "rule-coverage-gates", "rule-devops-docker-standards", "rule-frontend-forms", "rule-frontend-forms-validation"];

console.log("rule skill documentation test: corpus");

const directories = skillDirectories();
assert.ok(directories.length > 0, "No skill directories found");
assert.ok(directories.includes("rule-ui"), "rule-ui umbrella skill must be present");
assert.ok(directories.includes("rule-ui-design-system"), "rule-ui-design-system skill must be present");
for (const requiredSkill of ["rule-backend-graphql", "rule-devops-observability", "rule-process-code-review"]) {
  assert.ok(directories.includes(requiredSkill), `${requiredSkill} must be present`);
}

for (const dir of directories) {
  const skillPath = join(skillsRoot, dir, "SKILL.md");
  assert.ok(existsSync(skillPath), `Missing SKILL.md for ${dir}`);

  const content = readFileSync(skillPath, "utf8");
  const metadata = parseSkillFrontmatter(content);

  assert.equal(metadata.name, dir, `${dir}: frontmatter name must match directory`);
  assert.ok(metadata.description?.length > 20, `${dir}: description must be present and useful`);
  assert.ok(Array.isArray(metadata.tags) && metadata.tags.length > 0, `${dir}: tags must be a non-empty YAML list`);
  assert.ok(Array.isArray(metadata.frameworks) && metadata.frameworks.length > 0, `${dir}: frameworks must be present`);

  const innerFrontmatterCount = (content.match(/\n---\nname:\s*rule-/g) || []).length;
  assert.equal(innerFrontmatterCount, 0, `${dir}: contains an embedded second SKILL.md document`);

  assert.ok(content.includes("## See also"), `${dir}: missing See also cross-reference section`);

  for (const removedName of removedSkillNames) {
    assert.ok(!content.includes(removedName), `${dir}: references removed/non-existent skill ${removedName}`);
  }

  for (const href of markdownLinks(content)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) {
      continue;
    }
    const target = href.split("#", 1)[0];
    if (!target) {
      continue;
    }
    const resolved = resolve(join(skillsRoot, dir), target);
    assert.ok(existsSync(resolved), `${dir}: broken markdown link ${href}`);
  }
}

console.log(`  \u{2705} ${directories.length} skills have consistent metadata and resolvable links`);

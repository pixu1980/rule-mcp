/** Skill file access: read SKILL.md, metadata, target-only set, name listing and plugin detection. */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { getSkillsDirs as getSkillsDirectories } from "../../cli/paths.js";
import { join } from "node:path";
import { parseSkillFrontmatter } from "../../core/skill-frontmatter.js";
function readSkill(skillName) {
  const { embeddedSkills } = getSkillsDirectories();
  try {
    return readFileSync(join(embeddedSkills, skillName, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

/**
 * Get a sorted list of all available skill names.
 *
 * The tool surface of this server is defined by the bundled `skills/` directory
 * and by nothing else. Two rules, both deliberate:
 *
 *   - only `skills/` is scanned. Merging `~/.agents/skills` meant any directory
 *     there became a callable tool under the pix_ prefix: 79 stale `rule-*`
 *     directories from the previous brand resurfaced as `pix_pix_*`, and
 *     generic skills like `test-driven-development` were renamed into the
 *     namespace. It also made plugin.js in the user's home an in-process import.
 *   - only `rule-*` names are accepted, so a foreign directory dropped into
 *     `skills/` cannot mint a tool that claims to be ours either.
 *
 * The bare `rule` directory is excluded: it backs the dispatcher tool, which
 * is registered by code, not as a per-skill tool.
 *
 * @returns {string[]}
 */

const skillCache = new Map();

function getSkillMetadata(skillName) {
  const cacheKey = `meta:${skillName}`;
  const cached = skillCache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const content = readSkill(skillName);

  if (!content) {
    return {};
  }

  const meta = parseSkillFrontmatter(content);
  skillCache.set(cacheKey, JSON.stringify(meta));

  return meta;
}

/**
 * The four skills the target retains that the source does not ship. They are a
 * real part of the rule union and route normally; the routing-corpus thresholds
 * were measured on the source's skill set, so the corpus tests opt into the
 * source-commensurate universe (RULE_MCP_SKILL_UNIVERSE=base) to keep the
 * measurement comparable - their extra bodies would otherwise dilute the
 * term-document frequencies (idf) the scorer's numbers are pinned to.
 */
const TARGET_ONLY_SKILLS = new Set([
  "rule-frontend-custom-element",
  "rule-frontend-template-engine",
  "rule-frontend-vanilla-reactive",
  "rule-platform-auth",
]);

function getSkillNames() {
  const names = new Set();
  const { embeddedSkills } = getSkillsDirectories();
  const baseUniverse = process.env.RULE_MCP_SKILL_UNIVERSE === "base";

  try {
    for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("rule-")) {
        continue;
      }

      if (baseUniverse && TARGET_ONLY_SKILLS.has(entry.name)) {
        continue;
      }

      if (!existsSync(join(embeddedSkills, entry.name, "SKILL.md"))) {
        continue;
      }

      names.add(entry.name);
    }
  } catch {
    /* no dir */
  }

  return [...names].sort();
}

/**
 * Check if a skill name is foreign to this server.
 *
 * getSkillNames() only ever yields `rule-*` names, so this is false for every
 * registered skill. It is kept as an explicit guard: resources and skill tools
 * consult it before treating a name as ours.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
function isPluginSkill(skillName) {
  // rule is the router skill, not a plugin
  if (skillName === "rule") {
    return false;
  }

  return !skillName.startsWith("rule-");
}

/**
 * Whether a skill ships a plugin.js.
 *
 * Always false: plugin.js was only ever imported from `~/.agents/skills`, which
 * this server no longer reads. Importing it meant executing code from the user's
 * home directory in-process at startup, with no isolation and failures swallowed
 * (2026-08-04 audit, finding 15). Bundled skills carry no plugin.js.
 *
 * @param {string} _pluginName - The plugin directory name
 * @returns {boolean}
 */
function hasPluginJs(_pluginName) {
  return false;
}

export { readSkill, getSkillMetadata, TARGET_ONLY_SKILLS, getSkillNames, isPluginSkill, hasPluginJs };

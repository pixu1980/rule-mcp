/** Skill file access: read SKILL.md, metadata, target-only set, name listing and plugin detection. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSkillFrontmatter } from "../../core/skills/_frontmatter.js";
import { clearSkillResolution, resolvedSkills as resolved } from "./_skill-resolution.js";

/** The SKILL.md of a skill, from the layer that won, or null. */
function readSkill(skillName) {
  const entry = resolved().get(skillName);

  if (!entry) {
    return null;
  }

  try {
    return readFileSync(join(entry.dir, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

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
const TARGET_ONLY_SKILLS = new Set(["rule-frontend-custom-element", "rule-frontend-template-engine", "rule-frontend-vanilla-reactive", "rule-platform-auth"]);

/**
 * Every skill name that resolves, sorted.
 *
 * The bundled catalog is the native layer; a project and the machine owner can
 * add to it or replace an entry (ADR 079). What a custom layer cannot do is
 * grow the tool surface by accident: a skill mints a tool only when its
 * frontmatter asks for one, which is `exposeTool` and defaults to false for
 * anything this server does not ship.
 *
 * The bare `rule` directory is excluded: it backs the dispatcher tool, which is
 * registered by code rather than as a per-skill tool.
 *
 * @returns {string[]}
 */
function getSkillNames() {
  const baseUniverse = process.env.RULE_MCP_SKILL_UNIVERSE === "base";
  const names = [];

  for (const entry of resolved().values()) {
    // The bare `rule` directory backs the dispatcher, which is registered by
    // code; listing it here would mint a second, per-skill tool for it.
    if (entry.name === "rule" || (baseUniverse && TARGET_ONLY_SKILLS.has(entry.name))) {
      continue;
    }

    names.push(entry.name);
  }

  return names.sort();
}

/** The layer a skill resolved from: native, project or user. */
function skillLayer(skillName) {
  return resolved().get(skillName)?.layer;
}

/**
 * Whether a skill should also be registered as its own MCP tool.
 *
 * The bundled catalog is the tool surface this server advertises, so a native
 * skill keeps its tool. A skill from a project or a home directory has to ask,
 * because a surface that grows with whatever is on the machine is the cost
 * ADR 033 measured at 176 tools and roughly 54k tokens per turn.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
function exposesTool(skillName) {
  const entry = resolved().get(skillName);

  if (!entry) {
    return false;
  }

  return entry.layer === "native" ? entry.meta.exposeTool !== false : entry.meta.exposeTool === true;
}

/**
 * Check if a skill name is foreign to this server.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
function isPluginSkill(skillName) {
  // rule is the router skill, not a plugin
  if (skillName === "rule") {
    return false;
  }

  return skillLayer(skillName) !== "native";
}

/**
 * Whether a skill ships a plugin.js.
 *
 * Always false. A skill's executable surface is its `guardrails/` folder, which
 * declares what it exports and is checked against the SKILL.md that declares it
 * (ADR 079); a free-form plugin.js has no such contract.
 *
 * @param {string} _pluginName - The plugin directory name
 * @returns {boolean}
 */
function hasPluginJs(_pluginName) {
  return false;
}

export { readSkill, getSkillMetadata, TARGET_ONLY_SKILLS, getSkillNames, isPluginSkill, hasPluginJs, exposesTool, skillLayer };
export { clearSkillResolution } from "./_skill-resolution.js";

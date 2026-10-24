

/** Skill content digests, the per-entry freshness dependencies. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getSkillsDirs as getSkillsDirectories } from "@src/cli/paths/index.js";

/** Content digests of the skills, computed once per process. */
export const _digests = new Map();

/** Whether the digest table was populated this process. */
export let _digestsLoaded = false;

/**
 * The content digest of one skill.
 *
 * Lives here rather than in `core/skills.js` because `skills.js` imports the
 * router and the router imports this file: putting it there would close a
 * cycle. The only consumer is invalidation, so this is where it belongs anyway.
 *
 * @param {string} name a `rule-mcp-*` directory name
 * @returns {string|undefined} 16 hex characters, or undefined if there is no such skill
 */
export function skillDigest(name) {
  if (!_digestsLoaded) {
    _digestsLoaded = true;
    try {
      const { embeddedSkills } = getSkillsDirectories();

      for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith("rule-mcp-")) {
          continue;
        }

        try {
          const content = readFileSync(join(embeddedSkills, entry.name, "SKILL.md"));

          _digests.set(entry.name, createHash("sha256").update(content).digest("hex").slice(0, 16));
        } catch {
          /* a skill without a readable SKILL.md is not a dependency */
        }
      }
    } catch {
      /* no skills directory: every entry will be unverifiable */
    }
  }

  return _digests.get(name);
}

/** Drop the memoized digests, so a skills reload is seen. */
export function clearSkillDigests() {
  _digests.clear();
  _digestsLoaded = false;
}

/**
 * Are every one of an entry's recorded dependencies still as they were?
 *
 * An unresolvable dependency counts as changed. A skill that was deleted cannot
 * be shown to be unchanged, and unverifiable is not the same as valid.
 *
 * @param {object|undefined} deps name -> digest, as recorded at store time
 * @returns {boolean}
 */
export function dependenciesHold(deps) {
  for (const [name, digest] of Object.entries(deps ?? {})) {
    if (skillDigest(name) !== digest) {
      return false;
    }
  }

  return true;
}

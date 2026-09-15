

/** @module tools/router/skill-resolution - the resolved skill set, cached for the process */

import { resolveSkillDirs } from "../../core/layers/_resolve.js";

/**
 * Resolution walks three directories and parses every SKILL.md it finds
 * (ADR 079). getSkillNames() is called on every tool listing, so the walk is
 * done once and thrown away by clearSkillResolution() when the skills reload.
 */
let RESOLVED;

/** The skills each layer offers, by name, with the layer that won. */
export function resolvedSkills() {
  RESOLVED ??= resolveSkillDirs();

  return RESOLVED;
}

/** Drop the cached resolution; the next call re-walks the layers. */
export function clearSkillResolution() {
  RESOLVED = undefined;
}

/**
 * @module core/skills/surface-retain
 *
 * Enforce the installer's surface answer on the registered tools.
 *
 * The pure grammar lives in `_surface.js`; this is the side effect, kept
 * apart so the tests never boot the router. Same post-registration retain
 * the minimal mode uses - one mechanism, not two.
 */

import { _tools, exposesTool, getSkillNames, retainTools } from "../../tools/router/index.js";
import { toolNameForSkill } from "../../tools/skill/index.js";
import { MINIMAL_ALLOWLIST } from "./_minimal.js";
import { REGISTERED_BY_CODE } from "./_skill-tools.js";
import { SURFACE_VAR, filterSurfaceSkills, parseSurface } from "./_surface.js";

/**
 * Enforce the ambient surface answer on the registered tools, if any.
 *
 * Retains every code-registered tool plus the selected skill tools.
 *
 * @param {object} [env]
 * @param {(text: string) => void} [warn]
 * @returns {number|null} tools kept, or null when nothing was asked
 */
export function retainSurface(env = process.env, warn = (text) => process.stderr.write(`${text}\n`)) {
  const raw = env[SURFACE_VAR];
  const selection = parseSurface(raw);

  if (!selection) {
    if (typeof raw === "string" && raw.trim() !== "") {
      warn(`surface: unknown spec "${raw}" - expected minimal, standard, full, areas:<a,b> or skills:<s,...>; running full.`);
    }

    return null;
  }

  if (selection.preset === "minimal") {
    retainTools(MINIMAL_ALLOWLIST);

    return MINIMAL_ALLOWLIST.size;
  }

  const names = getSkillNames().filter((name) => !REGISTERED_BY_CODE.has(name) && exposesTool(name));
  const { skills, problems } = filterSurfaceSkills(selection, names);

  for (const problem of problems) {
    warn(`surface: ${problem}`);
  }

  // Every tool a kept skill minted stays; every other registered tool is
  // code, plugin, or dispatcher surface, which no area choice prunes.
  const minted = new Map(names.map((name) => [toolNameForSkill(name), name]));
  const keep = new Set();

  for (const tool of _tools) {
    const skill = minted.get(tool.name);

    if (skill === undefined || skills.has(skill)) {
      keep.add(tool.name);
    }
  }

  retainTools(keep);

  return keep.size;
}

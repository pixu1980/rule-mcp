/** @module core/skills/skill-tools - one tool per skill that asks for one */

import { exposesTool, getSkillNames } from "../../tools/router/index.js";
import { registerSkillTool } from "../../tools/skill/index.js";
import { IS_MINIMAL_TOOLS } from "./_minimal.js";

/** The three names the server registers itself rather than as a per-skill tool. */
const REGISTERED_BY_CODE = new Set(["rule", "rule-process-adr", "rule-process-handoff"]);

/**
 * Register one tool per skill that asks for one.
 *
 * Minimal mode registers none - evidence is loaded through pix_gateway there.
 * A skill from a project or a home directory mints a tool only when its
 * frontmatter asks (ADR 079), so dropping a folder in adds rules and
 * searchable evidence without growing the surface every turn pays for.
 */
export function registerSkillTools() {
  if (IS_MINIMAL_TOOLS) {
    return;
  }

  for (const name of getSkillNames()) {
    if (!REGISTERED_BY_CODE.has(name) && exposesTool(name)) {
      registerSkillTool(name);
    }
  }
}

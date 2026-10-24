/** @module core/skills/skill-tools - one tool per skill that asks for one */

import { exposesTool, getSkillNames } from "../../tools/router/index.js";
import { registerSkillTool } from "../../tools/skill/index.js";
import { IS_MINIMAL_TOOLS } from "./_minimal.js";

/** The three names the server registers itself rather than as a per-skill tool. */
export const REGISTERED_BY_CODE = new Set(["rule-mcp", "rule-mcp-meta", "rule-mcp-process-adr"]);

/**
 * Register one tool per skill that asks for one.
 *
 * Minimal mode registers none - evidence is loaded through rule_tool_gateway there.
 * A skill from a project or a home directory mints a tool only when its
 * frontmatter asks (ADR 089), so dropping a folder in adds rules and
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

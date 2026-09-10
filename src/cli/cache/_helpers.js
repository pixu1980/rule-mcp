

/** @module cli/cache/helpers - shared output and the recompute closure */

export const print = (value) => process.stdout.write(`${value}\n`);

/** The area a routed skill belongs to: `rule-styleguide-css` is styleguide. */
export function areaOf(skill) {
  const [, area] = String(skill).split("-", 2);

  return area ?? "unknown";
}

/**
 * Recompute a call with the cache switched off for the duration.
 *
 * The comparison is against the deterministic core rather than the finished
 * result, because everything after the core, the reminder state, compression,
 * a banner, is expected to differ between two calls and says nothing about
 * whether the answer moved.
 *
 * @returns {(tool: string, args: object) => Promise<object>}
 */
export async function makeRecompute() {
  const { loadAllSkills } = await import("../../core/skills/index.js");
  const { recomputeCore, listTools } = await import("../../tools/router/index.js");
  await loadAllSkills();
  const registered = new Set(listTools().map((tool) => tool.name));

  const recompute = async (tool, args) => {
    const previous = process.env.RULE_MCP_NO_CACHE;
    process.env.RULE_MCP_NO_CACHE = "1";
    try {
      return await recomputeCore(tool, args);
    } finally {
      if (previous === undefined) {
        delete process.env.RULE_MCP_NO_CACHE;
      } else {
        process.env.RULE_MCP_NO_CACHE = previous;
      }
    }
  };

  return { recompute, canRun: (tool) => registered.has(tool) };
}

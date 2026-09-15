

/**
 * @module core/tokensave/routing
 *
 * A second candidate source for the router: the symbols TokenSave matches for
 * the prompt, folded back onto the skills that own them.
 *
 * It is a *bonus*, never a scorer: the BM25 rank stays the base, the graph
 * adds a small constant to a skill whose own files the graph matched. With no
 * graph, or with `RULE_MCP_NO_TOKENSAVE=1`, it returns nothing and routing
 * is exactly the BM25 answer it always was.
 *
 * @see module:core/tokensave/probe - the availability check
 */

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/** The bonus one matched skill receives. Small enough not to outrank a BM25 hit. */
export const GRAPH_BONUS = 3;

/**
 * The skill a project-relative file belongs to, or null.
 *
 * Only `skills/<name>/…` counts, and only when `<name>` is a known skill. A
 * path under `src/core/skills/` contains the word but is not a skill file.
 *
 * @param {unknown} file
 * @param {string[]} skills
 * @returns {string|null}
 */
export function skillOfFile(file, skills) {
  const match = /^skills\/([^/]+)\//.exec(String(file ?? ""));

  return match && skills.includes(match[1]) ? match[1] : null;
}

/**
 * The skills TokenSave matched for a prompt, as bonus points.
 *
 * @param {string} [projectDir]
 * @param {string} [prompt]
 * @param {{ skills?: string[], limit?: number, probe?: Function, client?: Function }} [options]
 * @returns {Map<string, number>}
 */
export function graphCandidates(projectDir = process.cwd(), prompt = "", { skills = [], limit = 20, probe = probeFilesystem, client = callToolSync } = {}) {
  if (!prompt || process.env.RULE_MCP_NO_TOKENSAVE === "1" || !probe(projectDir).available) {
    return new Map();
  }

  const result = client("search", { query: prompt, path_include: ["skills"], limit }, { projectDir });

  if (!result.ok) {
    return new Map();
  }

  const hits = Array.isArray(result.value) ? result.value : (result.value?.results ?? []);

  if (!Array.isArray(hits)) {
    return new Map();
  }

  const bonuses = new Map();

  for (const hit of hits) {
    const skill = skillOfFile(hit?.file, skills);

    if (skill && !bonuses.has(skill)) {
      bonuses.set(skill, GRAPH_BONUS);
    }
  }

  return bonuses;
}

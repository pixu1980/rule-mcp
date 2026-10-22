

/** Nyx reranking of the BM25 skill candidates. Returns null whenever Nyx is unavailable, leaving the BM25 order untouched. */
import { getSkillMetadata } from "../router/index.js";
import { loadNyxAdapter } from "../../core/nyx/index.js";

/** Shadow counters: how often the rerank was computed, and how often it would have changed the top hit. */
const shadowStats = { checks: 0, changes: 0 };

/**
 * @returns {{ checks: number, changes: number }} Shadow-mode counters for telemetry.
 */
export function nyxShadowStats() {
  return { ...shadowStats };
}

/**
 * Rerank the scores produced by `rankSkills` with the Nyx decision engine.
 *
 * The BM25 score, the decision-derived tag affinity and (when configured) the
 * embedding similarity are blended per candidate; the returned objects keep
 * the original `sections` and `next_tools` untouched.
 *
 * `RULE_MCP_NYX_SHADOW=1` computes the rerank, counts it and returns
 * null, so live traffic keeps the BM25 order while the difference is measured.
 *
 * @param {{ prompt: string, skillScores: Array<{ skill: string, relativeScore: number, absoluteScore: number, sections: string[], next_tools: string[] }>, ranked: Map<string, { score?: number }>, mode?: string }} input
 * @returns {Promise<Array<{ skill: string, relativeScore: number, absoluteScore: number, sections: string[], next_tools: string[] }>|null>}
 */
export async function rerankSkillScores({ prompt, skillScores, ranked, mode = process.env.RULE_MCP_NYX_MODE ?? "ensemble" }) {
  const adapter = await loadNyxAdapter();

  if (!adapter || skillScores.length < 2) {
    return null;
  }

  try {
    const candidates = skillScores.map((entry) => {
      const meta = getSkillMetadata(entry.skill) ?? {};
      const tags = meta.tags ?? [];

      return {
        id: entry.skill,
        // The name alone is a thin signal for an embedding model; the
        // frontmatter description and tags are what the skill is about.
        text: [entry.skill.replaceAll("-", " "), meta.description, ...tags].filter(Boolean).join(" "),
        tags,
        // The full scorer result is the base: BM25, name, tag, graph and domain
        // boosts. Replacing it with raw BM25 would undo the scorer.
        bm25Score: entry.absoluteScore ?? ranked.get(entry.skill)?.score ?? 0,
      };
    });
    const result = await adapter.rank({ query: prompt, candidates, mode, limit: skillScores.length });
    const bySkill = new Map(skillScores.map((entry) => [entry.skill, entry]));
    const max = Math.max(...result.ranked.map((entry) => entry.score), 0);

    const reranked = result.ranked
      .map((entry) => {
        const previous = bySkill.get(entry.id);

        if (!previous) {
          return null;
        }

        return { ...previous, relativeScore: max > 0 ? Math.min(1, entry.score / max) : 0 };
      })
      .filter(Boolean);

    if (process.env.RULE_MCP_NYX_SHADOW === "1") {
      shadowStats.checks += 1;

      if (reranked[0]?.skill !== skillScores[0]?.skill) {
        shadowStats.changes += 1;
      }

      return null;
    }

    return reranked;
  } catch {
    return null;
  }
}

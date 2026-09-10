

/**
 * @module tools/meta/register
 *
 * `rule_tool_meta`: the dispatcher for the meta-framework set, the mirror of
 * `pix_tool` over four skills instead of ninety.
 *
 * It is deliberately narrower than the router. The router's corpus and
 * thresholds are measured over the whole skill set, and a meta-framework
 * prompt almost always names its framework - "astro island", "next server
 * action" - so a name match answers it and BM25 only breaks the tie. Widening
 * this into a second general router would mean re-measuring the routing corpus
 * for no gain.
 *
 * @see module:tools/ai/register - the dispatcher this mirrors
 * @see skills/rule-meta/SKILL.md - the dispatch contract in prose
 */

import { z } from "zod/v4";
import { getSkillNames, listTools, registerTool } from "../router/index.js";
import { extractTopSections } from "../ai/_top-sections.js";
import { META_CONCEPTS, META_HUB } from "./_concepts.data.js";

const MetaSchema = z.object({
  prompt: z.string().describe("What to build or change in a meta-framework: rendering, routing, data loading, deployment"),
  framework: z.string().optional().describe("Optional framework hint (astro, next, nuxt, remix) to skip the concept match"),
});

/** The meta skills this process actually registered, hub excluded. */
const metaSkills = () => getSkillNames().filter((name) => name.startsWith("rule-meta-"));

/** The framework a name or a concept in the prompt points at. */
function matchFramework(prompt, hint) {
  const text = `${hint ?? ""} ${prompt}`.toLowerCase();
  const scored = [];

  for (const [framework, concepts] of Object.entries(META_CONCEPTS)) {
    // A named framework wins outright; a concept is worth one point.
    const named = new RegExp(String.raw`\b${framework}(?:\.js)?\b`, "i").test(text);
    const hits = concepts.filter((concept) => text.includes(concept)).length;

    if (named || hits > 0) {
      scored.push({ framework, score: (named ? 10 : 0) + hits });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

/** Register the rule_tool_meta dispatcher. */
export function registerMetaTool() {
  registerTool({
    name: "rule_tool_meta",
    description:
      "Route a meta-framework request to the right rule skill: Astro, Next.js, Nuxt or Remix. Returns the skill, its relevant sections and the base framework skill to load with it.",
    zodSchema: MetaSchema,
    handler: async (arguments_) => {
      const prompt = (arguments_.prompt || "").trim();
      const available = metaSkills();
      const registered = new Set(listTools().map((tool) => tool.name));
      const answer = (payload) => ({ content: [{ type: "text", text: JSON.stringify({ ...payload, skills_available: available }, undefined, 2) }] });

      if (!prompt) {
        return answer({
          route: "none",
          confidence: 0,
          sections: [],
          next_tools: ["rule_tool_search"],
          summary: `Name the framework or the concept. The set is ${available.join(", ")}.`,
        });
      }

      const scored = matchFramework(prompt, arguments_.framework).filter((hit) => available.includes(`rule-meta-${hit.framework}`));

      if (scored.length === 0) {
        return answer({
          route: "unknown",
          confidence: 0,
          uncertain: true,
          sections: [],
          next_tools: ["pix_tool", "rule_tool_search", "rule_tool_detect"].filter((tool) => registered.has(tool)),
          summary: `No meta-framework matched "${prompt}". Call rule_tool_detect to read the repository, or pix_tool to route across the whole skill set.`,
        });
      }

      const [primary, ...rest] = scored;
      const skill = `rule-meta-${primary.framework}`;
      const promptWords = [
        ...new Set(
          prompt
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 1),
        ),
      ];
      const total = scored.reduce((sum, hit) => sum + hit.score, 0);
      const base = META_HUB[primary.framework];

      return answer({
        route: skill,
        confidence: Math.round((primary.score / total) * 100) / 100,
        absoluteScore: primary.score,
        uncertain: false,
        sections: extractTopSections(skill, promptWords),
        with_skills: base,
        next_tools: [`rule_tool_meta_${primary.framework}`, "rule_tool_check"].filter((tool) => registered.has(tool)),
        alternatives: rest.map((hit) => ({ route: `rule-meta-${hit.framework}`, confidence: Math.round((hit.score / total) * 100) / 100 })),
        summary: `${skill} answers "${prompt}". Load ${base.join(" and ")} with it: the meta skill owns rendering, routing and data loading, the framework skill owns the component. Generated code must pass rule_tool_check.`,
      });
    },
  });
}

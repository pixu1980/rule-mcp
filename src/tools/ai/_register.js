

import { getSkillNames, registerTool, listTools } from "../router/index.js";
import { detectRole } from "../../core/review/roles/index.js";
import { loadRoleOverlays } from "../../core/review/_overlays.js";
import { GalaxySchema } from "./_schema.js";
import { expandPrompt } from "./_expand-prompt.js";
import { classifyPromptDomain } from "./_domain.js";
import { detectFrameworkSkill } from "./_framework.js";
import { reductionSignal } from "./_reduction-signal.js";
import { rankSkills } from "./_rank-skills.js";
import { rerankSkillScores } from "./_nyx-rerank.js";
import { graphCandidates } from "../../core/tokensave/_routing.js";
import { docsFollowup } from "./_docs-followup.js";
import { applyDecision } from "./_decision.js";
import { SCOPE_CONTRACT, STYLING_CONTRACT, STYLING_ROUTES } from "./_contracts.js";

/**
 * Register the rule-mcp routing tool.
 * Routes a user prompt to the correct rule-mcp skill based on keyword scoring.
 * Returns structured JSON with route, confidence, sections, next_tools.
 */
export function registerAiTool() {
  registerTool({
    name: "rule_tool",
    entry: "router",
    description: "Route a prompt to the correct rule-mcp skill. Returns structured routing with relevant sections.",
    zodSchema: GalaxySchema,
    handler: async (arguments_) => {
      const allSkills = getSkillNames();
      const skills = allSkills.filter((skillName) => skillName !== "rule-mcp" && skillName !== "rule-mcp-meta");
      const prompt = expandPrompt((arguments_.prompt || "").trim());

      if (!prompt) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                route: "none",
                confidence: 0,
                sections: [],
                next_tools: ["rule_tool_search"],
                skills_available: allSkills,
              }),
            },
          ],
        };
      }

      const promptLower = prompt.toLowerCase();
      const promptWords = [...new Set(promptLower.split(/[^a-z0-9]+/).filter((w) => w.length > 1))];

      const promptDomain = classifyPromptDomain(promptLower);
      const { detectedFramework, detectedSkillName, detectedDomain } = detectFrameworkSkill(arguments_);

      // Only apply framework bias when domains match (or prompt domain is unknown)
      const applyFrameworkBias = !promptDomain || promptDomain === detectedDomain;

      // BM25 scoring runs on the same index the search tool uses: the previous
      // scorer had no IDF and no length normalization, so common words and
      // big files dominated routing.
      const { buildIndex, isIndexReady, searchSkills } = await import("../../core/bm25/index.js");

      if (!isIndexReady()) {
        await buildIndex();
      }

      const ranked = new Map(searchSkills(prompt).map((hit) => [hit.skill, hit]));
      const graph = graphCandidates(process.cwd(), prompt, { skills });
      const isReduction = Boolean(reductionSignal(promptLower));

      let skillScores = rankSkills({
        skills,
        promptWords,
        promptDomain,
        isReduction,
        ranked,
        graph,
        detectedFramework,
        detectedSkillName,
        applyFrameworkBias,
      });

      skillScores = (await rerankSkillScores({ prompt, skillScores, ranked })) ?? skillScores;

      const top = skillScores.slice(0, 6);
      const primaryRoute = top[0] ?? {
        skill: "none",
        relativeScore: 0,
        absoluteScore: 0,
        sections: [],
        next_tools: ["rule_tool_search"],
      };

      const decision = await applyDecision({ prompt, top, primaryRoute });
      const chosen = top.find((entry) => entry.skill === decision.skill) ?? primaryRoute;
      const alternatives = top.filter((entry) => entry.skill !== decision.skill).slice(0, 5);

      const followup = docsFollowup(promptLower);
      // Only advertise tools this process actually registered.
      const registered = new Set(listTools().map((tool) => tool.name));
      const nextTools = [...new Set([...top.flatMap((t) => t.next_tools), ...(followup ? [followup.tool] : [])])].filter((tool) => {
        return registered.has(tool);
      });

      // A persona request asks for a role's lenses and its three documents, not
      // for a skill on its own. The scorer cannot see that, so the role is
      // detected from the registry and the answer says which tool serves it.
      const persona = detectRole(prompt, loadRoleOverlays().roles);

      const result = {
        route: decision.uncertain ? "unknown" : decision.skill,
        confidence: Math.round(decision.confidence * 100) / 100,
        absoluteScore: Math.round(primaryRoute.absoluteScore * 100) / 100,
        uncertain: decision.uncertain,
        sections: chosen.sections,
        next_tools: persona ? ["rule_tool_plan", ...nextTools.filter((name) => name !== "rule_tool_plan")] : nextTools,
        ...(persona && {
          persona: {
            role: persona.id,
            title: persona.role,
            tool: "rule_tool_plan",
            how: `Call rule_tool_plan with role "${persona.id}", then rule_tool_impersonation with the findings.`,
          },
        }),
        scope_contract: SCOPE_CONTRACT,
        ...(!decision.uncertain && STYLING_ROUTES.test(decision.skill) && { styling_contract: STYLING_CONTRACT }),
        ...(followup && { docs_followup: followup }),
        alternatives: alternatives.map((t) => ({
          route: t.skill,
          confidence: Math.round(t.relativeScore * 100) / 100,
          sections: t.sections.slice(0, 3),
        })),
        skills_available: allSkills,
        summary: decision.uncertain
          ? `No strong match for "${prompt}". Try rephrasing or use rule_tool_search for full-text search.`
          : top.length > 0
            ? `Top match: ${decision.skill} (${Math.round(decision.confidence * 100)}%). Relevant sections: ${chosen.sections.join(", ")}. ` +
              `Try: ${nextTools.join(", ")}. Build only what was asked; propose anything extra instead of writing it.` +
              (followup ? ` Structural change: generate the ADR with ${followup.tool} without being asked.` : "")
            : `No matching skill for "${prompt}". Try rule_tool_search for full-text search.`,
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}

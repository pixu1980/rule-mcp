

/**
 * @module prompts/areas-prompts
 *
 * One MCP/slash prompt per area hub, built from the area mapping.
 *
 * The hub skill owns its area's command: `/rule-area-frontend` IS `rule-frontend`.
 * Leaf skills keep their tools; the hub routes to them from free text (ADR 117).
 */

import { skillAreas, skillToolName } from "./_areas-base.js";

/** Readable skill + tool pairs for hub routing prose. */
function memberRoutingList(members) {
  const pairs = members.map((skill) => `\`${skill}\` / \`${skillToolName(skill)}\``);
  const shown = pairs.slice(0, 12);

  return pairs.length > shown.length ? `${shown.join(", ")}, and ${pairs.length - shown.length} more` : shown.join(", ");
}

/** The lines every area hub prompt shares: route leaves from free text, check, commit. */
function hubPromptLines(area, hub, members) {
  const evidence =
    members.length > 0
      ? `the hub \`${hub}\` and whichever leaf skills the request names: ${memberRoutingList(members)}`
      : `the \`${hub}\` skill`;

  return [
    `You are the ${area} area specialist for rule-mcp (collector slash only; ADR 117).`,
    `Route this request through \`pix_tool\` first, then load ${evidence} as source of truth.`,
    "The request is free text: extract every framework, platform, database or tool it names (e.g. rspack, pnpm, eslint, husky, react) and call the matching leaf `rule_tool_*` / load that skill; call several when the request spans several leaves. Never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "If the request is a check (whole tokens such as check, controlla, validate, verify, guardrail, lint), call `rule_tool_check` on the named paths or the git diff against the routed skill(s) and skip the implement path (ADR 116).",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `rule_tool_check` and iterate until all guardrails pass.",
    "Compression is implicit: if the user is working in compression mode, keep the response compressed.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  ].join("\n");
}

/**
 * One prompt per area hub only (ADR 117). Leaf skills stay as tools, not slash.
 *
 * @returns {Array<{ name: string, description: string, text: string, skill: string, area: string, members: string[], arguments: object[] }>}
 */
export function listAreaPrompts() {
  const prompts = [];

  for (const [area, entry] of skillAreas()) {
    if (!entry.hub) {
      continue;
    }

    const members = [...entry.members].sort((a, b) => a.localeCompare(b));

    prompts.push({
      name: `rule-area-${area}`,
      skill: entry.hub,
      area,
      members,
      description: `${area} work: route free text to the right ${area} leaf skills/tools`,
      text: hubPromptLines(area, entry.hub, members),
      arguments: [{ name: "request", description: `A ${area} task, in free text (name leaves like rspack/pnpm/react when known)`, required: true }],
    });
  }

  return prompts;
}

/** The prompt text for an area command name, or undefined. */
export function areaPromptText(name) {
  return listAreaPrompts().find((prompt) => prompt.name === name)?.text;
}

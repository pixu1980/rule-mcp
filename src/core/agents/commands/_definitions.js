

/** @module core/agents/commands/definitions */

import { listPrompts } from "@src/prompts/index.js";
import { listAreaPrompts } from "@src/prompts/_areas.js";
import { areaBody, ROUTER, generalCheckBody } from "./_bodies.js";
import { COMPRESS_BODY, HANDOFF_BODY, HANDON_BODY, INIT_BODY, STATS_BODY, USAGE_BODY } from "./_bodies-session.js";
import { commandNames, ROUTER_COMMAND, CHECK_COMMAND } from "./_names.js";
import { personaBody, personaTarget } from "./_personas.js";

/**
 * Full definition for a single command: name, description, argument hint, body.
 *
 * @param {string} name
 * @returns {{ name: string, description: string, argumentHint: string, body: string }}
 */
export function commandDefinition(name) {
  if (name === ROUTER_COMMAND) {
    return { name, description: ROUTER.description, argumentHint: ROUTER.argumentHint, body: ROUTER.body };
  }

  if (name === CHECK_COMMAND) {
    return {
      name,
      description: "Auto-detect area from context and run rule guardrails validation",
      argumentHint: "[target]",
      body: generalCheckBody,
    };
  }

  const prompt = listPrompts().find((p) => p.name === name);

  if (!prompt) {
    throw new Error(`Unknown command: ${name}`);
  }

  const primary = prompt.arguments?.[0];
  const argumentHint = primary ? (primary.required ? `<${primary.name}>` : `[${primary.name}]`) : "<request>";
  const persona = personaTarget(name);
  const sessionBodies = {
    "rule-handoff": HANDOFF_BODY,
    "rule-handon": HANDON_BODY,
    "rule-compress": COMPRESS_BODY,
    "rule-stats": STATS_BODY,
    "rule-usage": USAGE_BODY,
    "rule-init": INIT_BODY,
  };
  const area = name.startsWith("rule-area-") ? listAreaPrompts().find((p) => p.name === name) : null;
  const body = persona
    ? personaBody(persona)
    : sessionBodies[name] ?? areaBody(prompt.description, { skill: area?.skill, members: area?.members ?? [] });

  return { name, description: prompt.description, argumentHint, body };
}


/**
 * Every command definition, in canonical order.
 *
 * @returns {Array<{ name: string, description: string, argumentHint: string, body: string }>}
 */
export function listAgentCommands() {
  return commandNames().map((name) => commandDefinition(name));
}

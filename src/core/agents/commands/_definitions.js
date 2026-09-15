

/** @module core/agents/commands/definitions */

import { listPrompts } from "@src/prompts/index.js";
import { areaBody, HANDOFF_BODY, ROUTER } from "./_bodies.js";
import { commandNames, ROUTER_COMMAND } from "./_names.js";
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

  const prompt = listPrompts().find((p) => p.name === name);

  if (!prompt) {
    throw new Error(`Unknown command: ${name}`);
  }

  const primary = prompt.arguments?.[0];
  const argumentHint = primary ? (primary.required ? `<${primary.name}>` : `[${primary.name}]`) : "<request>";
  const persona = personaTarget(name);
  const body = persona ? personaBody(persona) : name === "rule-handoff" ? HANDOFF_BODY : areaBody(prompt.description);

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

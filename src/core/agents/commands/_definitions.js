// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** @module core/agents/commands/definitions */

import { listPrompts } from "@src/prompts/index.js";
import { listAreaPrompts } from "@src/prompts/_areas.js";
import { areaBody, HANDOFF_BODY, ROUTER, checkBody, generalCheckBody } from "./_bodies.js";
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
      description: "Auto-detect area from context and run pix guardrails validation",
      argumentHint: "[target]",
      body: generalCheckBody,
    };
  }

  // Handle area check subcommands (pix-area-*-check)
  if (name.endsWith("-check")) {
    const areaName = name.slice(0, -6); // Remove "-check" suffix
    const areaPrompt = listAreaPrompts().find((p) => p.name === areaName);

    if (areaPrompt) {
      return {
        name,
        description: `Validate code against ${areaPrompt.area} skill guardrails`,
        argumentHint: "[target]",
        body: checkBody(areaPrompt.area, areaPrompt.skill),
      };
    }
  }

  const prompt = listPrompts().find((p) => p.name === name);

  if (!prompt) {
    throw new Error(`Unknown command: ${name}`);
  }

  const primary = prompt.arguments?.[0];
  const argumentHint = primary ? (primary.required ? `<${primary.name}>` : `[${primary.name}]`) : "<request>";
  const persona = personaTarget(name);
  const body = persona ? personaBody(persona) : name === "pix-handoff" ? HANDOFF_BODY : areaBody(prompt.description);

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

/** The generic `/rule-mcp-* help` machinery: trigger tokens, examples, the usage block. */
import { PROMPT_EXAMPLES } from "./_defs.data.js";
import { parsePersonaCommand } from "../core/review/roles/index.js";

/** Tokens that trigger the generic per-prompt help message. */
export const HELP_TOKENS = new Set(["help", "--help", "-h"]);

/**
 * Invocation examples for the help block. Area/workflow prompts carry
 * hand-written examples; a persona prompt (`/rule-persona-<role>`) gets one
 * generated set showing how the request slots into the command and how naming
 * a review or a plan deepens the run.
 *
 * @param {string} name
 * @returns {string[]}
 */
export function promptExamples(name) {
  const hand = PROMPT_EXAMPLES[name];

  if (hand) {
    return hand;
  }

  const persona = parsePersonaCommand(name);

  if (!persona) {
    return [];
  }

  return [`/${name} help`, `/${name} the /rule-handoff commit flow`, `/${name} review the new checkout page`, `/${name} plan the SSE daemon auth fix`];
}

/**
 * Build the generic `/rule-mcp-* help` message for a prompt definition.
 *
 * @param {string} name - prompt name
 * @param {{ description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }} def - prompt definition
 * @param {string[]} [examples] - example invocations
 * @returns {string} - the help block the model should present verbatim
 */
export function buildHelpMessage(name, def, examples = []) {
  const argumentList = def.arguments.map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`)).join(" ");
  const lines = [`Usage: /${name} ${argumentList}`, "", def.description, "", ...def.arguments.map((a) => `  ${a.name}  ${a.description}`)];

  if (examples.length > 0) {
    lines.push("", "Examples:", ...examples.map((e) => `  ${e}`));
  }

  return lines.join("\n");
}

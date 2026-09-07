/** The generic `/rule-* help` machinery: trigger tokens, examples, the usage block. */
import { PROMPT_EXAMPLES } from "./_defs.data.js";

/** Tokens that trigger the generic per-prompt help message. */
export const HELP_TOKENS = new Set(["help", "--help", "-h"]);

/**
 * Invocation examples for the help block. Area/workflow prompts carry
 * hand-written examples; persona prompts (`/rule-plan-*`, `/rule-audit-*`,
 * `/rule-review-*`) get one generated per operation so the help shows how the
 * free-form request slots into the command, exactly like the other prompts.
 *
 * @param {string} name
 * @returns {string[]}
 */
export function promptExamples(name) {
  const hand = PROMPT_EXAMPLES[name];

  if (hand) {
    return hand;
  }

  const persona = /^rule-(plan|audit|review)-(\w+)$/.exec(name);

  if (!persona) {
    return [];
  }

  const operation = persona[1];
  const focus = {
    plan: "fix the SSE daemon auth flow",
    audit: "the /rule-handoff commit flow",
    review: "the new checkout page",
  }[operation];

  return [`/${name} help`, `/${name} ${focus}`];
}

/**
 * Build the generic `/rule-* help` message for a prompt definition.
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

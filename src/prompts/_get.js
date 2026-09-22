

/** Resolve one prompt by name: help, persona, workflow, area or task. */
import { HANDOFF_USAGE } from "./_handoff-options.js";
import { roleById, parsePersonaCommand } from "../core/review/roles/index.js";
import { fillRoleTemplate } from "../core/review/template/index.js";
import { HELP_TOKENS, promptExamples, buildHelpMessage } from "./_help.js";
import { listPrompts } from "./_registry.js";
import { areaPromptText } from "./_areas.js";
import { handoffPrompt } from "./_handoff-prompt.js";
import { taskPrompt } from "./_task-prompts.js";

/**
 * Get a specific prompt by name with its system message content.
 *
 * @param {string} name - Prompt name
 * @param {Record<string, string>} [args] - Prompt arguments from the client
 * @returns {{ name: string, description: string, messages: Array<{ role: string, content: { type: string, text: string } }> }|null}
 */
export function getPrompt(name, args = {}) {
  const user = (text) => [{ role: "user", content: { type: "text", text } }];

  // ── Generic `/rule-* help` ──────────────────────────────────────
  // Any prompt whose primary argument is `help` (or --help / -h) returns
  // its usage block instead of running a task.
  const def = listPrompts().find((p) => p.name === name);
  const primary = def?.arguments?.[0];
  const primaryValue = primary ? args?.[primary.name] : undefined;

  if (primaryValue !== undefined && HELP_TOKENS.has(String(primaryValue).trim().toLowerCase())) {
    // Help is returned as a ready-made assistant message: the client displays it
    // immediately instead of asking the model to generate it (no reasoning, no tokens).
    const helpText = name === "rule-handoff" ? HANDOFF_USAGE : buildHelpMessage(name, def, promptExamples(name));

    return {
      name,
      description: `${name} usage`,
      messages: [{ role: "assistant", content: { type: "text", text: helpText } }],
    };
  }

  // ── Review personas: one prompt per active role and operation, filled from the registry ──
  const parsed = parsePersonaCommand(name);

  if (parsed) {
    const { operation, roleId } = parsed;
    const role = roleById(roleId);

    if (role) {
      return {
        name,
        description: `${operation[0].toUpperCase() + operation.slice(1)} as a ${role.role}`,
        messages: user(fillRoleTemplate(role, { operation, topic: args?.topic })),
      };
    }
  }

  if (name === "rule-handoff") {
    return handoffPrompt(args, user);
  }

  const areaText = areaPromptText(name);

  if (areaText) {
    return { name, description: name, messages: user(areaText) };
  }

  return taskPrompt(name, args, user);
}

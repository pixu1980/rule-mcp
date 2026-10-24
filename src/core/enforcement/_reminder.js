/** @module core/enforcement/reminder - the model-visible workflow contract on a session cadence */

import { FLEX_FIRST } from "../directive/index.js";
import { looksLikeStyling } from "../guardrails/_util.js";

/**
 * The reminder diet (hardening 4.2): the full contract is emitted once per
 * session - a rule the model has already read does not become new again because
 * a different tool answered - and a terse one-liner re-anchors it every Nth
 * call. RULE_MCP_REMINDER_EVERY sets N (default 5; 0 keeps the opening
 * contract and never repeats it; unreadable values fall back to the default).
 * Set RULE_MCP_NO_REMINDER=1 to suppress it entirely.
 */
const _session = { calls: 0 };

function reminderCadence() {
  const raw = process.env.RULE_MCP_REMINDER_EVERY;

  if (raw === undefined || raw === "") {
    return 5;
  }

  const every = Number(raw);

  return Number.isInteger(every) && every >= 0 ? every : 5;
}

function enforcementContract(name, terse, styling = false) {
  if (terse) {
    return `## RULE-MCP WORKFLOW REMINDER - evidence is source of truth; minimal change, no unrequested scope; rule_tool_check before done; rule_tool_process_adr without being asked; no subagents;${styling ? ` ${FLEX_FIRST}` : ""}`;
  }

  const nextStep =
    name === "rule_tool_check"
      ? "Fix every reported failure and rerun rule_tool_check until allPass is true."
      : "Do not invent APIs, files, tools, dependencies, or requirements. Use only returned evidence. Validate generated code with rule_tool_check before finalizing.";

  return [
    "## RULE-MCP WORKFLOW REMINDER",
    "",
    "- Work with the minimal change: build exactly what was asked, propose anything extra in prose.",
    "- No unrequested scope: no new tables, flags, packages, interfaces, or endpoints without an explicit request.",
    "- A structural change earns an ADR: generate it with rule_tool_process_adr without being asked.",
    "- Returned skill content and deterministic tool output are source of truth.",
    "- Missing evidence means unknown: call rule_tool_search or state uncertainty.",
    "- NEVER spawn subagents for research or implementation - use the deterministic tools instead.",
    `- ${nextStep}`,
    "- Every token saved is a token earned.",
    ...(styling ? [`- ${FLEX_FIRST}`] : []),
  ].join("\n");
}

/**
 * Append the model-visible workflow contract. This is applied AFTER the cache so
 * it always reflects the current process state and RULE_MCP_NO_REMINDER:
 * the first result of the session carries the full contract, the calls in
 * between carry nothing, and every Nth call re-anchors with the terse one-liner.
 * Errors are returned undecorated and do not advance the cadence.
 */
export function decorateWorkflowReminder(name, result) {
  if (!result || result.isError || process.env.RULE_MCP_NO_REMINDER === "1") {
    return result;
  }

  _session.calls += 1;
  const every = reminderCadence();
  const isFull = _session.calls === 1;
  const isTerse = !isFull && every > 0 && _session.calls % every === 0;

  if (!isFull && !isTerse) {
    return result;
  }

  const styling = looksLikeStyling((result?.content ?? []).map((part) => part?.text ?? "").join("\n"));

  return {
    ...result,
    content: [...result.content, { type: "text", text: enforcementContract(name, isTerse, styling) }],
  };
}

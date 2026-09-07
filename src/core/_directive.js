/**
 * @module core/directive
 *
 * The session-wide rules, written once and reused verbatim everywhere.
 *
 * Three of them cost real money when a session forgets: skipping `rule`
 * means guessing at rules the server already knows; spawning a subagent pays a
 * fresh context window for work a deterministic tool answers for free; dropping
 * caveman means every answer carries filler nobody reads. None of the three is
 * enforceable from inside a tool result - by the time a tool runs, the model has
 * already decided. So the text lives here and is carried by the harness:
 * SessionStart injects the full form once, UserPromptSubmit re-anchors it on
 * every prompt in a single line.
 *
 * One canonical wording, one grep. Anything that repeats these rules imports
 * them from this module instead of paraphrasing.
 *
 * @see module:core/agents/hooks - the hook entries that carry it
 * @see module:cli/guard - the command those hooks invoke
 */

/** The one sentence that frames every other rule here. */
export const MANTRA = "Every token saved is a token earned.";

/**
 * The no-subagent rule. Reused verbatim in the session directive, the generated
 * agent commands, and the skills - a paraphrase would read as a different rule.
 */
export const NO_SUBAGENTS = "NEVER spawn subagents for research or implementation - they burn tokens. Use rule tools (deterministic, LLM-free) and tokensave (code graph) instead.";

/**
 * The dependencies rule, one sentence, for every surface that states policy:
 * exact pins (no ^ or ~, save-exact) at the latest published release. A range
 * makes the installed tree a function of install time; "latest" keeps security
 * patches flowing instead of freezing on the version of the day the file was
 * written. Opt out with RULE_MCP_LOOSE_DEPS=1 for projects that manage
 * versions elsewhere.
 */
export const DEPS_EXACT_LATEST = "Dependencies: exact pins at the latest release (no ^ or ~; pnpm add --save-exact), and bump to latest when touching a manifest.";

/** @returns {boolean} whether the exact-latest dependencies policy is active. */
export function depsPolicyActive() {
  return process.env.RULE_MCP_LOOSE_DEPS !== "1";
}

/**
 * The layout rule, in one sentence, for every surface that has to state it: the
 * blocking guardrail, the reminder that rides along with a CSS result, the
 * route payload, the installed agent rules and the docs.
 *
 * Flex and grid are not interchangeable tools of equal standing. A flex
 * container is one axis, declared by the parent, and it covers the overwhelming
 * majority of what interfaces actually need: rows, columns, toolbars, stacks,
 * wrapping card sets. Grid answers a smaller question - where does this item go
 * in two dimensions - and pays for it in tracks that have to be defined before
 * anything occupies them. Reaching for grid by default means writing that
 * coordinate system for layouts that never needed one, and every later change
 * has to keep it consistent.
 *
 * So flex is the default and grid is the exception, and the exception is narrow
 * enough to name: named template areas, subgrid, explicit item placement or
 * overlap, and auto-fit/auto-fill tracks.
 */
export const FLEX_FIRST = "Flex first: display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks - what a flex row or column can do, flex does.";

/**
 * Whether the directive is injected at all.
 * Opt out with RULE_MCP_NO_PROMPT_DIRECTIVE=1.
 *
 * @returns {boolean}
 */
export function directiveEnabled() {
  return process.env.RULE_MCP_NO_PROMPT_DIRECTIVE !== "1";
}

/**
 * The full directive, injected once per session by the SessionStart hook.
 * Plain ASCII on purpose: it is read by every agent, not only by Markdown hosts.
 *
 * @returns {string} the directive, or "" when disabled
 */
export function sessionDirective() {
  if (!directiveEnabled()) {
    return "";
  }

  return [
    "## PIX SESSION DIRECTIVE",
    "",
    "- Call `rule` (or `rule_tool_gateway`) before any implementation, on every prompt. " +
      "Routed skill evidence is source of truth; never invent APIs, files, dependencies, or passing checks.",
    `- ${NO_SUBAGENTS}`,
    "- Caveman output: drop filler, articles and pleasantries. Keep every technical fact, code block, path and error string verbatim.",
    "- American English, ASCII punctuation, no em dashes, no curly quotes.",
    "- Minimal change: build exactly what was asked. Propose anything extra in prose, never write it.",
    `- ${MANTRA}`,
  ].join("\n");
}

/**
 * The per-prompt re-anchor: one short line, or it is not worth the tokens it
 * costs on every single turn.
 *
 * @returns {string} the one-liner, or "" when disabled
 */
export function promptDirective() {
  if (!directiveEnabled()) {
    return "";
  }

  return "rule first. caveman on. no subagents. every token saved is a token earned.";
}

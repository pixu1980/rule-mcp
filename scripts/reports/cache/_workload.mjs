/** @module scripts/reports/cache/workload */

/**
 * One cacheable call per entry path, plus the two tools that read no skill.
 *
 * Not a benchmark: a sample wide enough that the invalidation and entry-path
 * numbers describe the cache rather than the harness that measured it.
 */
export const WORKLOAD = [
  ["rule_tool", { prompt: "react button component" }],
  ["rule_tool_frontend_react", { mode: "tldr", query: "hooks" }],
  ["rule_tool_styleguide_css", { mode: "tldr", query: "container query" }],
  ["rule_tool_check", { skill: "rule-mcp-styleguide-css", code: "a{color:red}" }],
  ["rule_tool_search", { query: "container query" }],
  ["rule_tool_component", { component: "button", framework: "react" }],
  ["rule_tool_compress", { text: "It is important to note that this is filler." }],
];

/**
 * Rephrase a prompt the way a second person would ask the same thing: a
 * question opening, different capitalization, a pluralized last word. It has to
 * be a rephrasing and not a different question, or the number is a lie.
 *
 * @param {string} prompt
 * @returns {string}
 */
export function rephrase(prompt) {
  const words = prompt.trim().split(/\s+/);
  const last = words.at(-1);
  const plural = /[a-z]$/.test(last) && !last.endsWith("s") ? `${last}s` : last;

  return `How do I ${[...words.slice(0, -1), plural].join(" ")}?`;
}

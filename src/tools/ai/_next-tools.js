/** The follow-up tools a routed skill suggests calling next. */
export function skillNextTools(skillName) {
  const suggestions = [];
  const base = skillName.replace(/^rule-/, "").replaceAll("-", "_");
  suggestions.push(`rule_tool_${base}`);

  if (skillName === "rule-styleguide") {
    suggestions.push("rule_tool_scaffold");
  }

  suggestions.push("rule_tool_check", "rule_tool_search");

  if (skillName !== "rule-frontend-vanilla-reactive") {
    suggestions.push("rule_tool_component");
  }

  return suggestions;
}

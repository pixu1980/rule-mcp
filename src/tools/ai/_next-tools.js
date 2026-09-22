

/** The follow-up tools a routed skill suggests calling next. */
export function skillNextTools(skillName) {
  const suggestions = [];
  const base = skillName.replace(/^rule-/, "").replaceAll("-", "_");

  suggestions.push(`rule_tool_${base}`);

  if (skillName.startsWith("rule-styleguide")) {
    suggestions.push("rule_tool_styleguide");
  }

  suggestions.push("rule_tool_check", "rule_tool_search", "rule_tool_compress");

  return suggestions;
}

/** The follow-up tools a routed skill suggests calling next. */
export function skillNextTools(skillName) {
  const suggestions = [];
  const base = skillName.replace(/^pix-/, "").replaceAll("-", "_");
  suggestions.push(`pix_tool_${base}`);

  if (skillName === "pix-styleguide") {
    suggestions.push("pix_tool_scaffold");
  }

  suggestions.push("pix_tool_check", "pix_tool_search");

  if (skillName !== "pix-frontend-vanilla-reactive") {
    suggestions.push("pix_tool_component");
  }

  return suggestions;
}

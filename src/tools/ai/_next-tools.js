// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** The follow-up tools a routed skill suggests calling next. */
export function skillNextTools(skillName) {
  const suggestions = [];
  const base = skillName.replace(/^pix-/, "").replaceAll("-", "_");

  suggestions.push(`pix_tool_${base}`);

  if (skillName.startsWith("pix-styleguide")) {
    suggestions.push("pix_tool_styleguide");
  }

  suggestions.push("pix_tool_check", "pix_tool_search", "pix_tool_compress");

  return suggestions;
}

// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Render the advisory semantic report the check tool returns. */
export function renderSemantic(semantic) {
  const lines = ["# Semantic guardrails", "", semantic.summary, ""];

  for (const entry of semantic.advisory) {
    lines.push("## ⚠️ " + entry.id + ": " + entry.label, "");

    for (const detail of entry.detail ?? []) {
      lines.push("- " + detail);
    }

    lines.push("- Fix: " + entry.suggestion, "");
  }

  return lines.join("\n");
}

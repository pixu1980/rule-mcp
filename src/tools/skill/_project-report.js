

/** Render the project graph report the check tool returns. */
export function renderProject(project) {
  const lines = ["# Project guardrails", "", project.summary, ""];

  for (const entry of project.failed) {
    lines.push("## ❌ " + entry.id + ": " + entry.label, "", "- Failures: " + entry.failCount);

    for (const detail of entry.detail ?? []) {
      lines.push("- " + detail);
    }

    lines.push("- Fix: " + entry.suggestion, "");
  }

  if (project.advisoryCount > 0) {
    lines.push("### Advisory (reported, not failing)", "");

    for (const entry of project.advisory) {
      lines.push("- ⚠️ " + entry.id + ": " + entry.label + " - " + entry.failCount + " finding(s)");

      for (const detail of entry.detail ?? []) {
        lines.push("  - " + detail);
      }
    }

    lines.push("");
  }

  if (project.skippedCount > 0) {
    lines.push("### Skipped", "");

    for (const entry of project.skipped) {
      lines.push("- ⏩ " + entry.id + ": " + entry.reason);
    }

    lines.push("");
  }

  return lines.join("\n");
}

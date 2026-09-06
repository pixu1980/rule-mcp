/** @module cli/roles/render - the list and detail views */

import { color } from "../tui.js";
import { print } from "./_store.js";

/** The merged catalog as a table a human can scan. */
export function renderList(roles, problems) {
  const lines = [
    color("🎭 Review personas", "bold"),
    "",
    `| ${"Role".padEnd(16)} | ${"Layer".padEnd(8)} | ${"Status".padEnd(10)} | Years | Title`,
    `| ${"-".repeat(16)} | ${"-".repeat(8)} | ${"-".repeat(10)} | ----- | -----`,
  ];

  for (const role of roles) {
    lines.push(
      `| ${role.id.padEnd(16)} | ${role.layer.padEnd(8)} | ${role.status.padEnd(10)} | ` +
        `${String(role.yearsOfExperience).padStart(5)} | ${role.role}`,
    );
  }

  if (problems.length > 0) {
    lines.push("", color("Overlay files skipped:", "yellow"));

    for (const problem of problems) {
      lines.push(`  ${problem.file}: ${problem.reason}`);
    }
  }

  lines.push("", color("Tip: use `rule-mcp roles list --json` for automation output.", "dim"));

  return lines.join("\n");
}

/** One role, in full. */
export function renderRole(role) {
  return [
    color(`🎭 ${role.id} - ${role.role}`, "bold"),
    "",
    `Layer:    ${role.layer}`,
    `Status:   ${role.status}${role.deprecatedBy ? ` (replaced by ${role.deprecatedBy})` : ""}`,
    `Version:  ${role.version}`,
    `Years:    ${role.yearsOfExperience}`,
    "",
    "Skills:",
    ...(role.skills ?? []).map((skill) => `  - ${skill}`),
    "",
    "Lenses:",
    ...(role.lenses ?? []).map((lens) => `  - ${lens}`),
    "",
    "Evidence skills:",
    ...(role.evidenceSkills ?? []).map((skill) => `  - ${skill}`),
  ].join("\n");
}

/** Refuse, saying what would have worked. */
export function unknownRole(id, roles) {
  print(`Unknown role "${id}". Known: ${roles.map((role) => role.id).join(", ")}.`);
  process.exitCode = 1;
}

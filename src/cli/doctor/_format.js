/** Compose the doctor report for the terminal. */
import { agentsSection, automationSection, daemonSection, modelsSection, pathsSection, systemSection, toolsSection } from "./_sections.js";

/**
 * Format a doctor report for humans in the terminal.
 * JSON remains available through `rule-mcp doctor --json`.
 *
 * @param {object} report - Result from runDoctor()
 * @returns {string}
 */
export function formatDoctorTerminal(report) {
  const lines = [
    ...systemSection(report),
    ...toolsSection(report),
    ...agentsSection(report),
    ...daemonSection(report),
    ...modelsSection(report),
    ...pathsSection(report),
    ...automationSection(),
  ];

  return lines.join("\n") + "\n";
}

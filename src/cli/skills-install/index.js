

/**
 * @module cli/skills-install
 *
 * Interactive skill installer for rule-mcp.
 * Shows a checkbox-style selection of available skills
 * and installs them to a global (~/.agents/skills/) or local (.agents/skills/) path.
 *
 * Usage:
 *   rule-mcp skills install
 *   rule-mcp skills install --scope project
 *   rule-mcp skills install --scope global --all
 */

export * from "./_catalog.js";
export * from "./_native.js";
export * from "./_personas.js";
export * from "./_uninstall.js";
export * from "./_picker.js";
export * from "./_commands.js";

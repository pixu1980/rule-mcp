

/**
 * @module resources/index
 *
 * MCP Resource registry for rule-mcp.
 * Handles listing and reading rulemcp://* resources.
 *
 * Each resource is a piece of skill content or metadata
 * accessible via MCP's resource protocol.
 *
 * @see module:core/skills
 */

import { getSkillNames, isPluginSkill } from "../tools/router/index.js";

/**
 * List all available resources with their URIs and metadata.
 *
 * @returns {Array<{ uri: string, name: string, mimeType: string }>}
 */
export function listResources() {
  const resources = [
    { uri: "rulemcp://skills", name: "All rule-mcp skills index", mimeType: "application/json" },
    { uri: "rulemcp://templates", name: "Design system component templates", mimeType: "application/json" },
    {
      uri: "rulemcp://project",
      name: "Project analysis (detected framework + suggested tools)",
      mimeType: "application/json",
    },
    { uri: "rulemcp://community", name: "Community rule-mcp skills index", mimeType: "application/json" },
    { uri: "rulemcp://ai", name: "rule-mcp skill full content", mimeType: "text/markdown" },
    { uri: "rulemcp://a11y", name: "A11y testing guide (Playwright + axe-core)", mimeType: "text/markdown" },
    { uri: "rulemcp://a11y/test-basic", name: "Basic a11y test template", mimeType: "text/plain" },
    { uri: "rulemcp://a11y/test-forms", name: "Form a11y test template", mimeType: "text/plain" },
  ];

  // Add one resource per skill (skip plugins - they are published via their own mechanism)
  for (const name of getSkillNames()) {
    if (name === "rule-mcp" || isPluginSkill(name)) {
      continue;
    }

    resources.push(
      {
        uri: `rulemcp://${name}`,
        name: `${name} skill full content`,
        mimeType: "text/markdown",
      },
      {
        uri: `rulemcp://${name}/summary`,
        name: `${name} skill summary (first 30 lines)`,
        mimeType: "text/markdown",
      },
    );
  }

  return resources;
}

export * from "./_read.js";
export * from "./_serve.js";
export * from "./_listing.js";

/**
 * @module resources/index
 *
 * MCP Resource registry for pix-galaxy-mcp.
 * Handles listing and reading pix://* resources.
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
    { uri: "pix://skills", name: "All pix skills index", mimeType: "application/json" },
    { uri: "pix://templates", name: "Design system component templates", mimeType: "application/json" },
    {
      uri: "pix://project",
      name: "Project analysis (detected framework + suggested tools)",
      mimeType: "application/json",
    },
    { uri: "pix://community", name: "Community pix skills index", mimeType: "application/json" },
    { uri: "pix://ai", name: "pix skill full content", mimeType: "text/markdown" },
    { uri: "pix://a11y", name: "A11y testing guide (Playwright + axe-core)", mimeType: "text/markdown" },
    { uri: "pix://a11y/test-basic", name: "Basic a11y test template", mimeType: "text/plain" },
    { uri: "pix://a11y/test-forms", name: "Form a11y test template", mimeType: "text/plain" },
  ];

  // Add one resource per skill (skip plugins - they are published via their own mechanism)
  for (const name of getSkillNames()) {
    if (name === "pix" || isPluginSkill(name)) {
      continue;
    }

    resources.push(
      {
        uri: `pix://${name}`,
        name: `${name} skill full content`,
        mimeType: "text/markdown",
      },
      {
        uri: `pix://${name}/summary`,
        name: `${name} skill summary (first 30 lines)`,
        mimeType: "text/markdown",
      },
    );
  }

  return resources;
}

export * from "./_read.js";
export * from "./_serve.js";

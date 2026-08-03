/**
 * @module resources/index
 *
 * MCP Resource registry for rule-mcp.
 * Handles listing and reading rule://* resources.
 *
 * Each resource is a piece of skill content or metadata
 * accessible via MCP's resource protocol.
 *
 * @see module:core/skills
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";
import { readSkill, getSkillNames, isPluginSkill } from "../tools/router.js";

/**
 * List all available resources with their URIs and metadata.
 *
 * @returns {Array<{ uri: string, name: string, mimeType: string }>}
 */
export function listResources() {
  const resources = [
    { uri: "rule://skills", name: "All rule skills index", mimeType: "application/json" },
    { uri: "rule://templates", name: "Design system component templates", mimeType: "application/json" },
    { uri: "rule://project", name: "Project analysis (detected framework + suggested tools)", mimeType: "application/json" },
    { uri: "rule://community", name: "Community rule skills index", mimeType: "application/json" },
    { uri: "rule://ai", name: "rule skill full content", mimeType: "text/markdown" },
    { uri: "rule://a11y", name: "A11y testing guide (Playwright + axe-core)", mimeType: "text/markdown" },
    { uri: "rule://a11y/test-basic", name: "Basic a11y test template", mimeType: "text/plain" },
    { uri: "rule://a11y/test-forms", name: "Form a11y test template", mimeType: "text/plain" },
  ];

  // Add one resource per skill (skip plugins — they are published via their own mechanism)
  for (const name of getSkillNames()) {
    if (name === "rule" || isPluginSkill(name)) {
    	continue;
    }

    resources.push({
      uri: `rule://${name}`,
      name: `${name} skill full content`,
      mimeType: "text/markdown",
    }, {
      uri: `rule://${name}/summary`,
      name: `${name} skill summary (first 30 lines)`,
      mimeType: "text/markdown",
    });
  }

  return resources;
}

/**
 * Read a resource by its URI and return its contents.
 *
 * @param {string} uri — Resource URI (e.g. "rule://skills", "rule://rule-frontend-react")
 * @returns {Promise<{ contents: Array<{ uri: string, mimeType: string, text: string }> }>}
 */
export async function readResource(uri) {
  const { homeSkills, embeddedSkills } = getSkillsDirectories();

  // ── Skill index ────────────────────────────────────────────────
  if (uri === "rule://skills") {
    const directories = [];
    for (const base of [embeddedSkills, homeSkills]) {
      try {
        for (const entry of readdirSync(base, { withFileTypes: true })) {
          if (!(entry.isDirectory() && entry.name.startsWith("rule"))) {
          	continue;
          }

          const sp = join(base, entry.name, "SKILL.md");
          try {
            const c = readFileSync(sp, "utf8");
            directories.push({ name: entry.name, path: sp, length: c.length });
          } catch {
            /* no SKILL.md */
          }
        }
      } catch {
        /* no dir */
      }
    }
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(directories, null, 2) }] };
  }

  // ── Templates catalog ──────────────────────────────────────────
  if (uri === "rule://templates") {
    const { listTemplateCategories } = await import("../core/templates.js");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(listTemplateCategories(), null, 2),
        },
      ],
    };
  }

  // ── rule skill ───────────────────────────────────────────
  if (uri === "rule://ai") {
    return { contents: [{ uri, mimeType: "text/markdown", text: readSkill("rule") || "" }] };
  }

  // ── A11y resources ─────────────────────────────────────────────
  if (uri === "rule://a11y") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text:
            "For the full a11y testing guide with Playwright + axe-core, see rule-styleguide a11y.md Section 12: Automated Testing.\n\n" +
            "Use `rule_tool_component component=a11y-test-basic` to generate test files.\n" +
            "Use `rule_tool_component component=playwright-config` to generate Playwright config.",
        },
      ],
    };
  }

  if (uri === "rule://a11y/test-basic") {
    const { getTemplate } = await import("../core/templates.js");
    const tmpl = getTemplate("a11y-test-basic");
    return { contents: [{ uri, mimeType: "text/plain", text: typeof tmpl === "string" ? tmpl : tmpl?.html || "" }] };
  }

  if (uri === "rule://a11y/test-forms") {
    const { getTemplate } = await import("../core/templates.js");
    const tmpl = getTemplate("a11y-test-forms");
    return { contents: [{ uri, mimeType: "text/plain", text: typeof tmpl === "string" ? tmpl : tmpl?.html || "" }] };
  }

  // ── rule://community — list community skills ───────────────────
  if (uri === "rule://community") {
    const { getSkillNames, isPluginSkill, readSkill } = await import("../tools/router.js");
    const allSkills = getSkillNames();
    const plugins = [];
    for (const name of allSkills) {
      if (!isPluginSkill(name)) {
      	continue;
      }

      const content = readSkill(name);
      const desc = content?.match(/^description:\s*(.+)$/m)?.[1]?.trim() || "User-defined plugin skill";
      plugins.push({ name, description: desc, type: "plugin", source: "~/.agents/skills/" });
    }
    const result = { plugins, known_community: [], total: plugins.length };
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(result, null, 2) }] };
  }

  // ── rule://project — analyze project and suggest tools ──────────
  if (uri === "rule://project") {
    const { detectProject, getFrameworkSuggestion } = await import("../core/detector.js");
    const profile = detectProject(process.cwd());
    const { skillName, toolName } = getFrameworkSuggestion(profile.framework);
    const result = {
      ...profile,
      suggested_skills: [skillName],
      suggested_tools: [toolName, "rule_tool_check", "rule_tool_scaffold", "rule_tool_component"],
      message: `Detected ${profile.framework} project "${profile.projectName}". Use ${toolName} for rule-compliant code generation.`,
    };
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(result, null, 2) }] };
  }

  // ── Dynamic: rule://<skill-name> or rule://<skill-name>/<section> ──
  const m = uri?.match(/^rule:\/\/(rule(?:-[a-z0-9]+)*)(?:\/(\w+))?$/);
  if (m) {
    const [, skillName, section] = m;
    const content = readSkill(skillName);
    if (content) {
      if (section === "summary") {
        const lines = content.split("\n").slice(0, 30).join("\n");
        return { contents: [{ uri, mimeType: "text/markdown", text: `# ${skillName} (summary)\n\n${lines}\n\n...` }] };
      }
      return { contents: [{ uri, mimeType: "text/markdown", text: content }] };
    }
  }

  return { contents: [{ uri, mimeType: "text/plain", text: "Resource not found" }] };
}

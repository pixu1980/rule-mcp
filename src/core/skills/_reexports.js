

/**
 * @module core/skills/reexports - parser and metadata helpers re-exported
 * beside the loader, so the barrel serves one surface for both.
 */
/**
 * Parse YAML frontmatter from a skill SKILL.md file.
 * Extracts name, description, tags, and frameworks metadata
 * from the YAML frontmatter block (between --- markers).
 *
 * Supports:
 * - Inline scalars: `description: text`
 * - Literal block scalars: `description: |\n  line1\n  line2`
 * - Folded block scalars: `description: >\n  line1\n  line2`
 *
 * @param {string} content - Full SKILL.md content
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export { parseSkillFrontmatter } from "./_frontmatter.js";
/**
 * Get skill metadata (parsed from YAML frontmatter).
 * Results are cached in the LRU cache.
 *
 * @param {string} skillName - e.g. "rule-frontend-react"
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export { getSkillMetadata } from "../../tools/router/index.js";
/**
 * Extract the "Project Scaffolding" section from a SKILL.md file.
 * Looks for the section between the scaffold heading and the next section.
 *
 * @param {string} content - Full SKILL.md content
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export { extractScaffoldSection } from "../scaffold/_parser.js";
/**
 * Extract a single scaffold file's content from the scaffolding section.
 * Matches by file name in a markdown heading (e.g. ### `.prettierrc`).
 *
 * @param {string} section - The extracted scaffolding section text
 * @param {string} fileName - The config file name (e.g. ".prettierrc")
 * @returns {{ isError?: boolean, content: Array<{ type: string, text: string }> }}
 */
export { extractSingleScaffoldFile } from "../scaffold/_parser.js";

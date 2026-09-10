

/** @module core/agents/commands/formats - render formats and the shared scalar quoting */

/**
 * Render formats, as data. Two independent axes:
 *   - `ext`         the filename suffix the host discovers
 *   - `frontmatter` "yaml" (Markdown hosts), "toml" (Gemini), or null (prose only)
 *   - `placeholder` the host's argument token, or null when the host does NOT
 *                   substitute one (then `$ARGUMENTS` is replaced by prose, so a
 *                   literal, meaningless token never reaches the model)
 */
export const FORMATS = {
  // Claude Code, Pi, Cursor, opencode - substitute $ARGUMENTS
  args: { ext: ".md", frontmatter: "yaml", placeholder: "$ARGUMENTS" },
  // Roo Code / forks - frontmatter menu entry, arguments typed by hand
  plain: { ext: ".md", frontmatter: "yaml", placeholder: null },
  // VS Code Copilot Chat prompt files - `/name`, ${input:...} only, no $ARGUMENTS
  prompt: { ext: ".prompt.md", frontmatter: "yaml", placeholder: null },
  // Windsurf, Cline - workflow files, no argument substitution
  workflow: { ext: ".md", frontmatter: null, placeholder: null },
  // Gemini CLI (and forks) - TOML with {{args}}
  gemini: { ext: ".toml", frontmatter: "toml", placeholder: "{{args}}" },
  // Devin - one directory per command, each holding a SKILL.md
  devin: { ext: "/SKILL.md", frontmatter: "devin", placeholder: null },
};

/** Supported render formats → file extension. */
export const FORMAT_EXT = Object.fromEntries(Object.entries(FORMATS).map(([format, spec]) => [format, spec.ext]));

/**
 * Stand-in for `$ARGUMENTS` on hosts that do not substitute anything: the text
 * the user typed after the command is already appended to the prompt by the
 * host, so the body only has to name it.
 */
export const ARGUMENTS_PROSE = "the request typed after this command in the chat input";

/** Collapse whitespace and wrap a string as a safe double-quoted YAML/TOML scalar. */
export function quoted(text) {
  return `"${String(text)
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll('"', String.raw`\"`)}"`;
}

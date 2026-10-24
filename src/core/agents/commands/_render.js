/** @module core/agents/commands/render - one command to one file, per format */

import { compressText } from "../../text/_compression.js";
import { compressionEnabled } from "../../text/_level.js";
import { listAgentCommands } from "./_definitions.js";
import { ARGUMENTS_PROSE, FORMAT_EXT, FORMATS, quoted } from "./_formats.js";

/**
 * Render one command to a single agent format's file content.
 *
 * @param {{ name: string, description: string, argumentHint: string, body: string }} command
 * @param {"args"|"workflow"|"gemini"} format
 * @returns {string}
 */
export function renderAgentCommand(command, format) {
  const spec = FORMATS[format];

  if (!spec) {
    throw new Error(`Unknown agent command format: ${format}`);
  }

  const { name, description, argumentHint, body: rawBody } = command;
  const body = rawBody.replaceAll("$ARGUMENTS", spec.placeholder ?? ARGUMENTS_PROSE);

  if (spec.frontmatter === "toml") {
    return [`description = ${quoted(description)}`, 'prompt = """', body, '"""', ""].join("\n");
  }

  if (spec.frontmatter === "yaml") {
    // Claude Code / Pi / Cursor / Roo / VS Code prompt files all read this shape.
    return ["---", `description: ${quoted(description)}`, `argument-hint: "${argumentHint}"`, "---", body, ""].join("\n");
  }

  if (spec.frontmatter === "devin") {
    // Devin reads one directory per command, each containing a SKILL.md whose
    // name field is the slash command.
    return ["---", `name: /${name}`, `description: ${quoted(description)}`, "---", "", `# ${name}`, "", body, ""].join("\n");
  }
  // Prose-only workflow file (Windsurf, Cline).
  return [`# ${name}`, "", body, ""].join("\n");
}

/**
 * Render the full command set for a format as `{ filename, content }` pairs,
 * in canonical order. Callers own the actual filesystem writes.
 *
 * The rendered file is read by the agent on every session, so its body runs
 * through the compression pass before it reaches disk (measured ~6% on the
 * shipped bodies; frontmatter and placeholders are code-shaped and pass
 * untouched; the guard guarantees structure - ADR 078).
 *
 * @param {"args"|"workflow"|"gemini"} format
 * @returns {Array<{ name: string, filename: string, content: string }>}
 */
export function renderAgentCommandFiles(format, only) {
  const ext = FORMAT_EXT[format];

  if (!ext) {
    throw new Error(`Unknown agent command format: ${format}`);
  }
  // `only` is the resolved selection: an install writes what the user chose,
  // and absent means everything, which is what every caller wanted before the
  // surface grew a command per skill.
  const wanted = only ? new Set(only) : null;

  const compress = compressionEnabled();

  return listAgentCommands()
    .filter((command) => !wanted || wanted.has(command.name))
    .map((command) => {
      const content = renderAgentCommand(command, format);

      return { name: command.name, filename: `${command.name}${ext}`, content: compress ? compressText(content) : content };
    });
}

// Auto-extracted - scaffold-section parsing shared by skill tools.
import { errorResult, textResult } from "../../shared/index.js";

/**
 * Extract the scaffold section from a SKILL.md body.
 *
 * @param {string} content
 * @returns {string} the scaffold block, or ""
 */
export function extractScaffoldSection(content) {
  const startMarker = "## Project Scaffolding";
  const endMarker = "## Guardrails";
  const start = content.indexOf(startMarker);

  if (start === -1) {
    return "Scaffolding section not found. Use pix_styleguide mode=full to read the full skill.";
  }

  const end = content.indexOf(endMarker, start + 1);

  return content.slice(start, end > start ? end : undefined).trim();
}

/**
 * Extract one scaffold file's content from the scaffold section.
 *
 * @param {string} section
 * @param {string} fileName
 * @returns {object}
 */
export function extractSingleScaffoldFile(section, fileName) {
  const lines = section.split("\n");
  const headers = ["### `" + fileName + "`", "### " + fileName, "#### `" + fileName + "`", "#### " + fileName];
  let startIndex = -1;

  for (const [index, line] of lines.entries()) {
    if (headers.some((h) => line.trim() === h)) {
      startIndex = index;
      break;
    }
  }

  if (startIndex < 0) {
    return errorResult('File "' + fileName + '" not found. Available: .prettierrc, .nvmrc, .npmrc, .editorconfig, .gitignore, eslint.config.mjs, tsconfig.json, jsconfig.json');
  }

  let fenceStart = -1;

  for (let index = startIndex + 1; index < lines.length; index++) {
    if (lines[index].trimStart().startsWith("```")) {
      fenceStart = index;
      break;
    }
  }

  if (fenceStart < 0) {
    return { isError: true, content: [{ type: "text", text: 'No code block found for "' + fileName + '".' }] };
  }

  const contentLines = [];

  for (let index = fenceStart + 1; index < lines.length; index++) {
    if (lines[index].trimStart().startsWith("```")) {
      break;
    }

    contentLines.push(lines[index]);
  }

  return textResult(contentLines.join("\n"));
}

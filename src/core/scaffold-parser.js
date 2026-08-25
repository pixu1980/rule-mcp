// Auto-extracted - scaffold-section parsing shared by skill tools.

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
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            'File "' +
            fileName +
            '" not found. Available: .prettierrc, .nvmrc, .editorconfig, .gitignore, eslint.config.mjs, tsconfig.json, jsconfig.json',
        },
      ],
    };
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
  return { content: [{ type: "text", text: contentLines.join("\n") }] };
}

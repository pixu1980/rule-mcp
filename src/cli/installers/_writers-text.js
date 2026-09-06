/**
 * Text writers: TOML blocks, instruction markers, and the sidecar command
 * template builders (commandBody, geminiCommand, copilotAgent).
 * @module cli/installers/writers-text
 */

import { COMMAND_TEMPLATE_PATH, readText } from "./_paths.js";

const upsertTomlBlock = (current, blockName, block) => {
  const escapedName = blockName.replaceAll(".", String.raw`\.`);
  const re = new RegExp(String.raw`\n?\[${escapedName}\][\s\S]*?(?=\n\[[^\]]+\]|$)`, "m");
  const nb = `[${blockName}]\n${block.trim()}\n`;

  return re.test(current) ? current.replace(re, `\n${nb}`) : `${current.trimEnd()}\n\n${nb}`;
};

/** Remove a TOML block by name. */

const removeTomlBlock = (current, blockName) => {
  const re = new RegExp(String.raw`\n?\[${blockName.replaceAll(".", String.raw`\.`)}\][\s\S]*?(?=\n\[[^\]]+\]|$)`, "m");

  return re.test(current) ? current.replace(re, "") : current;
};

const INSTRUCTION_BLOCK =
  `${"<!-- rule-mcp -->"}\n` +
  "Before writing any frontend/styling code, call `rule` to route the task to the correct rule skill. " +
  "Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via " +
  "adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, " +
  "pix_process_adr. Flex first: display:grid only for named areas, subgrid, explicit placement, or " +
  "auto-fit tracks - what a flex row or column can do, flex does.\n" +
  "<!-- /rule-mcp -->";

/** Append the marked instruction block, or refresh a stale one when forced. */

const appendInstruction = (current, { refresh = false } = {}) => {
  if (current.includes("<!-- rule-mcp -->")) {
    // A stale block is replaced so an install ships the CURRENT rules, never
    // the text a user installed once. Without --force the existing block wins.
    return refresh ? removeInstruction(current) + `\n\n${INSTRUCTION_BLOCK}\n` : current;
  }

  return `${current.trimEnd()}\n\n${INSTRUCTION_BLOCK}\n`;
};

/** Remove the rule-mcp instruction marker. */

const removeInstruction = (current) => {
  const marker = "<!-- rule-mcp -->";

  if (!current.includes(marker)) {
    return current;
  }

  return current.replaceAll(/\n*<!-- rule-mcp -->[\s\S]*?<!-- \/rule-mcp -->\n*/g, "").trimEnd();
};

const commandTemplate = () => readText(COMMAND_TEMPLATE_PATH);

const commandBody = () =>
  commandTemplate()
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")
    .trim();

const geminiCommand = () =>
  [
    'description = "Route coding work through rule-mcp"',
    'prompt = """',
    commandBody().replaceAll("$ARGUMENTS", "{{args}}"),
    '"""',
    "",
  ].join("\n");

const copilotAgent = () =>
  [
    "---",
    "name: rule-mcp",
    "description: Route work through rule MCP skills and enforce validation before completion.",
    "---",
    "",
    commandBody(),
    "",
  ].join("\n");

export {
  upsertTomlBlock,
  removeTomlBlock,
  appendInstruction,
  removeInstruction,
  commandTemplate,
  commandBody,
  geminiCommand,
  copilotAgent,
};

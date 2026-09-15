

/**
 * Text writers: TOML blocks, instruction markers, and the sidecar command
 * template builders (commandBody, geminiCommand, copilotAgent).
 * @module cli/installers/writers-text
 */

import { COMMAND_TEMPLATE_PATH, readText } from "./_paths.js";
import { INSTRUCTION_BLOCKS, INSTRUCTION_MARKER, RULES_MARKER, closingMarker } from "./_instruction.data.js";

/** The sentinels an install owns, and an uninstall sweeps. */
const INSTRUCTION_MARKERS = [INSTRUCTION_MARKER, RULES_MARKER];

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

/** Whether this text already carries one of the blocks. */
const carriesBlock = (current) => INSTRUCTION_MARKERS.some((marker) => current.includes(marker));

/** Regex-safe form of a sentinel, which is markup and not a pattern. */
const quoted = (marker) => marker.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);

/** A block and its sentinels, with the blank lines around it. */
const blockPattern = (marker) => new RegExp(String.raw`\n*${quoted(marker)}[\s\S]*?${quoted(closingMarker(marker))}\n*`, "g");

/** Append both marked blocks, or refresh stale ones when forced. */

const appendInstruction = (current, { refresh = false } = {}) => {
  const present = carriesBlock(current);

  // A stale block is replaced so an install ships the CURRENT rules, never
  // the text a user installed once. Without --force the existing block wins.
  if (present && !refresh) {
    return current;
  }

  return `${present ? removeInstruction(current) : current.trimEnd()}\n\n${INSTRUCTION_BLOCKS.join("\n\n")}\n`;
};

/** Remove every rule-mcp instruction block, sentinels included. */

const removeInstruction = (current) => {
  if (!carriesBlock(current)) {
    return current;
  }

  let text = current;

  for (const marker of INSTRUCTION_MARKERS) {
    text = text.replaceAll(blockPattern(marker), "");
  }

  return text.trimEnd();
};

const commandTemplate = () => readText(COMMAND_TEMPLATE_PATH);

const commandBody = () =>
  commandTemplate()
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")
    .trim();

const geminiCommand = () => ['description = "Route coding work through rule-mcp"', 'prompt = """', commandBody().replaceAll("$ARGUMENTS", "{{args}}"), '"""', ""].join("\n");

const copilotAgent = () =>
  ["---", "name: rule-mcp", "description: Route work through rule MCP skills and enforce validation before completion.", "---", "", commandBody(), ""].join("\n");

export { upsertTomlBlock, removeTomlBlock, appendInstruction, removeInstruction, commandTemplate, commandBody, geminiCommand, copilotAgent };

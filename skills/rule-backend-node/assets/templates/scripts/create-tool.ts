#!/usr/bin/env tsx
/**
 * Scaffold a new tool module under src/tools/ and export it for the executor.
 *
 * Usage: npm run new:tool -- <tool-name>
 * The name may be passed in any case; the module is written in kebab-case.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolName = process.argv[2]?.trim();

if (!toolName) {
  console.error("missing tool name; usage: new:tool <tool-name>");
  process.exit(2);
}

const kebab = toolName.toLowerCase().replaceAll(/\s+/g, "-");
const pascal = kebab.replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase());
const toolsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "tools");
const modulePath = join(toolsDir, `${kebab}.tool.ts`);
const variableName = `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;

if (existsSync(modulePath)) {
  console.error(`${modulePath} already exists - aborting`);
  process.exit(1);
}

mkdirSync(toolsDir, { recursive: true });

const source = `import { toolRegistry } from "../registries/tool-registry.js";

export const ${variableName}Tool = toolRegistry.define({
  name: "${kebab}",
  description: "TODO: what this tool does",
  inputSchema: {},
  async run(_input) {
    throw new Error("not implemented yet");
  },
});
`;

writeFileSync(modulePath, source, "utf8");
console.log(`created ${modulePath} - implement run() and register with the executor`);

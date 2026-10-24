#!/usr/bin/env tsx
/**
 * Scaffold a new agent module under src/agents/ and register it.
 *
 * Usage: npm run new:agent -- <agent-name>
 * The name may be passed in any case; the module is written in kebab-case.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const agentId = process.argv[2]?.trim();

if (!agentId) {
  console.error("missing agent name; usage: new:agent <agent-name>");
  process.exit(2);
}

const kebab = agentId.toLowerCase().replaceAll(/\s+/g, "-");
const pascal = kebab.replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase());
const agentsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents");
const modulePath = join(agentsDir, `${kebab}.agent.ts`);
const variableName = `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;

if (existsSync(modulePath)) {
  console.error(`${modulePath} already exists - aborting`);
  process.exit(1);
}

mkdirSync(agentsDir, { recursive: true });

const source = `import { agentRegistry } from "../registries/agent-registry.js";
import type { AgentConfig } from "../types.js";

export const ${variableName}Agent: AgentConfig = {
  id: "${kebab}",
  name: "${pascal} Agent",
  description: "TODO: describe this agent",
  provider: "claude",
  systemPrompt: "You are a helpful assistant.",
  tools: [],
  memory: false,
  maxIterations: 5,
};

agentRegistry.register(${variableName}Agent);
`;

writeFileSync(modulePath, source, "utf8");
console.log(`created ${modulePath} - wire the provider and tools, then register with rule-mcp`);

#!/usr/bin/env tsx
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run new:agent <agent-name>");
  process.exit(1);
}

const kebab = name.toLowerCase().replace(/\s+/g, "-");
const pascal = kebab.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents");
const file = join(dir, `${kebab}.agent.ts`);

if (existsSync(file)) {
  console.error(`Agent file already exists: ${file}`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const template = `import { agentRegistry } from '../registries/agent-registry.js';
import type { AgentConfig } from '../types.js';

const ${pascal.charAt(0).toLowerCase() + pascal.slice(1)}Agent: AgentConfig = {
  id: '${kebab}',
  name: '${pascal} Agent',
  description: 'TODO: describe this agent',
  provider: 'claude',
  systemPrompt: 'You are a helpful assistant.',
  tools: [],
  memory: false,
  maxIterations: 5,
};

agentRegistry.register(${pascal.charAt(0).toLowerCase() + pascal.slice(1)}Agent);

export default ${pascal.charAt(0).toLowerCase() + pascal.slice(1)}Agent;
`;

writeFileSync(file, template, "utf-8");
console.log(`✔ Created agent: ${file}`);

#!/usr/bin/env tsx
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run new:tool <tool-name>');
  process.exit(1);
}

const kebab = name.toLowerCase().replace(/\s+/g, '-');
const camel = kebab.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'tools');
const file = join(dir, `${kebab}.tool.ts`);

if (existsSync(file)) {
  console.error(`Tool file already exists: ${file}`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const template = `import { z } from 'zod';
import { toolRegistry } from '../registries/tool-registry.js';
import type { Tool } from '../types.js';

const ${camel}Tool: Tool = {
  name: '${kebab.replace(/-/g, '_')}',
  description: 'TODO: describe this tool',
  parameters: z.object({
    // TODO: define parameters
  }),
  async execute(params) {
    // TODO: implement tool logic
    return { result: 'not implemented' };
  },
};

toolRegistry.register(${camel}Tool);

export default ${camel}Tool;
`;

writeFileSync(file, template, 'utf-8');
console.log(`✔ Created tool: ${file}`);

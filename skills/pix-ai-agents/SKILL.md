---
name: rule-ai-agents
description: >
  Scaffold and maintain AI Agent repositories built on @rule/rule-mcp-core.
  Use when creating a new AI agent project, adding tools to an existing agent,
  configuring environment variables, writing tests, setting up seed data, or
  containerizing an agent service.
tags:
  - "ai"
  - "agents"
frameworks: [node, agents]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# AI Agents app with rule-mcp-core

## Core dependency

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| **Package**    | `@rule/rule-mcp-core`                                               |
| **Repository** | `https://github.com/rule/rule-mcp-core`                             |
| **Install**    | `pnpm add @rule/rule-mcp-core` (or `pnpm add @rule/rule-mcp-core`) |

This must be the primary dependency for all AI Agents app repositories.

## Step 1 - Create the project structure

If the AI Agents app is a **monorepo**, the server package lives at `src/server/`. The `src/server/` package structure is:

```
src/server/
├── src/
│   ├── index.ts               # Entry point: imports registries and starts the runner
│   ├── types.ts               # All shared interfaces (LLMProvider, Tool, MemoryProvider, AgentConfig)
│   ├── config/
│   │   └── env.ts             # Environment validation using zod
│   ├── agents/                # Agent definitions - one file per agent
│   │   └── <name>.agent.ts    # Calls agentRegistry.register() at module level
│   ├── tools/                 # Tool definitions - one file per tool
│   │   └── <name>.tool.ts     # Calls toolRegistry.register() at module level
│   ├── providers/             # LLMProvider implementations using @rule/rule-mcp-core
│   │   └── <name>.ts
│   ├── registries/            # Agent, tool, and provider singletons
│   ├── memory/                # MemoryProvider implementations + factory
│   └── utils/                 # Pure utility functions (e.g. zod-to-json-schema)
├── tests/unit/
├── scripts/
│   ├── new-agent.ts
│   └── new-tool.ts
├── package.json
├── tsconfig.json              # Extends ../../tsconfig.base.json, adds paths
└── vitest.config.ts
```

## Step 2 - Validate environment variables

Create `.env.example` with all required variables:

```env
# AI Configuration
AI_MODEL=rule-core-v1
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7
AI_SYSTEM_PROMPT=You are a helpful Pix AI assistant.

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

Create `src/config/env.ts` to validate at startup using zod. Fail fast on missing or invalid values:

```ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  AI_MODEL: z.string().min(1),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_SYSTEM_PROMPT: z.string().min(1),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

## Step 3 - Implement a provider

Create `src/server/src/providers/<name>.ts`. Each provider wraps `@rule/rule-mcp-core` and implements the `LLMProvider` interface defined in `src/server/src/types.ts`:

```ts
import { createAgent } from "@rule/rule-mcp-core";
import type { LLMProvider, Message, LLMResponse } from "../types.js";
import { env } from "../config/env.js";

export const pixProvider: LLMProvider = {
  async chat(messages, tools) {
    const agent = createAgent({
      model: env.AI_MODEL,
      maxTokens: env.AI_MAX_TOKENS,
      temperature: env.AI_TEMPERATURE,
      systemPrompt: env.AI_SYSTEM_PROMPT,
      tools,
    });
    return agent.chat(messages);
  },
};
```

## Step 4 - Define a tool

Create `src/server/src/tools/<name>.tool.ts`. Each tool self-registers at module level using `toolRegistry`:

```ts
import { z } from "zod";
import { toolRegistry } from "../registries/index.js";
import type { Tool } from "../types.js";

const searchTool: Tool = {
  name: "search",
  description: "Search the knowledge base for relevant information",
  parameters: z.object({
    query: z.string().describe("The search query"),
    limit: z.number().int().positive().default(10).describe("Max results"),
  }),
  execute: async ({ query, limit }) => {
    return { results: [] };
  },
};

toolRegistry.register(searchTool);
```

## Step 5 - Create the entry point

Create `src/server/src/index.ts`. It imports all registries (triggering self-registration) and starts the AgentRunner:

```ts
import "./agents/index.js";
import "./tools/index.js";
import "./providers/index.js";
import { AgentRunner } from "@rule/rule-mcp-core";
import { agentRegistry } from "./registries/index.js";
import { env } from "./config/env.js";
import pino from "pino";

const logger = pino({ level: env.LOG_LEVEL });
const runner = new AgentRunner({ agentRegistry, logger });

await runner.start();
```

## Step 6 - Set up seed data

The seed runs at the **monorepo root** (`seed/run-seed.ts`). It must include agent configuration, tool definitions, and sample datasets.

Place in `seed/data/agent-config.json`:

```json
{
  "model": "rule-core-v1",
  "maxTokens": 4096,
  "temperature": 0.7,
  "systemPrompt": "You are a helpful Pix AI assistant.",
  "tools": ["search", "calculate", "summarize"]
}
```

Create `seed/run-seed.ts` following the seed policy in `rules/common.md`. The seed writes a `.seed-complete` marker and is idempotent.

## Step 7 - Write tests

### Unit tests

Mock `@rule/rule-mcp-core` to isolate provider and tool logic:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@rule/rule-mcp-core", () => ({
  createAgent: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({ content: "mocked response" }),
  })),
  AgentRunner: vi.fn(() => ({ start: vi.fn() })),
}));

import { pixProvider } from "../../src/server/src/providers/rule.js";

describe("pixProvider", () => {
  it("returns a chat response", async () => {
    const result = await pixProvider.chat([{ role: "user", content: "hello" }]);
    expect(result).toBeDefined();
  });
});
```

### Unit tests for tools

Test each tool's `execute` function directly, without involving the registry:

```ts
import { describe, expect, it } from "vitest";
import { searchTool } from "../../src/server/src/tools/search.tool.js";

describe("searchTool", () => {
  it("returns results array", async () => {
    const result = await searchTool.execute({ query: "test", limit: 5 });
    expect(result).toHaveProperty("results");
  });
});
```

### Coverage

Coverage thresholds apply as defined in [rule-devops-testing](../rule-devops-testing/SKILL.md). Configure `vitest.config.ts` accordingly.

## Step 8 - Containerize

The monorepo has two Dockerfiles. Use templates from [skills/docker/SKILL.md](../rule-devops-docker/SKILL.md):

- **`src/server/Dockerfile`** - Backend or AI Agent template
- **`src/dashboard/Dockerfile`** - Frontend template with nginx
- **Root `docker-compose.yml`** - runs both `server` and `dashboard` services

| Setting         | Server                    | Dashboard |
| --------------- | ------------------------- | --------- |
| **Port**        | `3001`                    | `8080`    |
| **Entry**       | `dist/index.js`           | nginx     |
| **Healthcheck** | Omit if no HTTP interface | `GET /`   |

## Edge cases

- If the AgentRunner does not expose an HTTP interface, remove the `HEALTHCHECK` instruction from the Dockerfile and adjust `CMD` to `["node", "dist/index.js"]`.
- If tools require external API keys, add them to `.env.example` and validate them in `src/config/env.ts`. Never hardcode secrets.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher

---

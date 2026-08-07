---
name: rule-platform-agent
description: >-
  Use when scaffolding or maintaining AI Agent projects. Covers project structure, tool definitions, environment config, testing, and containerization.
tags:
  - "ai"
  - "agents"
frameworks: [node, agents]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# AI Agent project - framework-agnostic guidance

This skill describes how to structure an AI Agent project - an autonomous
program that uses an LLM to reason, call tools, and persist conversation
state - without mandating any particular SDK or core library.

Every example uses plain TypeScript interfaces and functions that you can
adapt to any agent framework (LangChain, Vercel AI SDK, OpenAI SDK, MCP
clients, custom runners, etc.).

---

## Step 1 - Create the project structure

A typical agent project lives under `src/` with clear separation:

```
src/
├── index.ts               # Entry point: imports registries, starts the runner
├── types.ts               # Shared interfaces (LLMProvider, Tool, AgentConfig, Memory)
├── config/
│   └── env.ts             # Environment validation with zod
├── agents/                # Agent definitions - one file per agent
│   └── <name>.agent.ts    # Calls agentRegistry.register() at module level
├── tools/                 # Tool definitions - one file per tool
│   └── <name>.tool.ts     # Calls toolRegistry.register() at module level
├── providers/             # LLM provider wrappers
│   └── <name>.ts
├── registries/            # Agent, tool, and provider singletons
├── memory/                # Memory implementations + factory
└── utils/                 # Pure utility functions
tests/unit/
package.json
tsconfig.json
vitest.config.ts
```

Use **singleton registries** (`agentRegistry`, `toolRegistry`, `providerRegistry`)
so any module can self-register at import time. The entry point imports all
modules, triggering registration, then starts the runner.

---

## Step 2 - Validate environment variables

Create `.env.example`:

```env
# AI Configuration
AI_MODEL=gpt-4o
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7
AI_SYSTEM_PROMPT=You are a helpful assistant.

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

Create `src/config/env.ts` to validate at startup with zod:

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

Fail fast: validation runs at process start, never at first request.

---

## Step 3 - Implement a provider

A provider wraps an LLM API into a common interface. Example with OpenAI:

```ts
import OpenAI from "openai";
import type { LLMProvider, Message, LLMResponse } from "../types.js";
import { env } from "../config/env.js";

export const openaiProvider: LLMProvider = {
  async chat(messages, tools) {
    const client = new OpenAI();
    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      max_tokens: env.AI_MAX_TOKENS,
      temperature: env.AI_TEMPERATURE,
      messages,
      tools: tools?.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    });
    return { content: response.choices[0].message.content ?? "" };
  },
};
```

If you switch SDKs, you only rewrite this file and the type interface.

---

## Step 4 - Define a tool

Tools self-register at module level. Each file exports one tool and calls
`toolRegistry.register()` on import:

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
    // Calls your search backend or external API
    return { results: [] };
  },
};

toolRegistry.register(searchTool);
```

Follow the same pattern for every tool. Barrel files at `tools/index.ts`
import all modules so self-registration fires at startup.

---

## Step 5 - Create the entry point

```ts
import "./agents/index.js";
import "./tools/index.js";
import "./providers/index.js";
import { startRunner } from "./runner.js";
import { env } from "./config/env.js";

const logger = { info: console.log, error: console.error };

try {
  await startRunner();
  logger.info(`Agent started with model ${env.AI_MODEL}`);
} catch (err) {
  logger.error("Agent failed to start", err);
  process.exit(1);
}
```

The `startRunner` function is your project's own runner - it reads registered
agents from `agentRegistry`, selects one based on config, and enters the
LLM-request–tool-call loop. No external library is required for this loop.

---

## Step 6 - Set up seed data

Place configuration in `seed/data/agent-config.json`:

```json
{
  "model": "gpt-4o",
  "maxTokens": 4096,
  "temperature": 0.7,
  "systemPrompt": "You are a helpful assistant.",
  "tools": ["search", "calculate", "summarize"]
}
```

Create `seed/run-seed.ts` that writes a `.seed-complete` marker and is
idempotent (skips if marker exists).

---

## Step 7 - Write tests

### Unit tests for providers

Mock the LLM SDK directly:

```ts
import { describe, expect, it, vi } from "vitest";

// Mock the SDK your provider uses
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: "mocked response" } }],
  });
  return {
    default: vi.fn(() => ({
      chat: { completions: { create: mockCreate } },
    })),
  };
});

import { openaiProvider } from "../../src/providers/openai.js";

describe("openaiProvider", () => {
  it("returns a chat response", async () => {
    const result = await openaiProvider.chat([{ role: "user", content: "hello" }]);
    expect(result).toBeDefined();
    expect(result.content).toBe("mocked response");
  });
});
```

### Unit tests for tools

Test `execute` directly, without involving the registry:

```ts
import { describe, expect, it } from "vitest";
import { searchTool } from "../../src/tools/search.tool.js";

describe("searchTool", () => {
  it("returns results array", async () => {
    const result = await searchTool.execute({ query: "test", limit: 5 });
    expect(result).toHaveProperty("results");
  });
});
```

### Integration tests

Spin up the runner with a test provider (e.g. a mock that returns canned
responses) and verify that tool calls produce expected outputs.

Configure coverage thresholds in `vitest.config.ts` as defined in
[rule-devops-testing](../rule-devops-testing/SKILL.md).

---

## Production controls for LLM behavior

Treat prompts, tools, retrieval, and model configuration as production
interfaces. Before a user-facing launch:

- Define task-specific quality and safety criteria, including refusal and
  escalation behavior.
- Maintain a versioned golden set that covers normal, adversarial, and
  high-risk inputs; evaluate it before model, prompt, retrieval, or tool
  changes.
- Give tools the least privilege possible, validate tool arguments, and apply
  request, token, and cost limits.
- Capture model, prompt, retrieval, tool, latency, token, and outcome metadata
  without persisting sensitive prompt or completion content by default.
- Monitor quality drift with sampled human review and in-product feedback; set
  an owner and rollback path for regressions.

See [rule-devops-observability](../rule-devops-observability/SKILL.md)
for telemetry, alerting, and incident handling.

## Step 8 - Containerize

Use templates from [rule-devops-docker](../rule-devops-docker/SKILL.md):

- **`Dockerfile`** - Node.js runner template
- **`docker-compose.yml`** - Single service (or combined with dashboard)

| Setting         | Value                     |
| --------------- | ------------------------- |
| **Port**        | `3001`                    |
| **Entry**       | `dist/index.js`           |
| **Healthcheck** | Omit if no HTTP interface |

Edge cases:

- If the agent has no HTTP interface, remove `HEALTHCHECK` and set
  `CMD ["node", "dist/index.js"]`.
- If tools need API keys, add them to `.env.example` and validate in
  `src/config/env.ts`. Never hardcode secrets.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) - Project architecture wizard
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Test thresholds and coverage
- [rule-devops-docker](../rule-devops-docker/SKILL.md) - Dockerfile templates
- [rule-devops-observability](../rule-devops-observability/SKILL.md) - Production telemetry and alerting

---

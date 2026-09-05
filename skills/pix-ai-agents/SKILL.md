---
name: rule-ai-agents
description: >
  Scaffold and maintain AI Agent repositories built on @rule/rule-ai-core.
  Use when creating a new AI agent project, adding tools to an existing agent,
  configuring environment variables, writing tests, setting up seed data, or
  containerizing an agent service. Also covers choosing a retrieval layer:
  vector search, a code graph, or structured knowledge files.
tags:
  - "ai"
  - "agents"
frameworks: [node, agents]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# AI Agents app with rule-ai-core

## Core dependency

| Field          | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **Package**    | `@rule/rule-ai-core`                                           |
| **Repository** | `https://gitlab.palmabit.cloud/rule/rule-ai/rule-ai-core`       |
| **Install**    | `pnpm add @rule/rule-ai-core` (or `pnpm add @rule/rule-ai-core`) |

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
│   ├── providers/             # LLMProvider implementations using @rule/rule-ai-core
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

Create `src/server/src/providers/<name>.ts`. Each provider wraps `@rule/rule-ai-core` and implements the `LLMProvider` interface defined in `src/server/src/types.ts`:

```ts
import { createAgent } from "@rule/rule-ai-core";
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
import { AgentRunner } from "@rule/rule-ai-core";
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

Mock `@rule/rule-ai-core` to isolate provider and tool logic:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@rule/rule-ai-core", () => ({
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

## When a vector database is the wrong answer

Retrieval is three layers, not three competitors, and each one holds a different
kind of thing:

| Layer                      | Holds                                                                    | How it retrieves                       | What it costs when it breaks                         |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| Vector search              | Unstructured prose: tickets, threads, the long tail of docs              | Nearest neighbor, probabilistic        | Embedding drift, reindexing, a plausible wrong chunk |
| Code graph                 | What the code is: calls, imports, inheritance                            | Deterministic traversal of typed edges | Staleness between builds                             |
| Structured knowledge files | What the team knows: schemas, conventions, why a thing is built this way | Explicit links between documents       | Silent rot, because nothing fails a build            |

Pick by the failure you observed, never by the layer with the newest name.

**Chunking flattens hierarchy, and no embedding model fixes that.** If a cause
and its effect do not land in the same chunk, the index has no idea they are
related. Splitting text into fixed blocks is what destroys the relation, so a
better embedder, a larger context window and more careful prompting all leave it
exactly where it was.

**A graph is what you reach for when an answer needs several hops.** "What breaks
in the API layer if I change this migration" is a question about foreign keys,
interfaces and cross-file calls, and none of those were ever in vector space.
Parse them instead: a syntax-tree pass extracts `calls`, `imports` and `inherits`
with no model in the loop, so the structural layer costs no tokens and cannot
hallucinate an edge.

**A structured knowledge format is what you reach for when the code is fine and
the intent is missing.** The symptom is an agent writing valid code that violates
a convention, reaches for a deprecated internal API, or ignores a rule everyone
on the team knows and nobody wrote down. A parser cannot find business intent,
because it is not in the source. Plain Markdown with a little frontmatter, kept
in git and linked document to document, is enough: it reviews like code, diffs
like code, and an agent walks the links instead of guessing at a neighborhood.

### Where a vector database still wins

Similarity search is the right tool for a large, messy, mostly-prose corpus where
the question is fuzzy and the cost of a near-miss is low. Support archives,
historical threads, exploratory reading. What it should not be asked for is a
canonical fact: a metric definition, a tax identifier, a schema. Asking a
probabilistic index for the one true answer is a design error, not a tuning
problem.

Two numbers worth carrying, both vendor-reported and neither independently
reproduced. On a long-memory question-answering benchmark, graph-expanded
retrieval and a well-tuned vector pipeline scored the same accuracy on the same
model with the same token budget, and the graph was slightly behind on recall. On
a second benchmark the graph scored lower than the best memory system and cost
roughly an order of magnitude less to ingest. **The graph does not out-retrieve a
good vector pipeline. It costs less to build and it cannot invent an edge.** Sell
it on that, and treat any benchmark from the people shipping the tool as a
direction rather than a number.

### Before adding a layer

Most retrieval that disappoints is disappointing for ordinary reasons: bad chunk
boundaries, an index nobody rebuilt, an embedding model chosen by default. A
graph on top of a bad pipeline is the same bad pipeline with more operations.
Fix the retrieval you have, then add a layer against a named failure.

The two failures that justify one:

- **Several hops.** The answer requires linking facts that live in different
  files and were never adjacent in any chunk. Add the structural graph.
- **Scattered knowledge.** The rules exist only in chat logs, stale wikis and
  people's heads. Add the curated narrative layer.

And two ways the new layer betrays you:

- **A stale graph is worse than no graph**, because it answers confidently and
  wrongly. Rebuild it in a hook or in CI, not by remembering to.
- **A knowledge bundle with no schema and no validation degrades quietly.**
  Nothing errors when a link breaks or a document goes a year without a change,
  so make the update part of the change that caused it.

This server took that argument seriously: it routes with a lexical index and
reads code through a graph, and it runs no embedding model at all. The corpus is
small, the questions are specific, and a deterministic answer can be cached.

## Edge cases

- If the AgentRunner does not expose an HTTP interface, remove the `HEALTHCHECK` instruction from the Dockerfile and adjust `CMD` to `["node", "dist/index.js"]`.
- If tools require external API keys, add them to `.env.example` and validate them in `src/config/env.ts`. Never hardcode secrets.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher

---

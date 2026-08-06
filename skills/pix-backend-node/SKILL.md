---
name: rule-backend-node
description: >-
  Use when scaffolding a new Node.js backend repository. Covers Express + TypeScript structure, baseline config, tests, Docker, and CI files.
tags:
  - "backend"
  - "node"
frameworks: [node, api]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "2.0"
---

# Scaffolding Backend Node

## Project type

Create a backend-only repository for REST APIs and business logic services.
The generated project must be production-ready, typed, testable, and runnable locally and in CI.

## Required main libraries

Use these libraries unless explicitly overridden by user requirements:

- Runtime and API:
  - `express`
  - `cors`
  - `helmet`
- Validation and configuration:
  - `zod`
  - `dotenv`
- Logging:
  - `pino`
  - `pino-http`
- Tooling and DX:
  - `typescript`
  - `tsx`
  - `vitest`
  - `supertest`
  - `@biomejs/biome`

## Mandatory folder structure

Create and immediately populate all folders with real files:

```text
project-root/
├── scripts/
│   ├── create-agent.ts
│   └── create-tool.ts
├── src/
│   ├── agent-runner.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── types.ts
│   ├── agents/
│   │   ├── echo.agent.ts
│   │   └── openai-test.agent.ts
│   ├── common/
│   │   ├── error.ts
│   │   └── middleware/
│   │       └── error-handler.ts
│   ├── memory/
│   │   ├── in-memory.ts
│   │   └── index.ts
│   ├── providers/
│   │   ├── antigravity.ts
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   ├── windsurf.ts
│   │   └── index.ts
│   ├── registries/
│   │   ├── agent-registry.ts
│   │   ├── provider-registry.ts
│   │   └── tool-registry.ts
│   ├── tools/
│   │   └── current-time.tool.ts
│   └── utils/
│       └── zod-to-json-schema.ts
├── tests/
│   ├── agentRunner.test.ts
│   ├── memory.test.ts
│   └── registries.test.ts
├── initEnv.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Step-by-step scaffolding instructions

### Step 1 — Generate baseline configuration

Create:

- `package.json` with scripts aligned to `apps/backend` style:
  - `dev`, `build`, `type-check`, `new:agent`, `new:tool`
- `tsconfig.json`
- `.env.example` with runtime variables for providers and server startup
- `initEnv.ts` to validate and normalize env variables

### Step 2 — Generate Express bootstrap files

- `src/index.ts` must be the single backend entrypoint.
- Register JSON parser, auth middleware (if configured), and `cors`.
- Register API routes and global error middleware from `src/common/middleware/error-handler.ts`.

### Step 3 — Generate mandatory backend modules

- Generate all folders under `src/` listed in the mandatory structure.
- Ensure registries (`agent`, `provider`, `tool`) are implemented and wired in the runtime.
- Ensure `src/agent-runner.ts` executes provider + tool loop in a typed way.

Example (`src/index.ts` health route):

```ts
import express from "express";
import type { Request, Response } from "express";

const app = express();

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});
```

### Step 4 — Generate mandatory scripts and tests

- Create `scripts/` folder with `create-agent.ts` and `create-tool.ts` scripts copied from `assets/templates/scripts/` of this skill.
- `scripts/create-agent.ts` must generate new agent module files under `src/agents`.
- `scripts/create-tool.ts` must generate new tool module files under `src/tools`.
- Generate tests under `tests/` for runner, memory, and registries.

### Step 5 — Apply standards

- Testing guardrails: use `testing-standards` rule
- Type safety: use `typescript` rule
- Docker: use `docker-standards` and `docker` skills
- Docs: use `documentation` rule and `documentation` skill

### Step 6 — Finalize

- Generate `.gitlab-ci.yml` using `gitlab-ci` skill
- Run seed before first start
- Verify tests and build

### Step 7 — Final validation

- Verify backend starts with `pnpm run dev`
- Verify TypeScript build with `pnpm run build`
- Verify tests pass

## Quality gates

- Never generate empty files or empty directories.
- Never leave TODO placeholders.
- TypeScript strict mode must be enabled.
- `pnpm run build` must pass.
- Generated structure must stay aligned with `apps/backend`.

## Local-First Storage Patterns (from rule-backend)

### Pattern: Filesystem as Source of Truth

```javascript
// electron/helpers/_archive.js
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

const DATA_DIR = join(app.getPath("userData"), "data");

export function readCollection(name) {
  const path = join(DATA_DIR, `${name}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function writeCollection(name, data) {
  const path = join(DATA_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
}
```

### Pattern: IndexedDB in Renderer

```javascript
import { get, set, keys, del } from "idb-keyval";

await set("user-preferences", { theme: "dark" });
const prefs = await get("user-preferences");
```

| Storage        | Best for                  | Technology                           |
| -------------- | ------------------------- | ------------------------------------ |
| **IndexedDB**  | Browser/Electron renderer | idb-keyval, Dexie.js                 |
| **Filesystem** | Electron main process     | fs (JSON, SQLite via better-sqlite3) |
| **SQLite**     | Embedded local DB         | better-sqlite3, sql.js               |
| **DuckDB**     | Analytics / OLAP          | duckdb (in-process OLAP)             |

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) — Backend skill index
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) — Project configuration baseline
- [rule-devops-testing](../rule-devops-testing/SKILL.md) — Testing and coverage

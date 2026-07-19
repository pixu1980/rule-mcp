# rule AI Skills — Common

You are an AI coding assistant operating inside a rule repository. Follow every rule below without exception. When a rule references a detailed specification, read the corresponding file under `rules` or `skills` before proceeding.

## MCP server

This rule system is also available as an MCP server (`rule-mcp-rules`). If you have access to it, prefer calling `get_skill` and `get_rule` directly instead of reading files from disk. Load only the specific rule/skill needed for the current task.

## Identity

- You work on rule projects
- You never create a LICENSE file
- You never create `.github` directories or GitHub Actions workflows

## Available Rules

Load `common` rule first (this file). Load other rules only when needed:

| Rule | When to Load |
|---|---|
| `commits-branches` | **Load immediately** — Before any git operation, branch creation, or commit |
| `documentation` | **Load immediately** — When creating or updating README files |
| `typescript` | **Load immediately** — When writing TypeScript code, types, interfaces |
| `testing-standards` | When creating tests or configuring test coverage |
| `accessibility` | **Only if requested. Frontend only** — Load when the project has frontend components AND accessibility features are required |
| `i18n` | **Only if requested. Frontend only** — Load when the project has frontend components AND internationalization is needed |
| `expo` | **Only if requested.** — Load when working on Expo / React Native mobile projects |
| `api-security` | **Only if requested. Backend only** — Load when the project has backend components requiring API security |

### Rule descriptions

- **`commits-branches`** — Git conventions, branch naming prefixes (`feat/`, `fix/`, `refactor/`, etc.), Conventional Commits format for commit messages, merge request conventions
- **`documentation`** — Mandatory README sections (project name, architecture, prerequisites, quick start, workflow, seed policy, Docker, license), documentation policy, concrete copy-pasteable examples
- **`typescript`** — Enum patterns (prefer `as const` over enums), type safety rules (never use `any`, prefer `readonly`, use `satisfies`, discriminated unions)
- **`testing-standards`** — Testing guardrails, Vitest requirements, coverage thresholds (statements 60%, branches 50%, functions 60%, lines 60%)
- **`accessibility`** — WCAG 2.1 AA compliance, semantic HTML, ARIA, European Accessibility Act (EAA) requirements
- **`i18n`** — Internationalization patterns, translation keys, pluralization, RTL support, `Intl.*` APIs
- **`expo`** — Expo/React Native constraints: `npx expo install` for dependencies, managed workflow, dynamic `app.config.ts`, EAS Secrets, project structure conventions
- **`api-security`** — OAuth 2.0, JWT validation, rate limiting, CORS, HTTPS, API hardening

## Core principles

1. **Production-ready only** — Every generated file must contain real, working code. No placeholder TODOs, no lorem ipsum, no stub implementations. **Never create a directory without immediately populating it with files. Never create an empty file**
2. **Seed before run** — Every backend repository must have a seed mechanism that runs before the first application start

## When scaffolding a new repository

1. For new repositories, start from one dedicated scaffolding skill:
   - `scaffolding-backend-node`
   - `scaffolding-frontend-react-vite`
   - `scaffolding-ai-agents-app`
   - `scaffolding-expo-app`
2. Load `skills/rule-devops-testing/STANDARDS.md` when configuring tests

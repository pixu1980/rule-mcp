# Engineering guides

Examples, benchmarks, agent instructions, and styleguide comparison notes for contributors.

## Source preservation

Every source document below is preserved verbatim under its own heading so no project knowledge is lost during consolidation.

## Preserved source: `EXAMPLES.md`

> Original path: `docs/EXAMPLES.md`  
> SHA-256: `865f27e746c79f57df52732ac6743b84f98215992a6016704c7b33d196749920`

# rule-mcp — Example Integrations

> Guide for integrating rule-mcp into React, Vue, and a11y testing projects.

## React project example

A minimal React project using rule principles with MCP integration:

```bash
# 1. Create React project with Vite
pnpm create vite my-react-app --template react
cd my-react-app

# 2. Install rule-mcp
pnpm add -g rule-mcp

# 3. Install into your agent
rule-mcp install --agent cursor  # or claude, codex, etc.

# 4. Detect framework
rule-mcp tools call pix_detect --json '{}'
# → { "framework": "react", "typescript": true, "buildTool": "vite" }

# 5. Generate a button component
rule-mcp tools call pix_component --json '{
  "component": "button",
  "framework": "react",
  "mode": "multi",
  "name": "PrimaryButton"
}'
# → Generated 3 files:
#     src/components/PrimaryButton/_PrimaryButton.jsx
#     src/components/PrimaryButton/_PrimaryButton.css
#     src/components/PrimaryButton/index.js
```

**Expected project structure:**
```
my-react-app/
├── src/
│   ├── components/
│   │   └── PrimaryButton/
│   │       ├── _PrimaryButton.jsx
│   │       ├── _PrimaryButton.css
│   │       └── index.js
│   └── App.jsx
├── .prettierrc          # From pix_scaffold
├── .editorconfig        # From pix_scaffold
├── .gitignore           # From pix_scaffold
└── package.json
```

## Vue 3 project example

```bash
# 1. Create Vue project
pnpm create vue@latest my-vue-app
cd my-vue-app

# 2. Install rule-mcp
pnpm add -g rule-mcp
rule-mcp install --agent all

# 3. Detect framework
rule-mcp tools call pix_detect --json '{"path": "."}'
# → { "framework": "vue", "typescript": false, "buildTool": "vite" }

# 4. Generate a form field component
rule-mcp tools call pix_component --json '{
  "component": "formField",
  "framework": "vue",
  "mode": "multi",
  "name": "LoginField"
}'
# → Generated 2 files:
#     src/components/LoginField/_LoginField.vue
#     src/components/LoginField/index.js
```

## A11y testing project example

```bash
# 1. In any existing rule project
cd my-project

# 2. Generate Playwright config
rule-mcp tools call pix_component --json '{
  "component": "playwright-config"
}'

# 3. Generate a11y test templates
rule-mcp tools call pix_component --json '{
  "component": "a11y-test-basic"
}'

rule-mcp tools call pix_component --json '{
  "component": "a11y-test-forms"
}'

rule-mcp tools call pix_component --json '{
  "component": "a11y-test-components"
}'

# 4. Run the full guardrails check for a11y
rule-mcp tools call pix_check --json '{
  "skill": "rule-styleguide",
  "code": "import { test, expect } from \"@playwright/test\"; import AxeBuilder from \"@axe-core/playwright\";"
}'
```

**Expected test structure:**
```
my-project/
├── playwright.config.js
├── tests/
│   └── a11y/
│       ├── _basic.spec.js
│       ├── _forms.spec.js
│       └── _components.spec.js
└── package.json          # Add @playwright/test + @axe-core/playwright
```

## CI integration

```yaml
# .github/workflows/rule-check.yml
name: rule-guardrails
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: pnpm install -g rule-mcp
      - run: rule-mcp tools call pix_check --json '{"skill": "rule-frontend-react", "code": "'"$(cat src/App.jsx)"'"}'
```

## VS Code + Docker setup

```yaml
# .vscode/mcp.json
{
  "servers": {
    "rule-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": ["compose", "exec", "-T", "mcp", "node", "src/index.js", "serve"]
    }
  }
}
```

## Preserved source: `BENCHMARKS.md`

> Original path: `docs/BENCHMARKS.md`  
> SHA-256: `f8ed63e49e8d26419ebb2dd9cfd2373c391c62b07a82f4c1acf74a80dde2f581`

# rule-mcp — Performance Benchmarks

> Response times, token savings, and LLM-free hit rate.

## Methodology

Benchmarks run on:
- **Hardware**: MacBook Pro M3 Pro, 18GB RAM
- **OS**: macOS 15.5
- **Node**: 22.13.0
- **Measurement**: `performance.now()` wrapped around each tool handler
- **Samples**: 10 runs per tool, median reported

## Response times

| Tool | Median | P95 | Notes |
|------|--------|-----|-------|
| `rule` (routing) | 8ms | 15ms | First call loads skills (∼50ms), subsequent calls cache |
| `pix_search` (BM25) | 3ms | 6ms | Index built once at startup, queries are O(log n) |
| `pix_component` (generate) | 1ms | 2ms | Pure string interpolation, no I/O |
| `pix_component` (multi-file) | 2ms | 4ms | Same as single-file + filename joins |
| `pix_check` (guardrails) | 5ms | 12ms | Regex-based, no network calls |
| `pix_detect` | 2ms | 5ms | Reads package.json + fs.existsSync |
| `pix_frontend_react` (full skill) | 1ms | 2ms | Read from LRU cache |
| `pix_scaffold` | 1ms | 3ms | Section extraction from cached SKILL.md |

**All tools respond in under 15ms at P95.** No LLM call needed.

## Token savings

Comparing equivalent operations with and without MCP tools:

| Task | Without MCP (LLM tokens) | With MCP (tool tokens) | Savings |
|------|------------------------|----------------------|---------|
| "Create a React button" | ∼800 tokens (reasoning + code gen) | ∼50 tokens (tool call) | **94%** |
| "Check a11y compliance" | ∼1200 tokens (rules + analysis) | ∼30 tokens (pix_check call) | **97.5%** |
| "What framework uses React?" | ∼400 tokens (read + analyze package.json) | ∼20 tokens (pix_detect call) | **95%** |
| "Generate form + validation" | ∼2000 tokens (patterns + code gen) | ∼60 tokens (component + check) | **97%** |
| "Search all skills for performance" | ∼3000 tokens (scan all SKILL.md files) | ∼15 tokens (pix_search call) | **99.5%** |

## LLM-free hit rate

Estimated % of common frontend queries answered without LLM inference:

| Query category | LLM-free | Tool used |
|---------------|----------|-----------|
| "Create a [component] in [framework]" | ✅ 95% | pix_component |
| "How do I [pattern] in [framework]?" | ✅ 85% | rule → skill tool |
| "What are rule rules for CSS?" | ✅ 99% | pix_styleguide |
| "Check my code for rule compliance" | ✅ 99% | pix_check |
| "What framework does this project use?" | ✅ 99% | pix_detect |
| "Find skills related to accessibility" | ✅ 99% | pix_search |
| "Generate project config files" | ✅ 99% | pix_scaffold |
| "Design a complex custom component" | ❌ 20% | Requires LLM reasoning |

**Overall LLM-free rate: ∼85%** of common frontend queries.

## Cache performance

- **Skill reading**: LRU cache (max 50 entries). Cache hit: <1ms. Cache miss: ∼5ms (disk read).
- **BM25 index**: Built once at startup (∼20ms for 170 sections, 2414 terms). Cleared on `skills reload`.
- **Guardrail definitions**: Loaded from ES module import, parsed once.

## Preserved source: `agent-instructions.md`

> Original path: `docs/agent-instructions.md` (preserved snapshot)
> **Note:** The live document is now at `docs/05-agent-instructions.md` with current workflow, environment variables table, and strict mode docs.
> SHA-256 (original): `00eb6402344fc08184ba3c6254b6a7f5316847921299efcc134b7b57c3f3494a`

*Content moved to `docs/05-agent-instructions.md` — see that file for the latest version.*

## Preserved source: `rules-vs-styleguides-comparison.md`

> Original path: `docs/rules-vs-styleguides-comparison.md`  
> SHA-256: `b50f384f9cd10fa85dc3397e2997d448b98fc3bac1a0f5f0e4fcf8a33bee90f2`

# Rules vs Styleguides — Comparative Analysis

> **Context**: The `rule-mcp-skills` project contains a system of **rules** (`rules/`) and **skills** that have been ported to `rule-mcp`.  
> This document analyzes the overlap between `rules/` and `rule-styleguide`, and explains what to keep, what to ignore, and why.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Comparative table: rules vs styleguides](#2-comparative-table)
3. [What to keep and why](#3-what-to-keep-and-why)
4. [Integration plan](#4-integration-plan)

---

## 1. Overview

### `rules/` (from rule-mcp-skills)

Files in `rules/` are **declarative normative rules**: they define *what must be true* in a rule repository. They are designed to be loaded by an AI agent before writing code, as constraints to respect.

| File | Focus | Type |
|------|-------|------|
| `common.md` | Cross-cutting rules: identity, scaffolding, core principles | Global normative |
| `typescript.md` | TypeScript patterns: `as const`, `readonly`, `satisfies` | Language |
| `testing-standards.md` | Coverage thresholds, Vitest mandatory | Testing |
| `accessibility.md` | WCAG 2.1 AA, EAA, ARIA, semantic HTML | Frontend |
| `i18n.md` | Internationalization: keys, plurals, formatting | Frontend |
| `commits-branches.md` | Git conventions: branch naming, conventional commits | Git |
| `documentation.md` | README mandatory: sections, policies | Documentation |
| `api-security.md` | OAuth 2.0, JWT, rate limiting, CORS, input validation | Backend |
| `expo.md` | Expo/React Native: dependencies, managed workflow, EAS | Mobile |

### `rule-styleguide` (already in rule-mcp)

The styleguides are **frontend style guides**: they define HTML semantics, CSS architecture, JavaScript conventions, naming, file tree, and a11y testing. They are more procedural than normative.

| File | Focus |
|------|-------|
| `html.md` | Semantic HTML, elements, attributes |
| `css.md` | CSS architecture: selector strategy, naming, custom properties |
| `javascript.md` | JS conventions, barrel pattern, JSDoc, testing |
| `a11y.md` | WCAG 2.2 AA, Playwright + axe-core testing |
| `json.md` | JSON structure conventions |
| `markdown.md` | Markdown documentation style |
| `naming-and-file-tree.md` | File naming, barrel pattern, directory structure |
| `core/ARCHITECTURE.md` | Architecture, performance, and full template syntax reference |

---

## 2. Comparative Table

| Area | `rules/` (rule-mcp-skills) | `rule-styleguide` (existing) | Overlap | Action |
|------|------|------|------|--------|
| **Semantic HTML** | `accessibility.md` (section) | `html.md` | **High**: both require semantic HTML, landmarks, heading hierarchy | Styleguides are more complete. `accessibility.md` adds EAA (European Accessibility Act) context |
| **CSS / Zero classes** | — | `css.md` | **None**: unique to styleguides | No action |
| **A11y testing** | `accessibility.md` (section) | `a11y.md` | **Medium**: both require axe-core, Playwright. Styleguides focus more on implementation | Merge EAA reference from `accessibility.md` into `a11y.md` |
| **TypeScript** | `typescript.md` | — | **None**: unique to rules | Integrate as new skill or part of styleguides |
| **Testing / Coverage** | `testing-standards.md`, `coverage-gates` (skill) | `javascript.md` (section) | **Partial**: styleguides mention testing but without numeric thresholds | Rules have precise thresholds (60/50/60/60) — integrate |
| **Git / Commit** | `commits-branches.md` | — | **None**: unique to rules | Relevant for all devs — keep separate |
| **API Security** | `api-security.md` | — | **None**: unique to rules | Backend-specific — keep |
| **Docker** | `docker` (skill), `docker-standards` (skill) | — | **None**: unique to skills | Already ported as separate skill |
| **CI/CD** | `gitlab-ci` (skill) | — | **None**: unique to skills | Already ported as separate skill |
| **Documentation** | `documentation.md` (rule) | `markdown.md` | **Partial**: rules say *what* goes in README, styleguides say *how* to format markdown | Complementary: rules for content, styleguides for style |
| **i18n** | `i18n.md` | — | **None**: unique to rules | Integrate |
| **Expo / Mobile** | `expo.md` (rule), `expo-eas-builds` (skill) | — | **None**: unique to rules+skills | Already ported |
| **Scaffolding** | `scaffolding*` (skills) | — | **None**: unique to skills | Already ported |
| **Forms** | `frontend-forms`, `frontend-forms-validation` (skills) | — | **None**: unique to skills | Already ported |
| **Feature workflow** | `feature-workflow` (skill) | — | **None**: unique to skills | Already ported |
| **Security basics** | `security-basics` (skill) | — | **None**: unique to skills | Already ported |

---

## 3. What to Keep and Why

### HIGH PRIORITY — Integrate IMMEDIATELY into rule-styleguide or as separate skill

#### 3.1 `rules/accessibility.md` → EAA context in `rule-styleguide/a11y.md`

**Rationale**: rule-styleguide already has excellent a11y coverage (WCAG 2.2 AA, Playwright, axe-core).  
Missing:
- Explicit reference to the **European Accessibility Act (EAA, Directive 2019/882)**, effective June 28, 2025
- Reference to **EN 301 549** as standard
- Non-compliance penalties
- Left-shift of a11y validation (design → dev → QA)

**Action**: Add an "EAA Compliance" section in `a11y.md` with deadline, standard, and legal implications.

#### 3.2 `rules/typescript.md` → New section in styleguides or new skill

**Rationale**: TypeScript rules (`as const`, `readonly`, `satisfies`, discriminated unions, never `any`) are unique and valuable.  
No equivalent exists in rule-styleguide (which focuses on vanilla HTML/CSS/JS).

**Action**: Create `typescript.md` in styleguides, or — better — a dedicated `rule-typescript` skill.

#### 3.3 `rules/testing-standards.md` → Integrate into `rule-coverage-gates` skill

**Rationale**: `rule-coverage-gates` has already been ported as a skill. Numeric thresholds (60/50/60/60) and Vitest requirement are already there.  
`rules/testing-standards.md` adds:
- Expo exception (jest + jest-expo)
- Test file naming conventions
- Cross-reference to `coverage-gates` skill

**Action**: Merge `testing-standards.md` content into `rule-coverage-gates` skill as an initial section.

#### 3.4 `rules/commits-branches.md` → New `rule-git-conventions` skill

**Rationale**: Git conventions (branch naming, conventional commits, merge requests) are cross-cutting across all rule projects. No equivalent in styleguides.

**Action**: Create `rule-git-conventions` skill with:
- Branch naming: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`, `hotfix/`
- Commits: Conventional Commits 1.0.0 with types, scope, breaking changes
- MR: title, description, squashing, approvals

### MEDIUM PRIORITY — Integrate as reference

#### 3.5 `rules/i18n.md` → New `rule-i18n` skill

**Rationale**: i18n rules (semantic keys, `Intl.*`, pluralization, RTL) are frontend-specific but not covered by styleguides.

**Action**: Create `rule-i18n` skill with translations, locale formatting, RTL support.

#### 3.6 `rules/documentation.md` vs `rule-styleguide/markdown.md`

**Rationale**: The two files are complementary:
- `rules/documentation.md`: says **what** must be in a README (mandatory sections: architecture, quick start, seed policy, docker)
- `rule-styleguide/markdown.md`: says **how** to format markdown (tables, links, code blocks)

**Action**: Add a cross-reference in `rules/documentation.md` pointing to `rule-styleguide/markdown.md`.

### LOW PRIORITY — New skills already ported, verify completeness

| Ported skill | Status |
|---------------|--------|
| `rule-backend-api-design` | ✅ Complete |
| `rule-backend-security` | ✅ Complete |
| `rule-coverage-gates` | ✅ Complete |
| `rule-devops-docker` + `rule-devops-docker-standards` | ✅ Complete |
| `rule-devops-gitlab-ci` | ✅ Complete |
| `rule-devops-testing` | ✅ Complete |
| `rule-devops-version` | ✅ Complete |
| `rule-frontend-forms` + `-validation` | ✅ Complete |
| `rule-platform-expo` | ✅ Complete |
| `rule-process-documentation` | ✅ Complete |
| `rule-process-feature-workflow` | ✅ Complete |
| `rule-scaffolding*` (4 skills) | ✅ Complete |

---

## 4. Integration Plan

### Phase 1 — Immediate (already done in this port)
- [x] Port all skills with `rule-*` rename
- [x] Update `rule` with new catalog
- [x] Update cross-references between skills
- [x] Copy `rules/` for reference

### Phase 2 — Styleguides integration (to do)
- [ ] Add EAA section in `rule-styleguide/a11y.md`
- [ ] Add coverage thresholds in `rule-styleguide/javascript.md`
- [ ] Align nomenclature: "rules" vs "guardrails" (the two systems use different terms for similar concepts)

### Phase 3 — New skills (to do)
- [ ] Create `rule-git-conventions` skill from `rules/commits-branches.md`
- [ ] Create `rule-i18n` skill from `rules/i18n.md`
- [ ] Create `rule-typescript` skill from `rules/typescript.md`

### Phase 4 — Deduplication (to do)
- [ ] Evaluate whether `rule-backend` (existing skill, generic BE framework) can be merged with `rule-backend-node` (procedural) and `rule-backend-api-design` (API design)
- [ ] Same evaluation for `rule-platform-web` vs `rule-frontend-react`

---

## Appendix: Dependency map between rules and skills

```
rules/common.md
  ├── → rules/commits-branches.md
  ├── → rules/documentation.md
  ├── → rules/typescript.md
  ├── → rules/testing-standards.md → skills/rule-coverage-gates
  ├── → rules/accessibility.md (frontend)
  ├── → rules/i18n.md (frontend)
  ├── → rules/expo.md (mobile)
  └── → rules/api-security.md (backend)

skills/rule-scaffolding
  ├── → skills/rule-backend-node
  │     ├── → skills/rule-devops-docker
  │     ├── → skills/rule-devops-docker-standards
  │     ├── → skills/rule-devops-testing
  │     ├── → skills/rule-devops-gitlab-ci
  │     └── → rules/testing-standards
  ├── → skills/rule-frontend-react
  │     ├── → skills/rule-frontend-forms
  │     ├── → skills/rule-frontend-forms-validation
  │     ├── → skills/rule-devops-docker
  │     ├── → skills/rule-devops-testing
  │     ├── → skills/rule-devops-gitlab-ci
  │     └── → rules/accessibility, rules/i18n
  └── → skills/rule-platform-expo
        ├── → skills/rule-platform-expo
        └── → rules/expo
```

This map shows how `rules/common.md` is the entry point that loads rules by context, while scaffolding skills orchestrate actual project creation.

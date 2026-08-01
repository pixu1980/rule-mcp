# Tools and operations

MCP tools, plugins, release process, setup, and troubleshooting. This file is the operator handbook.

## Source preservation

Every source document below is preserved verbatim under its own heading so no project knowledge is lost during consolidation.

## Preserved source: `TOOLS.md`

> Original path: `docs/TOOLS.md`  
> SHA-256: `c4d991959a0938b689972cd69ddae6462d0985743ae1dbd3dbe879623c3dc8d1`

# rule-mcp — Tools Reference

> Complete reference for all MCP tools, resources, and prompts.
> Last updated: 2026-07-10

---

## Quick Reference

| Tool | Category | Description |
|------|----------|-------------|
| `pix_tool` | Router | Route a prompt to the correct rule skill |
| `rule_tool_search` | Search | Full-text BM25 search across ALL skills |
| `rule_tool_check` | Validation | Run guardrail checks on code |
| `rule_tool_scaffold` | Scaffold | Generate project config files |
| `rule_tool_detect` | Detection | Auto-detect project framework |
| `rule_tool_component` | Templates | Generate component/test templates |
| `rule_tool_process_adr` | ADR | Architecture Decision Records |
| `rule_tool_process_handoff` | Handoff | LLM context summary |
| `rule_tool_fix` | Fix | Validate and auto-fix file tree structure |
| | | |
| **UI Frameworks** | | |
| `rule_tool_frontend_vanilla_reactive` | Skill | Vanilla JS reactive pattern |
| `rule_tool_frontend_react` | Skill | React 18+ best practices |
| `rule_tool_frontend_vue` | Skill | Vue 3 Composition API |
| `rule_tool_frontend_svelte` | Skill | Svelte 5 runes |
| `rule_tool_frontend_angular` | Skill | Angular standalone components |
| `rule_tool_frontend_solidjs` | Skill | SolidJS fine-grained reactivity |
| | | |
| **Meta-Frameworks** | | |
| `rule_tool_frontend_astro` | Skill | Astro islands architecture |
| `rule_tool_frontend_meta_next` | Skill | Next.js App Router |
| `rule_tool_frontend_meta_nuxt` | Skill | Nuxt 3 best practices |
| `rule_tool_frontend_meta_remix` | Skill | Remix best practices |
| | | |
| **Project Types** | | |
| `rule_tool_platform_web` | Skill | Web platform best practices |
| `rule_tool_platform_desktop` | Skill | Desktop app patterns (Electron) |
| `rule_tool_platform_library` | Skill | Library authoring |
| `rule_tool_backend` | Skill | Backend/API best practices |
| | | |
| **Architecture** | | |
| `rule_tool_architect` | Skill | Enterprise architecture wizard & SDD workflow |
| `rule_tool_styleguide` | Skill | HTML, CSS, JS, a11y, naming, file tree |
| | | |
| **Scaffolding** | | |
| `rule_tool_backend_node` | Skill | Backend Node.js scaffold |
| `rule_tool_frontend_react` | Skill | Frontend React + Vite scaffold |
| `rule_tool_platform_agent` | Skill | AI Agents monorepo scaffold |
| `rule_tool_platform_expo` | Skill | Expo mobile scaffold |
| | | |
| **Engineering & DevOps** | | |
| `rule_tool_devops_docker` | Skill | Dockerfile + compose generation |
| `rule_tool_devops_docker` | Skill | Docker standards |
| `rule_tool_devops_gitlab_ci` | Skill | GitLab CI/CD pipelines |
| `rule_tool_devops_testing` | Skill | Vitest setup & test patterns |
| `rule_tool_devops_testing` | Skill | Coverage enforcement (60/50/60/60) |
| `rule_tool_devops_version` | Skill | Husky version auto-increment |
| | | |
| **Backend** | | |
| `rule_tool_backend_security` | Skill | Security hardening |
| `rule_tool_backend_api_design` | Skill | REST API design & OpenAPI |
| `rule_tool_platform_agent` | Skill | AI Agent structure and tools |
| | | |
| **Frontend** | | |
| `rule_tool_frontend_react` | Skill | React forms with validation |
| `rule_tool_styleguide_validation` | Skill | Business field validation |
| | | |
| **Mobile** | | |
| `rule_tool_platform_expo` | Skill | EAS Build & Expo CI/CD |
| | | |
| **Workflow** | | |
| `rule_tool_process_feature_workflow` | Skill | End-to-end feature workflow |
| `rule_tool_process_documentation` | Skill | Mintlify documentation setup |

### Modes common to all skill tools

Every skill tool (`rule_tool_frontend_react`, `rule_tool_devops_docker`, etc.) supports:

| Mode | Description | Token savings |
|------|-------------|---------------|
| `full` | Full SKILL.md content | — |
| `summary` | First 30 lines | ~70% |
| `tldr` | BM25-relevant sections for `query` | ~90-97% |
| `search` | Lines containing `query` (grep) | ~95% |
| `guardrails` | Only testable assertions | ~80% |
| `check` | Validate `code` against guardrails | — |

`rule_tool_styleguide` and `rule_tool_architect` add `scaffold`.  
`rule_tool_architect` also adds `interview` (context wizard server).

---

## 0. Mandatory preprocessing and postprocessing

All MCP tools execute inside fail-closed enforcement boundary.

### Before handler

- Zod schema validation.
- Maximum argument payload: 256 KiB.
- Maximum nesting: 12 levels; maximum object keys: 1000.
- Reject NUL controls, prototype-pollution keys, non-plain objects, blank `pix_tool` prompts.
- Normalize routing/search/path fields before deterministic handler receives them.
- Mandatory `addBeforeToolHook()` hooks are awaited; any exception blocks execution.

### After handler

- Mandatory `addPostToolHook()` hooks are awaited.
- Validate non-empty text-only MCP result and 1 MiB output limit.
- For `pix_tool`, parse routing JSON and reject unknown skills, unknown tools, or confidence outside `0..1`.
- Append visible `rule ENFORCEMENT CONTRACT` and `_meta.pixEnforcement` audit record.
- Only then fire non-blocking observational hooks such as auto-ADR.

### Blocking code validation

`rule_tool_check` and skill `mode=check` return `isError: true` while any guardrail fails. Added anti-hallucination rules:

- `no-placeholder-implementation`: reject TODO/FIXME/XXX, placeholder comments, not-implemented throws.
- `no-suppressed-errors`: reject `@ts-ignore`, lint suppression, empty catches.
- `verified-dependencies-only`: when manifest-derived `allowedDependencies` exists, reject invented imports.

## 1. Router: `pix_tool`

**Analyzes a user prompt and routes to the most relevant rule skill.**

Uses keyword scoring across all skill sections, with framework bias (×2 for detected framework, ×1.15 for general skills, ×0.85 for others).

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | ✅ | — | User's question about frontend development |
| `framework` | string | — | — | Framework hint (react, vue, svelte, angular, solid, astro, electron, vanilla) |
| `path` | string | — | — | Project path for auto-framework detection |

### Output (JSON)

```json
{
  "route": "rule-frontend-react",
  "confidence": 1,
  "sections": ["Component Architecture", "Props & State"],
  "next_tools": ["rule_tool_frontend_react", "rule_tool_check", "rule_tool_component"],
  "alternatives": [
    { "route": "rule-styleguide", "confidence": 0.6, "sections": ["CSS Architecture"] }
  ],
  "skills_available": ["rule-frontend-angular", "rule-frontend-react", "..."],
  "summary": "Top match: rule-frontend-react (100%). Relevant sections: Component Architecture..."
}
```

### Examples

```
rule prompt="I need a button component in React"
rule prompt="How do I style a modal with zero CSS classes?"
rule prompt="What's the best way to handle forms in Vue 3?"
rule prompt="Create a responsive navbar" framework=react
```

### Scoring logic

1. Tokenizes the prompt into keywords (filters ~120 stopwords)
2. For each skill, extracts `##` sections and scores them
3. Per-word score: 3× if in section heading, 1× in body, +2× in YAML description, +3× if skill base name matches
4. Framework bias: ×2 for matching framework skill, ×1.15 for styleguides/web/architect, ×0.85 for others
5. Normalizes: confidence = raw / maxRaw
6. Returns top 6 skills + relevant sections + suggested next_tools

---

## 2. Skill Tools: `pix_<framework>`

**One tool per rule skill.** Returns the full SKILL.md content or operates in specialized modes.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | enum | — | `full` | `full`, `summary`, `tldr`, `search`, `guardrails`, `check` (+ `scaffold` for styleguides/architect, + `interview` for architect) |
| `query` | string | — | — | Query for mode=search or mode=tldr |
| `code` | string | — | — | Code to validate (required for mode=check) |
| `framework` | string | — | — | Framework hint for mode=check |
| `fileName` | string | — | — | File name for naming convention checks |
| `isComponent` | boolean | — | — | Whether this is a component file |
| `file` | string | — | — | Specific scaffold file (mode=scaffold) |
| `target` | string | — | — | Project directory (architect interview) |

### Examples

```
# Full content
rule_tool_frontend_react mode=full

# TLDR: only relevant sections (BM25, 90%+ token savings)
rule_tool_frontend_vue mode=tldr query="reactive data"

# Internal search
rule_tool_frontend_angular mode=search query="standalone"

# Code validation
rule_tool_frontend_react mode=check code="..." fileName="_Button.jsx" isComponent=true

# Guardrails
rule_tool_frontend_svelte mode=guardrails

# Scaffolding (styleguides/architect only)
rule_tool_styleguide mode=scaffold file=.prettierrc

# Context wizard (architect only)
rule_tool_architect mode=interview target=./my-project
```

### Mode `tldr` — token savings

Uses BM25 to return ONLY sections matching the query, with snippets and scores. Saves 90-97% compared to `mode=full`.

```
rule_tool_frontend_react mode=tldr query="state management hooks"
# → Only "Component Architecture" and "Props & State" with snippets
# No Overview, Setup, Installation, License
```

### Special: rule_tool_architect interview mode

1. Call `rule_tool_architect mode=interview target=./my-project`
2. A local HTTP server opens at `http://localhost:19000`
3. Guides the user through 16 project specification steps (from Analysis Depth to Security & Compliance)
4. Generates `.context/` files with SDD specs
5. Stop the server with Ctrl+C

---

## 3. Search: `rule_tool_search`

**Full-text BM25 search across ALL rule skills.**

Indexes by `##` sections, returns ranked results with score, snippet, skill, and section.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | ✅ | — | Search query |
| `maxResults` | number | — | 10 | Max ranked results (1–100) |

### Output

```
# Search: "CSS data-part selectors"
Found 5 results across 3 skills
Index: 300 sections, 2400 unique terms, avg 150 terms/doc

### rule-styleguide → CSS Architecture (score: 8.234)
[data-part="..."] selectors are the only allowed styling hook...

### rule-frontend-react → Component Pattern (score: 5.112)
Components use data-part attributes instead of className...
```

### BM25 parameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| K1 | 1.2 | Term frequency saturation |
| B | 0.75 | Length normalization |
| MIN_TERM_LENGTH | 2 | Minimum indexed terms |
| STOPWORDS | ~120 | Filtered from index and query |

---

## 4. Validation: `rule_tool_check`

**Runs blocking guardrail checks on code against any rule skill.**

Supports smart iteration: pass `previousPassed` to skip already-verified guardrails.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `skill` | string | ✅ | — | Target skill (e.g. `rule-frontend-react`) |
| `code` | string | ✅ | — | Source code to validate |
| `fileName` | string | — | — | File name (enables naming convention checks) |
| `isComponent` | boolean | — | — | Whether this is a component file |
| `framework` | string | — | — | Framework override |
| `mode` | string | — | — | Check mode (e.g. `scaffold` for config files) |
| `previousPassed` | string[] | — | — | Guardrail IDs already passed — skip on re-check |
| `allowedDependencies` | string[] | — | — | Manifest-derived packages allowed in external imports; enables dependency hallucination check |

### Guardrails checked

**Shared (all skills):**
- `no-css-classes` — Zero CSS classes. Element + `[data-part]` selectors only
- `no-inline-styles` — Zero inline styles. No `style="..."`
- `semantic-html` — Semantic HTML. No `<div>` where semantic element exists
- `external-css` — External CSS (adoptedStyleSheets or framework-native import)
- `barrel-file-tree` — Barrel pattern: `index.js` re-exports
- `file-naming` — `_PascalCase.ext` for components
- `data-part-naming` — `data-part="role"` for child elements
- `jsdoc-required` — JSDoc on every exported symbol
- `css-comments-required` — CSS file header comments
- `a11y-test-required` — Playwright + axe-core a11y tests

**Framework-specific:**
- React: `react-no-classname`, `react-hooks-rules`
- Vue: `vue-no-class-binding`
- Angular: `angular-no-ngclass`
- Svelte: `svelte-no-class-directive`

**Scaffold (mode=scaffold):** verifies .prettierrc, .nvmrc, .editorconfig, .gitignore, .eslintrc.json, tsconfig.json, jsconfig.json

**Architect:** verifies .agents/, AGENTS.md, SDD specs, placeholders, CLI, workflow

### Smart iteration workflow

```
Step 1: rule_tool_check skill=rule-frontend-react code="..." fileName="_Btn.jsx" isComponent=true
        → Returns { passed: [...], failed: [...], previousPassed: ["no-css-classes", ...] }

Step 2: Fix failing code

Step 3: rule_tool_check skill=rule-frontend-react code="..." fileName="_Btn.jsx" isComponent=true
                  previousPassed=["no-css-classes", "no-inline-styles", "semantic-html", ...]
        → Skips 4 already-passed guardrails, runs only remaining ones
        → Returns only NEW failures

Repeat until allPass: true
```

---

## 5. Scaffold: `rule_tool_scaffold`

**Generates project scaffolding files (config templates).**

Reads templates from the `## Project Scaffolding` section of `rule-styleguide`.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | enum | — | `generate` | `generate` (create), `list` (list), `validate` (check presence) |
| `file` | string | — | — | Specific file to generate (omit for all) |
| `projectDir` | string | — | — | Project root (for mode=validate) |
| `framework` | string | — | — | Framework hint (tsconfig for TS projects) |

### Available files

| File | Description |
|------|-------------|
| `.prettierrc` | Prettier config (printWidth=120, tabWidth=2, semi=true, trailingComma=all, singleQuote=false) |
| `.nvmrc` | Node version (lts/*) |
| `.editorconfig` | Cross-IDE consistency (indent_size=2, charset=utf-8, end_of_line=lf) |
| `.gitignore` | OS + Node + build rules (.DS_Store, node_modules/, dist/, .env, coverage/) |
| `.eslintrc.json` | ESLint config (eslint:recommended, browser+es2024+node env) |
| `tsconfig.json` | TypeScript config (strict=true, target=ES2022, module=ESNext, moduleResolution=bundler) |
| `jsconfig.json` | JS config (checkJs=true, strict=true, target=ES2022) |

### Examples

```
# List files
rule_tool_scaffold mode=list

# Generate all files
rule_tool_scaffold mode=generate

# Generate a single file
rule_tool_scaffold mode=generate file=.prettierrc

# Validate existing project
rule_tool_scaffold mode=validate projectDir=./my-project
```

---

## 6. Detection: `rule_tool_detect`

**Auto-detects framework, TypeScript, and build tool from `package.json`.**

Reads `package.json` from the specified directory and matches dependencies against predefined rules.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | — | `.` | Project root directory |

### Output (JSON)

```json
{
  "projectName": "my-app",
  "framework": "react",
  "typescript": true,
  "buildTool": "vite",
  "nodeVersion": ">=20",
  "suggested_skills": ["rule-frontend-react"],
  "suggested_tools": ["rule_tool_frontend_react", "rule_tool_check", "rule_tool_scaffold", "rule_tool_component"],
  "message": "Detected react project \"my-app\". Use rule_tool_frontend_react, rule_tool_check..."
}
```

### Detection rules

| Framework | Dependency |
|-----------|------------|
| `angular` | `@angular/core` |
| `react` | `react` + `react-dom` |
| `vue` | `vue` |
| `svelte` | `svelte` |
| `solid` | `solid-js` |
| `astro` | `astro` |
| `electron` | `electron` |
| `vanilla` | (none of the above) |

TypeScript: detected via `tsconfig.json` or `typescript` in devDependencies.  
Build tool: vite, webpack, esbuild, angular-cli, sveltekit, next, nuxt, parcel, tsup, tsc.

---

## 7. Templates: `rule_tool_component`

**Generates component or test templates following rule principles.**

Supports single-file output (`mode=generate`), multi-file tree (`mode=multi`), and guardrails checklist (`mode=guardrails`).

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `component` | string | ✅ | — | Type: `button`, `card`, `modal`, `formField`, `list`, `nav`, `playwright-config`, `a11y-test-basic`, `a11y-test-forms`, `a11y-test-components` |
| `framework` | enum | — | `vanilla` | `vanilla`, `react`, `vue`, `svelte`, `angular`, `solid`, `astro` |
| `mode` | enum | — | `generate` | `generate` (single blob), `multi` (file tree), `guardrails` (checklist) |
| `name` | string | — | — | Component name for mode=multi (PascalCase) |

### Mode: `generate`

Returns a single code block.

```
# button - react

```jsx
export function Button({ label, kind = "primary", size = "md", onClick }) {
  return (
    <button data-part="button" data-kind={kind} data-size={size} onClick={onClick}>
      <span data-part="label">{label}</span>
    </button>
  );
}
```

### Mode: `multi`

Generates a complete file tree with variable interpolation (`{{ Name }}` → PascalCase, `{{ name }}` → kebab-case).

```
# Generated: button → react (3 files)

  src/components/PrimaryButton/_PrimaryButton.jsx
  src/components/PrimaryButton/_PrimaryButton.css
  src/components/PrimaryButton/index.js
```

**Structure per framework:**

| Framework | Files |
|-----------|-------|
| react, solid | `_Component.jsx` + `_Component.css` + `index.js` |
| vue | `_Component.vue` (SFC) + `index.js` |
| svelte | `_Component.svelte` + `index.js` |
| vanilla | `_Component.js` + `_Component.css` + `index.js` |

### Available components

| Component | vanilla | react | vue | svelte |
|-----------|---------|-------|-----|--------|
| `button` | ✅ | ✅ | ✅ | ✅ |
| `card` | ✅ | ✅ | ✅ | ✅ |
| `modal` | ✅ | ✅ | ✅ | ✅ |
| `formField` | ✅ | ✅ | ✅ | ✅ |
| `list` | ✅ | ✅ | ✅ | ✅ |
| `nav` | ✅ | ✅ | ✅ | ✅ |

Framework-agnostic templates: `playwright-config`, `a11y-test-basic`, `a11y-test-forms`, `a11y-test-components`

---

## 8. ADR: `rule_tool_process_adr`

**Saves an Architecture Decision Record in `docs/adr/`.** Auto-numbering, Nygard template, auto-index.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | ✅ | — | ADR title |
| `status` | enum | — | `accepted` | `proposed`, `accepted`, `deprecated`, `superseded` |
| `context` | string | — | — | Decision context |
| `decision` | string | — | — | Decision made |
| `consequences` | string | — | — | Positive and negative consequences |
| `alternatives` | string[] | — | — | Alternatives considered |
| `tags` | string[] | `["architecture"]` | Categorization tags |
| `projectDir` | string | `.` | Project root |

### Auto-ADR hooks

After every call to `rule_tool_architect`, `pix_tool`, `rule_tool_scaffold`, `rule_tool_detect`, the server automatically logs a summary ADR in `docs/adr/` with tool name, args, and timestamp. Fire-and-forget, non-blocking.

---

## 9. Handoff: `rule_tool_process_handoff`

**Generates an LLM context summary from ADR logs + `.context/` values.** The output is a text prompt that a new LLM session can use to resume work.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `projectDir` | string | — | `.` | Project root |
| `includeContext` | boolean | — | true | Include `.context/` values |
| `includeAdrs` | boolean | — | true | Include ADR summaries |
| `includeIdentity` | boolean | — | true | Include project identity |
| `compress` | boolean | — | false | Compress output |
| `maxTokens` | number | — | 0 | Token budget (0 = no limit) |
| `format` | enum | — | `full` | `full`, `brief`, `minimal` |

### Output formats

| Format | Tokens | Structure |
|--------|-------|-----------|
| `full` | ~140+ | ADR table + full context + instruction |
| `brief` | ~90 | One-line ADRs + truncated context + instruction |
| `minimal` | ~24 | Single-line JSON + essential instruction |

### Auto-downgrade

If `maxTokens` is > 0 and the current format exceeds the budget, the handoff auto-downgrades: `full → brief → minimal`.

---

## 10. File Tree Fix: `rule_tool_fix`

**Validates and auto-fixes project file tree structure** against rule conventions. Operates on disk — scans actual files and directories.

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | — | `.` | Project root directory |
| `srcDir` | string | — | `src` | Source directory relative to root |
| `mode` | enum | — | `lint` | `lint` (scan + report), `fix` (scan + auto-correct), `generate` (create component tree) |
| `dryRun` | boolean | — | `true` | Preview fixes without applying (mode=fix) |
| `name` | string | — | — | Component name for mode=generate |
| `framework` | enum | — | `vanilla` | Framework for mode=generate: `react`, `vue`, `svelte`, `vanilla` |
| `baseDir` | string | — | `src/components` | Base output directory for mode=generate |

### What lint checks

- **missing-barrel**: component folder has no `index.js` re-exporting
- **wrong-prefix**: component file doesn't start with `_` (e.g. `Button.jsx` → `_Button.jsx`)
- **empty-barrel**: `index.js` exists but has no `export` statements
- **bare-file**: component file outside a PascalCase folder (e.g. `src/Card.jsx`)
- **orphan-css**: CSS file with no matching component

### What fix auto-corrects

- Renames files: `Button.jsx` → `_Button.jsx`
- Creates missing `index.js` barrel with correct exports
- Populates empty barrels with re-export statements

### Guardrails (3 new)

These guardrails are automatically included in `rule_tool_check` for all frameworks:

| ID | Guardrail |
|----|-----------|
| `component-folder-barrel` | Every component folder must have an `index.js` with exports |
| `component-file-prefix` | Component files inside folders must be `_PascalCase.ext` |
| `barrel-exports-match-files` | Barrel exports must reference existing `_PascalCase` files |

### Example

```json
{
  "name": "rule_tool_fix",
  "arguments": { "mode": "lint", "path": "./my-project", "srcDir": "src" }
}
```

### CLI equivalent

```bash
# Lint only (scan + report)
rule-mcp fix

# Auto-fix (apply corrections)
rule-mcp fix --mode fix --no-dry-run

# Standalone script
node scripts/post-process.mjs --fix --no-dry-run
```

---

## MCP Resources (`rule://*`)

Resources accessible via the MCP `resources/read` protocol.

| URI | MIME | Description |
|-----|------|-------------|
| `rule://skills` | `application/json` | Index of all rule skills (path, length) |
| `rule://templates` | `application/json` | Component template catalog |
| `rule://project` | `application/json` | Current project analysis (framework + suggested tools) |
| `rule://community` | `application/json` | Community skill index (plugins) |
| `rule://ai` | `text/markdown` | Full rule skill content |
| `rule://a11y` | `text/markdown` | A11y testing guide (Playwright + axe-core) |
| `rule://a11y/test-basic` | `text/plain` | Basic a11y test template |
| `rule://a11y/test-forms` | `text/plain` | Form a11y test template |
| `rule://<skill-name>` | `text/markdown` | Full skill content (e.g. `rule://rule-frontend-react`) |
| `rule://<skill-name>/summary` | `text/markdown` | First 30 lines of a skill |

---

## MCP Prompts

Prompt templates accessible via the MCP `prompts/get` protocol.

| Name | Arguments | Description |
|------|-----------|-------------|
| `rule-setup-project` | `projectName` (req), `framework` (opt), `toolchain` (opt), `tier` (opt) | Bootstrap project: detect → scaffold → toolchain → architect context |
| `rule-new-feature` | `feature` (req), `framework` (opt), `area` (opt), `includeTests` (opt) | Feature end-to-end with TDD + a11y + commit scope |
| `rule-pull-request` | `description` (req), `framework` (opt), `updateAdr` (opt) | Prepare PR: review + a11y + security + ADR + commit scope |
| `rule-write-tests` | `scope` (req), `framework` (opt), `testType` (opt) | Write TDD + a11y (axe-core) + devops tests |
| `rule-handoff` | `mode` (req), `includeGitDiff` (opt), `compress` (opt) | Compressed context handoff for a new session |
| `rule-area-*` (16) | `request` (req) + area-specific optionals | One prompt per tool area (meta, frontend, backend, data, toolchain, styleguide, process, devops, platform, caveman, architect, grill, ai, skills, tdd, ui) |
| `rule-code-review` | `framework` (opt), `code` (req) | Review code against rule styleguides |
| `rule-generate-component` | `framework` (req), `component` (req), `features` (opt) | Generate component following rule principles |
| `rule-a11y-test` | `framework` (req), `component` (opt) | Generate Playwright + axe-core a11y tests |
| `rule-a11y-review` | `code` (req), `framework` (opt) | Review code for WCAG 2.2 AA compliance |
| `rule-architect-scaffold` | `projectName` (req), `framework` (opt), `tier` (opt) | Scaffold project with .agents/ + .context/ |

---

## Best Practices

### Workflow: Generate → Check → Fix → Re-check

```
1. rule_tool_detect path=.                             → Detect framework
2. pix_<framework> mode=full                     → Read the rules
3. rule_tool_component component=button framework=react → Get template
   mode=multi name=MyBtn
4. rule_tool_check skill=rule-frontend-react                 → Validate code
   code="..." fileName="_MyBtn.jsx" isComponent=true
5. Fix → Re-check with previousPassed:
   rule_tool_check skill=rule-frontend-react code="..."
   fileName="_MyBtn.jsx" isComponent=true
   previousPassed=["no-css-classes", "semantic-html", ...]
6. Repeat until allPass: true
```

### Search first, route second

```
# Instead of guessing the skill:
rule_tool_search query="CSS data-part selectors"
# → Ranked results from the correct skill
```

### Smart iteration

```
# On re-check, always pass previousPassed to skip already-verified guardrails:
previousPassed: ["no-css-classes", "no-inline-styles", "semantic-html",
                 "external-css", "file-naming", "data-part-naming", ...]
```

---

## Appendix: Framework → Skill → Tool

| Framework | Skill | MCP Tool |
|-----------|-------|----------|
| React | rule-frontend-react | `rule_tool_frontend_react` |
| Vue 3 | rule-frontend-vue | `rule_tool_frontend_vue` |
| Svelte 5 | rule-frontend-svelte | `rule_tool_frontend_svelte` |
| Angular | rule-frontend-angular | `rule_tool_frontend_angular` |
| SolidJS | rule-frontend-solidjs | `rule_tool_frontend_solidjs` |
| Astro | rule-frontend-astro | `rule_tool_frontend_astro` |
| Next.js | rule-frontend-meta-next | `rule_tool_frontend_meta_next` |
| Nuxt 3 | rule-frontend-meta-nuxt | `rule_tool_frontend_meta_nuxt` |
| Remix | rule-frontend-meta-remix | `rule_tool_frontend_meta_remix` |
| Desktop (Electron) | rule-platform-desktop | `rule_tool_platform_desktop` |
| Vanilla JS | rule-frontend-vanilla-reactive | `rule_tool_frontend_vanilla_reactive` |
| Web platform | rule-platform-web | `rule_tool_platform_web` |
| Library authoring | rule-platform-library | `rule_tool_platform_library` |
| Styleguides | rule-styleguide | `rule_tool_styleguide` |
| Architecture | rule-architect | `rule_tool_architect` |

## Preserved source: `PLUGINS.md`

> Original path: `docs/PLUGINS.md`  
> SHA-256: `d891cff9e5d94b939d4287c448a097c56676c17c469212b584110a121ca5c40d`

# rule-mcp — Plugin System

> Create custom rule skills without modifying the MCP server.

## Overview

Any directory in `~/.agents/skills/` with a `SKILL.md` file is auto-detected as a skill.
- **Official rule skills** start with `rule-` (e.g., `rule-frontend-react`, `rule-frontend-vue`)
- **Community/plugin skills** can use any name (e.g., `my-company-rules`)

Plugins are automatically registered as MCP tools (`pix_<plugin-name>`) and support
all standard skill tool modes: `full`, `summary`, `search`, `guardrails`, `check`.

## Creating a basic plugin

```bash
# 1. Create the plugin directory
mkdir -p ~/.agents/skills/my-custom-rules

# 2. Create SKILL.md
cat > ~/.agents/skills/my-custom-rules/SKILL.md << 'EOF'
---
name: my-custom-rules
description: Custom project rules
---

# my-custom-rules

## Rules

- Use 2-space indentation
- Max line length: 100 characters
EOF

# 3. Reload skills
rule-mcp skills reload

# 4. Your plugin is now available as:
rule-mcp tools call rule_tool_styleguide --json '{"mode": "full"}'
```

## Adding custom guardrails with plugin.js

For advanced plugins, create a `plugin.js` file in your plugin directory:

```javascript
// ~/.agents/skills/my-custom-rules/plugin.js
/**
 * @module my-custom-rules/plugin
 * Optional plugin.js for custom guardrails and generators.
 */

/** Custom guardrails to add to the rule_tool_check engine. */
export const guardrails = [
  {
    id: "custom-two-spaces",
    label: "2-space indentation",
    description: "Code must use 2-space indentation.",
    check: (code) => {
      const twoSpaceIndent = code.match(/^(\s{2})[^\s]/gm);
      return {
        pass: !twoSpaceIndent || twoSpaceIndent.length === 0,
        failCount: twoSpaceIndent?.length || 0,
        detail: twoSpaceIndent ? twoSpaceIndent.slice(0, 5) : [],
        suggestion: "Use 2-space indentation instead of 4.",
      };
    },
  },
];

/** Custom generators (future use). */
export const generators = {
  configFile: () => "// Custom config\n",
};
```

## Plugin directory structure

```
~/.agents/skills/
├── my-custom-rules/          ← Plugin name (any valid directory name)
│   ├── SKILL.md              ← Required: skill content (YAML frontmatter + markdown)
│   └── plugin.js             ← Optional: custom guardrails & generators
├── my-company-rules/
│   ├── SKILL.md
│   └── plugin.js
└── rule-frontend-react/                ← Official rule skills coexist
    └── SKILL.md
```

## How plugins are detected

1. On startup (or `skills reload`), the server scans `~/.agents/skills/` and `skills/` (embedded)
2. Any directory with a `SKILL.md` file is registered as a skill
3. If the directory also has `plugin.js`, it's dynamically imported
4. The plugin's guardrails are merged into the guardrails engine
5. The plugin is registered as an MCP tool: `pix_<plugin-name>`

## Community skills

The `rule://community` resource lists all installed plugins:

```bash
rule-mcp tools call rule --json '{"prompt": "List available community skills"}'
# Or directly via MCP resource:
# rule://community
```

## Best practices

- **Plugin names**: use `kebab-case` (e.g., `my-company-rules`)
- **SKILL.md**: include YAML frontmatter with `name` and `description`
- **Guardrail IDs**: prefix with your plugin name to avoid conflicts (e.g., `myco-two-spaces`)
- **Test your plugin**: run `rule_tool_check skill=<plugin-name>` to verify guardrails work

## Preserved source: `RELEASE.md`

> Original path: `docs/RELEASE.md`  
> SHA-256: `41361dd081e193d34e3005eb81e27066d9096ccd174dabd5493346337d80bed9`

# Release Procedure — rule-mcp

> Complete procedure for releasing rule-mcp in self-hosted mode.

---

## 1. Repository Setup

```bash
cd /Users/emilianopisu/Projects/ai/rule-mcp

# Initialize git
git init
git add -A
git commit -m "feat: initial release v0.1.0"

# Add remote
git remote add origin https://github.com/rule/rule-mcp

# Push
git branch -M main
git push -u origin main
```

---

## 2. Configure GitHub Secrets

Go to **GitHub → rule-mcp-rule-mcp → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `NPM_TOKEN` | npm access token (create at [npmjs.com](https://www.npmjs.com/settings/~/tokens) with type **Automation** and scope **publish**) |

`GITHUB_TOKEN` is automatic — no configuration needed.

---

## 3. Verify CI

After the first push to `main`, CI starts automatically:

- **Lint job**: syntax check + ESLint + Prettier
- **Test job**: 6 combinations (ubuntu × node20/22, macos × node20/22, windows × node20/22)
- **Audit job**: `pnpm audit --prod`

Check: **GitHub → Actions → ci**

---

## 4. First Release (v0.1.0)

Create a tag to trigger the release pipeline:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release pipeline (`.github/workflows/release.yml`) runs automatically:

| Step | Action |
|------|--------|
| ✅ npm publish | Publish to npmjs.com with provenance |
| ✅ Docker build | Multi-arch (linux/amd64 + linux/arm64) → `ghcr.io/rule/rule-mcp` |
| ✅ Homebrew formula | Generate `.rb` and attach to GitHub Release |
| ✅ GitHub Release | Create release with `.tgz` + assets |

---

## 5. Homebrew Tap Configuration

To enable `brew install rule/tap/rule-mcp`:

```bash
# Create the tap repo
# Go to https://github.com/new → create: rule-mcp-homebrew-tap

# Clone, copy the generated formula, push
git clone https://github.com/rule/homebrew-tap
cp rule-mcp.rb homebrew-tap/Formula/
cd homebrew-tap
git add Formula/rule-mcp.rb
git commit -m "feat: add rule-mcp v0.1.0"
git push
```

---

## 6. User Installation

Users can install using these methods:

| Method | Command |
|--------|---------|
| **pnpm/pnpm** | `pnpm add -g rule-mcp` |
| **pnpx** | `pnpx rule-mcp serve` |
| **Homebrew** | `brew install rule/tap/rule-mcp` |
| **Docker** | `docker pull ghcr.io/rule/rule-mcp` |
| **Winget** | `winget install rule.rule-mcp` |
| **Scoop** | `scoop bucket add rule-mcp && scoop install rule-mcp` |
| **GitHub Release** | Direct `.tgz` download |

### Agent command artifacts

`install --agent <name>` installs MCP config plus host-native reusable entry point where verified:

| Agent | Artifact | Invocation |
|-------|----------|------------|
| Pi | `~/.pi/agent/prompts/rule-mcp.md` | `/rule-mcp` |
| Claude Code | `~/.claude/commands/rule-mcp.md` | `/rule-mcp` |
| Gemini CLI | `~/.gemini/commands/rule-mcp.toml` | `/rule-mcp` |
| Cursor | `.cursor/commands/rule-mcp.md` | `/rule-mcp` |
| GitHub Copilot CLI | `~/.copilot/agents/rule-mcp.agent.md` | `/agent` selection |
| Codex CLI | `~/.agents/skills/rule/` | Skill workflow; no stable exact custom command assumed |

Uninstall removes same artifact. Universal command body forces routing, evidence lookup, test-first implementation, blocking `rule_tool_check`, real test reporting, and ADR capture.

---

## 7. Post-Release Verification

```bash
# Test pnpm
pnpm add -g rule-mcp
rule-mcp doctor
rule-mcp install --agent all

# Test Docker
docker pull ghcr.io/rule/rule-mcp
docker compose up -d
curl http://localhost:37999/health

# Test tools
rule-mcp tools list
rule-mcp tools call rule_tool_detect --json '{}'
rule-mcp tools call rule --json '{"prompt": "React button"}'
```

---

## 8. Subsequent Releases

```bash
# Bump version
pnpm version patch   # 0.1.0 → 0.1.1
# pnpm version minor  # 0.1.0 → 0.2.0
# pnpm version major  # 0.1.0 → 1.0.0

git push --follow-tags
```

The release pipeline triggers automatically on tag `v*.*.*`.

---

## Release Pipeline Architecture

```
Tag v0.2.0
    │
    ├─► publish-pnpm: pnpm publish --provenance
    │
    ├─► docker: buildx (amd64+arm64) → ghcr.io
    │
    ├─► homebrew: package.sh → formula .rb → release asset
    │
    └─► github-release: pnpm pack → .tgz → release assets
```

---

## Secrets / Tokens Summary

| Service | Required | Where to create |
|---------|----------|-----------------|
| **npm** | `NPM_TOKEN` (Automation) | [npmjs.com tokens](https://www.npmjs.com/settings/~/tokens) |
| **GitHub** | `GITHUB_TOKEN` (auto) | Already present — permissions: `contents: write`, `id-token: write`, `packages: write` (configured in `release.yml`) |
| **Docker GHCR** | None | Login via `GITHUB_TOKEN` — already configured via `docker/login-action@v3` |

Everything else is already configured in existing workflows:

- CI: `.github/workflows/ci.yml`
- Release: `.github/workflows/release.yml`
- Docker: `Dockerfile` + `docker-compose.yml`
- Winget: `.github/winget/rule-mcp.rule-mcp.yaml`
- Scoop: `.github/scoop/rule-mcp.json`
- Server manifest: `server.json`
- Changelog: `CHANGELOG.md`

## Preserved source: `TROUBLESHOOTING.md`

> Original path: `docs/TROUBLESHOOTING.md`  
> SHA-256: `666d843d4ba36d77182d0ee73863423c24b690a27c2cf3ce1eb37e0890c68d8b`

# rule-mcp — Troubleshooting

> Common issues and solutions per agent, plus debugging techniques.

## Quick diagnostics

```bash
# Run the health check
rule-mcp doctor

# List all available tools
rule-mcp tools list

# Test a specific tool
rule-mcp tools call rule --json '{"prompt": "test"}'

# Check daemon status
rule-mcp daemon status

# View daemon logs
rule-mcp daemon logs
```

## Agent-specific issues

### Claude (Claude Code / Claude Desktop)

**Issue**: Tool not found by Claude.
- **Fix**: Ensure `~/.claude.json` has the `rule-mcp` entry.
  ```bash
  rule-mcp install --agent claude
  ```
- **Verify**: The file should contain:
  ```json
  {
    "mcpServers": {
      "rule-mcp": {
        "command": "/path/to/node",
        "args": ["/path/to/bin/rule-mcp.js", "serve"]
      }
    }
  }
  ```

**Issue**: Claude says "Tool not available" after install.
- **Fix**: Restart Claude Code. MCP servers are loaded at startup.
- **Debug**: Check `~/.claude.log` for connection errors.

### Cursor

**Issue**: MCP server not connecting.
- **Fix**: Check `~/.cursor/mcp.json` exists and is valid JSON.
  ```bash
  rule-mcp install --agent cursor
  ```
- **Known limitation**: Cursor requires the MCP server to be available at IDE startup. If you install while Cursor is running, restart Cursor.

### VS Code

**Issue**: VS Code doesn't detect the MCP server.
- **Fix**: The config goes into `.vscode/mcp.json` in your project root.
  ```bash
  cd your-project
  rule-mcp install --agent vscode
  ```
- **Verify**: `.vscode/mcp.json` in your project root should contain:
  ```json
  {
    "servers": {
      "rule-mcp": {
        "type": "stdio",
        "command": "/path/to/node",
        "args": ["/path/to/bin/rule-mcp.js", "serve"]
      }
    }
  }
  ```

### GitHub Copilot

**Issue**: Copilot doesn't support custom MCP servers directly.
- **Fix**: Copilot uses a different integration path. Copy the instructions from:
  ```bash
  rule-mcp install --agent copilot --dry-run
  ```
  The generated instructions file explains how to configure Copilot.

### Pi (pi.dev)

**Issue**: pi doesn't auto-discover the MCP server.
- **Fix**: Ensure `~/.pi/agent/mcp.json` has the entry:
  ```bash
  rule-mcp install --agent pi
  ```

## Daemon mode

**Issue**: Daemon fails to start (port in use).
- **Fix**: Check if another instance is running:
  ```bash
  rule-mcp daemon status
  lsof -i :37999
  ```
- **Kill the existing process**:
  ```bash
  rule-mcp daemon stop
  # Or manually: kill $(cat ~/.local/share/rule-mcp/daemon.pid)
  ```

**Issue**: Daemon started but health check fails.
- **Debug**: Check the daemon log:
  ```bash
  cat ~/.local/share/rule-mcp/daemon.log
  ```

**Issue**: SSE connection drops.
- **Check**: The SSE endpoint should return `text/event-stream` content type:
  ```bash
  curl -N http://localhost:37999/sse
  ```
- **Expected**: You should see a `sessionId` event within 1 second.

## Docker

**Issue**: Docker container exits immediately.
- **Fix**: The container needs to be run with stdio mode for MCP agents. Use compose for SSE:
  ```bash
  docker compose up -d
  ```

**Issue**: Can't connect to Docker container.
- **Verify**: Health check should return 200:
  ```bash
  curl http://localhost:37999/health
  ```

## Skills

**Issue**: Skills not loading after update.
- **Fix**: Re-embed skills:
  ```bash
  rule-mcp skills reload
  ```

**Issue**: `pix_tool` returns no matching skill.
- **Verify**: Skills are loaded:
  ```bash
  rule-mcp tools list | grep rule-mcp
  ```
- **Try**: Use `rule_tool_search` for free-text search across all skills.

## General debugging

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `command not found: rule-mcp` | Not installed globally | `pnpm add -g rule-mcp` |
| `Cannot find module` | Node.js < 20 | Upgrade to Node.js 20+ |
| `ECONNREFUSED` on port 37999 | Daemon not running | `rule-mcp daemon start` |
| Tools return 0 results | Skills not loaded | `rule-mcp skills reload` |
| `ZodError` in tool output | Invalid arguments | Check tool schema with `rule-mcp tools list` |

## Preserved source: `rule-mcp-skills-mcp-setup.md`

> Original path: `docs/rule-mcp-skills-mcp-setup.md`  
> SHA-256: `4ed94562e3aed0fb1d0305ddeaf23d59b7470af515017e29676471526f7ecf63`

# rule AI Skills — MCP Server Setup

This document explains how to configure the `rule-mcp-skills` MCP server in your development environment so that any AI assistant (Windsurf Cascade, Claude Code, Claude Desktop) can access rule rules and skills from any repository.

---

## What the MCP server provides

Once configured, the AI assistant can call these tools directly without needing to open this repository:

| Tool | Description |
|---|---|
| `list_skills` | Lists all available rule skills |
| `get_skill` | Returns the full content of a skill (e.g. `scaffolding`, `docker`, `gitlab-ci`) |
| `get_skill_assets` | Returns all template files bundled with a skill |
| `list_rules` | Lists all available rule rule files |
| `get_rule` | Returns the full content of a rule (e.g. `common`, `typescript`, `documentation`) |

---

## Prerequisites

- Node.js >= 22 installed
- Access to the private GitLab Package Registry at `gitlab.palmabit.cloud`
- GitLab Personal Access Token with `read_api` scope

---

## Installation

### 1. Configure pnpm for GitLab Package Registry

Create or edit `~/.npmrc` to add authentication for the private registry:

```bash
echo "registry=https://gitlab.palmabit.cloud/api/v4/projects/PROJECT_ID/packages/npm/" >> ~/.npmrc
echo "//gitlab.palmabit.cloud/api/v4/projects/PROJECT_ID/packages/npm/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN" >> ~/.npmrc
```

Replace:
- `PROJECT_ID` with the actual GitLab project ID for `rule-mcp-skills`
- `YOUR_PERSONAL_ACCESS_TOKEN` with your GitLab Personal Access Token (with `read_api` scope)

**To get your Personal Access Token:**
1. Go to `https://gitlab.palmabit.cloud/-/user_settings/personal_access_tokens`
2. Create a new token with `read_api` scope
3. Copy the token and use it in the command above

**To find the project ID:**
1. Go to the project page: `https://github.com/rule/rule-mcp-skills`
2. The project ID is shown under the project name

### 2. Install the package globally

```bash
pnpm install -g rule-mcp-skills
```

The package will be installed in your global pnpm directory (typically `~/.pnpm-global/lib/node_modules/rule-mcp-skills` or similar).

---

## Configuration per AI assistant

### Windsurf Cascade

Edit the global MCP configuration file*:

```text
~/.codeium/windsurf/mcp_config.json
```

This is the only file that Windsurf reliably reads for MCP configuration. A project-level `.windsurf/mcp_config.json` may work in some versions or plans but is not guaranteed.

_*If using the [Windsurf JetBrains plugin](https://plugins.jetbrains.com/plugin/20540-windsurf-plugin-for-python-js-java-go--), the path is:_

```text
~/.codeium/mcp_config.json
```

After creating or editing the file, do **Cmd+Shift+P → Reload Window** in Windsurf.

**Recommended: Using pnpx (no global installation needed)**

```json
{
  "mcpServers": {
    "rule-mcp-skills": {
      "command": "pnpx",
      "args": ["-y", "rule-mcp-skills@latest"]
    }
  }
}
```

This method automatically downloads and runs the latest version from the GitLab Package Registry without requiring global installation.

**Alternative: Using global installation**

```json
{
  "mcpServers": {
    "rule-mcp-skills": {
      "command": "node",
      "args": ["/path/from/pnpm-root-g/rule-mcp-skills/dist/index.js"]
    }
  }
}
```

Replace `/path/from/pnpm-root-g` with the actual path returned by running `pnpm root -g` in your terminal (e.g., `/Users/username/.nvm/versions/node/v22.22.0/lib/node_modules`).

After saving, restart Windsurf or reload the MCP configuration from the settings panel.

### Claude Code (CLI)

Edit `~/.claude/mcp_servers.json`:

**Recommended: Using pnpx**

```json
{
  "rule-mcp-skills": {
    "command": "pnpx",
    "args": ["-y", "rule-mcp-skills@latest"]
  }
}
```

**Alternative: Using global installation**

```json
{
  "rule-mcp-skills": {
    "command": "node",
    "args": ["/path/from/pnpm-root-g/rule-mcp-skills/dist/index.js"]
  }
}
```

Replace `/path/from/pnpm-root-g` with the actual path returned by `pnpm root -g`.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Recommended: Using pnpx**

```json
{
  "mcpServers": {
    "rule-mcp-skills": {
      "command": "pnpx",
      "args": ["-y", "rule-mcp-skills@latest"]
    }
  }
}
```

**Alternative: Using global installation**

```json
{
  "mcpServers": {
    "rule-mcp-skills": {
      "command": "node",
      "args": ["/path/from/pnpm-root-g/rule-mcp-skills/dist/index.js"]
    }
  }
}
```

Replace `/path/from/pnpm-root-g` with the actual path returned by `pnpm root -g`.

Restart Claude Desktop after saving.

---

## Verification

Once configured, ask the AI assistant:

```
List all available rule skills.
```

The assistant should call the `list_skills` tool and return the full list of skills.

---

## Usage examples

### Scaffold a new repository

```
Create a new backend-node repository following all rule rules and skills.
```

The assistant should call one dedicated scaffolding skill:

- `get_skill("scaffolding-backend-node")`
- `get_skill("scaffolding-frontend-react-vite")`
- `get_skill("scaffolding-ai-agents-app")`
- `get_skill("scaffolding-expo-app")`

Then it should load only the additional `get_rule` / `get_skill` content required for that repository type.

### Add a feature

```
Add a new feature called "user-authentication" to this repository following the rule feature-workflow skill.
```

The assistant will call `get_skill("feature-workflow")` and follow the procedure.

### Check Docker standards

```
Generate a Dockerfile for this service following rule Docker standards.
```

The assistant will call `get_skill("docker")` and `get_skill("docker-standards")`.

### Scaffold an Expo app

```
Create a new expo-app repository following all rule rules and skills.
```

The assistant will call `get_skill("scaffolding-expo-app")`, then load `get_rule("expo")` and `get_skill("expo-eas-builds")` for EAS configuration and CI/CD.

### Configure EAS builds for an Expo project

```
Set up EAS Build profiles and GitLab CI pipeline for this Expo project.
```

The assistant will call `get_skill("expo-eas-builds")` and follow the procedure.

---

## Updating to a new version

When a new version of the package is published to the GitLab Package Registry:

```bash
pnpm update -g rule-mcp-skills
```

Restart your AI assistant after updating to load the new version.

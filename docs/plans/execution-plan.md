# Execution Plan - Pre-packaged MCP Prompts (workflow + areas)

Goal: extend the server's prompt registry (`src/prompts/index.js`) from 5 to **26 prompts**
that speed up developer work, with strict argument schema, styleguides invoked via tools,
baseline TDD/a11y always involved (or explicit request to the user), and closing with
**commit message proposal with mandatory scope**.

Interview decisions (2025-08-01):

1. One-shot workflow prompts **and** per-phase (start from high-value one-shots) - C
2. Coverage: **all** 16 areas (to be tested)
3. **One prompt per area** (`framework` argument where needed, not per-framework)
4. **Strict argument schema**
5. Styleguides invoked via tools; **TDD/a11y always involved or ask the user**
6. The workflow ends **proposing the commit message with scope**
7. Top 5: `rule-setup-project`, `rule-new-feature`, `rule-pull-request` (also updates ADR), `rule-write-tests`, `rule-handoff`
8. Delivery: plan → TDD → prompt registry → completions → validation

---

## Phase 1 - Failing tests (TDD)

- [x] 1. New `test/prompts.test.mjs`: registry structure (unique kebab-case names, strict argument schema, getPrompt non-null for every prompt) + expected coverage (5 workflow + 16 area + 5 existing) + content rules (commit+scope, TDD/a11y/test) → RED today (5 prompts, no rules)

## Phase 2 - Prompt registry (`src/prompts/index.js`)

- [x] 2. **5 one-shot workflows** (orchestrate the tools):
  - `rule-setup-project` (detect → scaffold → toolchain → architect context)
  - `rule-new-feature` (spec → feature_workflow → gateway → implement → check → test → commit scope)
  - `rule-pull-request` (review + a11y + security + **ADR update** + commit scope + PR description)
  - `rule-write-tests` (TDD + a11y tests + devops_testing)
  - `rule-handoff` (process_handoff + adr + compressed context)
- [x] 3. **16 area prompts**: `rule-area-{...}` - **with all 97 tools renamed `rule_tool_*`** (interview decision) to avoid collisions with prompts - each: route to the area skill, baseline TDD/a11y or ask the user, final commit scope
- [x] 4. **Update the 5 existing** (`rule-code-review`, `rule-generate-component`, `rule-a11y-test`, `rule-a11y-review`, `rule-mcp-architect`) to comply with the same rules (commit scope + baseline)

## Phase 3 - Completions (`src/server.js`)

- [x] 5. Argument completion for the new prompts (framework, area, testType, mode, tier…) - existing pattern

## Phase 4 - Docs

- [x] 6. README: prompts section updated with the 26 prompts
- [x] 7. CHANGELOG

## Phase 5 - Validation

- [x] 8. `node test/prompts.test.mjs` + `pnpm test:all` + smoke
- [x] 9. Add `test/prompts.test.mjs` to `test:all` and `ci` in package.json
- [x] 10. Verify bare naming (`/rule-setup-project`, `/rule-area-frontend`…) - no collision with tools

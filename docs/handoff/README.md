# Handoff: rule-mcp → deepseek-v4-flash

**From:** gpt-5.6-sol (Pi 0.80.6)  
**To:** deepseek-v4-flash  
**Date:** 2026-07-15  
**Repository:** `rule-mcp@1.0.0`, commit `4d9764b` baseline

---

## What was already done (phases 1-6, 7 commits)

All P0s and most P1s from the audit were resolved. **Do not redo these fixes.**

| Commit    | Phase   | What                                                                   |
| --------- | ------- | ---------------------------------------------------------------------- |
| `5a8e35f` | 1.1     | `rule_tool_fix` sandbox (dryRun, path traversal, custom element tag)    |
| `1f2338e` | 1.2-1.3 | SSE auth/CORS/body-limit, `previousPassed` removed                     |
| `9e89c42` | 2       | `prompts/get` MCP-compliant, completion `ref/prompt`                   |
| `47cd1aa` | 3       | Reproducible build/CI, LICENSE, metadata, Docker                       |
| `42e542b` | 4       | CSS/JSX guardrails, "advisory" terminology                             |
| `db0f40b` | 5       | Domain-aware router, multilingual, confidence, TLDR                    |
| `a1752fc` | A+B+C   | `rule_tool_gateway` + `rule_tool_apply` + backend/data/devops guardrails |
| `7042789` | 6       | React/Svelte templates compliant with guardrails                       |

## Getting started

```bash
cd /Users/emilianopisu/Projects/rule/rule-mcp
pnpm install
pnpm test  # smoke test, must pass
```

## Handoff documents per phase

Each file contains: context, specific fixes with code, verification commands, pitfalls.

| Phase | File                                             | Estimated time | Severity      |
| ----- | ------------------------------------------------ | -------------- | ------------- |
| 7     | [07-installer.md](07-installer.md)               | ~1 hour        | 🟠 P1         |
| 8     | [08-server-sse.md](08-server-sse.md)             | ~45 min        | 🟠 P1         |
| 9     | [09-architect-wizard.md](09-architect-wizard.md) | ~1.5 hours     | 🔴 P0         |
| 10    | [10-docs-maintenance.md](10-docs-maintenance.md) | ~1 hour        | 🟡 P2         |
| 11    | [11-claude-native.md](11-claude-native.md)       | ~2.5 hours     | 🟠 P1 / 🟢 P3 |

## Essential architecture

```
src/
├── server.js              ← MCP server bootstrap (stdio)
├── transport/sse.js       ← SSE HTTP server
├── tools/
│   ├── router.js          ← Tool registry (registerTool, listTools, callTool)
│   ├── ai.js              ← rule router (BM25 keyword scoring)
│   ├── skill.js           ← Skill-tool generator + rule_tool_check + rule_tool_search
│   ├── gateway.js         ← NEW: single-entry orchestrator
│   ├── apply.js           ← NEW: file writing with receipt
│   ├── adr.js             ← ADR auto-log (wildcard hook to disable)
│   ├── fix.js             ← File tree scan/fix/generate
│   └── handoff.js         ← Context handoff
├── core/
│   ├── skills.js          ← loadAllSkills() + strict mode flag
│   ├── guardrails.js      ← Guardrail engine (checkCode, getGuardrails)
│   ├── guardrail-defs.js  ← 18 shared + framework + backend + db + devops
│   ├── enforcement.js     ← Pre/post processing (advisory)
│   ├── bm25.js            ← BM25 search index
│   ├── detector.js        ← Project framework detection
│   ├── templates.js       ← Component template generation
│   └── template-data.js   ← Framework template strings
├── cli/
│   ├── commands.js        ← serve, daemon, install, doctor CLI
│   ├── install.js         ← Multi-agent installer (23 agents)
│   └── skills-install.js  ← Interactive skill installer
├── resources/index.js     ← rule:// MCP resources
└── prompts/index.js       ← MCP prompts
```

## Conventions

- **pnpm**, not npm
- **Node ≥20**, ESM (`"type": "module"`)
- **Test:** `pnpm test` (smoke), `pnpm run ci` (complete)
- **Auto-ADR disabled for tests:** `RULE_MCP_DISABLE_AUTO_ADR=1`
- **Strict mode:** `RULE_MCP_STRICT_MODE=1` (9 tools instead of 78)
- **Commit:** conventional commits (`feat/fix/docs/chore(scope): message`)

## Reference documents

- `docs/reports/gpt-5.6-sol-compliance-mega-review.md` - GPT-5.6 full audit
- `docs/reports/claude-compliance-mega-review.md` - Claude audit
- `docs/plans/execution-plan.md` - original plan with all phases
- `docs/plans/determinism-backend-guardrails.md` - gateway + backend guardrails plan

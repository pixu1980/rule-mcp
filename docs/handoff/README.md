# Handoff: rule-mcp → deepseek-v4-flash

**Da:** gpt-5.6-sol (Pi 0.80.6)  
**A:** deepseek-v4-flash  
**Data:** 2026-07-15  
**Repository:** `rule-mcp@1.0.0`, commit `4d9764b` baseline

---

## Cosa è già stato fatto (fasi 1-6, 7 commit)

Tutti i P0 e la maggior parte dei P1 dell'audit sono stati risolti. **Non rifare questi fix.**

| Commit | Fase | Cosa |
|---|---|---|
| `5a8e35f` | 1.1 | `rule_tool_fix` sandbox (dryRun, path traversal, custom element tag) |
| `1f2338e` | 1.2-1.3 | SSE auth/CORS/body-limit, `previousPassed` rimosso |
| `9e89c42` | 2 | `prompts/get` MCP-conforme, completion `ref/prompt` |
| `47cd1aa` | 3 | Build/CI riproducibili, LICENSE, metadata, Docker |
| `42e542b` | 4 | Guardrail CSS/JSX, terminologia "advisory" |
| `db0f40b` | 5 | Router domain-aware, multilingual, confidence, TLDR |
| `a1752fc` | A+B+C | `rule_tool_gateway` + `rule_tool_apply` + backend/data/devops guardrails |
| `7042789` | 6 | Template React/Svelte conformi ai guardrail |

## Setup per iniziare

```bash
cd /Users/emilianopisu/Projects/rule/rule-mcp
pnpm install
pnpm test  # smoke test, deve passare
```

## Documenti di handoff per fase

Ogni file contiene: contesto, fix specifici con codice, comandi di verifica, pitfalls.

| Fase | File | Tempo stimato | Severità |
|---|---|---|---|
| 7 | [07-installer.md](07-installer.md) | ~1 ora | 🟠 P1 |
| 8 | [08-server-sse.md](08-server-sse.md) | ~45 min | 🟠 P1 |
| 9 | [09-architect-wizard.md](09-architect-wizard.md) | ~1.5 ore | 🔴 P0 |
| 10 | [10-docs-maintenance.md](10-docs-maintenance.md) | ~1 ora | 🟡 P2 |
| 11 | [11-claude-native.md](11-claude-native.md) | ~2.5 ore | 🟠 P1 / 🟢 P3 |

## Architettura essenziale

```
src/
├── server.js              ← MCP server bootstrap (stdio)
├── transport/sse.js       ← SSE HTTP server
├── tools/
│   ├── router.js          ← Tool registry (registerTool, listTools, callTool)
│   ├── ai.js              ← Router rule (BM25 keyword scoring)
│   ├── skill.js           ← Skill-tool generator + rule_tool_check + rule_tool_search
│   ├── gateway.js         ← NEW: orchestratore single-entry
│   ├── apply.js           ← NEW: scrittura file con receipt
│   ├── adr.js             ← ADR auto-log (hook wildcard da disabilitare)
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
│   └── template-data.js   ← Template strings per framework
├── cli/
│   ├── commands.js        ← serve, daemon, install, doctor CLI
│   ├── install.js         ← Multi-agent installer (23 agenti)
│   └── skills-install.js  ← Skill installer interattivo
├── resources/index.js     ← rule:// MCP resources
└── prompts/index.js       ← MCP prompts
```

## Convenzioni

- **pnpm**, non npm
- **Node ≥20**, ESM (`"type": "module"`)
- **Test:** `pnpm test` (smoke), `pnpm run ci` (completo)
- **Auto-ADR disabilitato per test:** `RULE_MCP_DISABLE_AUTO_ADR=1`
- **Strict mode:** `RULE_MCP_STRICT_MODE=1` (9 tool anziché 78)
- **Commit:** conventional commits (`feat/fix/docs/chore(scope): message`)

## Documenti di riferimento

- `docs/reports/gpt-5.6-sol-compliance-mega-review.md` — audit completo GPT-5.6
- `docs/reports/claude-compliance-mega-review.md` — audit Claude
- `docs/plans/execution-plan.md` — piano originale con tutte le fasi
- `docs/plans/determinism-backend-guardrails.md` — piano gateway + backend guardrails

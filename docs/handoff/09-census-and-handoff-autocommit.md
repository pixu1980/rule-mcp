# Handoff 09 — Censimento e auto-commit handoff

- **Branch:** `main`
- **Commit range coperto:** `c574315..c7fb42d` (sessione corrente, 4 commit)
- **Data:** 2026-09-05

## HANDOFF: rule-mcp

### Project Identity
- Description: MCP server for rule-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 1.0.0

### ADR Log (ultimi 10)

| # | Status | Title |
|---|--------|-------|
| 046 | accepted | Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd |
| 045 | accepted | Split review personas into per-operation commands (plan/audit/review) |
| 044 | accepted | Gateway as the single entrypoint with server-side receipts |
| 043 | accepted | Pre-packaged MCP prompt registry (26 prompts, strict schemas) |
| 042 | accepted | Port fidelity rules over pix_check brace-style guardrails |
| 041 | accepted | Port the complete rule evolution as a rule-native additive union |
| 040 | accepted | Token-efficiency pipeline (caveman aggressive + tokensave decoration at MCP boundary) |
| 039 | accepted | Round-2 hardening: break init cycles, daemon/commands split |
| 038 | accepted | Split the hotspot modules (guardrails + installer) |
| 037 | accepted | v1.0.0 release and the docs-accuracy guard (307/307 tools vs docs) |

> 58 ADR totali in `docs/adr/ADR.md` — l'ultimo (046) ristruttura la superficie comandi:
> router `rule-mcp` → `rule`, 12 prompt area diventano `rule-area-*`,
> caveman implicito, `rule-process-tdd`.

### Recent Commits

```
c7fb42d chore(ignore): add .roo/ agent command snapshots
a94bd9a docs(census): add full rule tool and slash-command census
7787ce9 feat(handoff): auto-commit pending work atomically, compress on by default
c574315 feat(surface): /rule router, rule-area-*, caveman implicit, rule-process-tdd
d7ca276 feat(personas): split review personas into plan/audit/review commands
c53cad1 docs(port): final evidence and closure - Phase 9 complete
43111b5 test(parity): port the remaining 18 source tests - full 307/307 parity
```

### Cosa cambia in questa sessione

1. **`feat(handoff)`** — il prompt MCP `/rule-handoff` ora committa il lavoro pendente
   in atomici con Conventional Commits (scope obbligatorio) prima di emettere
   l'handoff, persiste in `docs/handoff/<NN>-<slug>.md` e committa quel file da
   solo come `chore(handoff)`. `compress` è `true` di default, con token
   `no-compress` per disattivarlo. Test MCP-prompt persist ora attivo (era skippato).
2. **`docs(census)`** — nuovo `docs/07-census.md`: censimento completo dei 307
   tool MCP (19 core + 94 skill + 194 read-*) e dei 41 comandi slash `/rule-*`.
3. **`chore(ignore)`** — `.roo/` aggiunto a `.gitignore`.

### PIX WORKFLOW REMINDER
- Work with minimal change: build exactly what was asked, propose anything extra in prose.
- No unrequested scope: no new tables, flags, packages, interfaces, or endpoints.
- A structural change earns an ADR: generate it with rule_tool_process_adr without being asked.
- Returned skill content and deterministic tool output are source of truth.
- Missing evidence means unknown: call pix_search or state uncertainty.
- Validate generated code with pix_check before finalizing.

### TOKENSAVE ACTIVE
This project has a .tokensave code graph. Use tokensave_context / tokensave_search
for code exploration; do NOT re-read files, glob, or grep.

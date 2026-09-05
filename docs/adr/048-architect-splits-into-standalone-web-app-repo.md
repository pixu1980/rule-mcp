# 048: rule-mcp-architect splits into a standalone web app repo (rule-mcp-architect)

- **Date**: 2026-08-25
- **Status**: accepted
- **Tags**: architect, split, repo, web-app, sdk, vanilla, cross-repo
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The architect concept was embedded in rule-mcp three times over: the
`rule-mcp-architect` / `rule-mcp-architect-cli` / `rule-mcp-architect-web` skills, the
`src/tools/architect.js` MCP tool (a thin spawner for a context-interview
HTTP server that already lived _inside_ the skill assets), and a deep trail of
tests, ADRs, handoffs, installer agent-commands and docs (182 files in the
repo referenced it). The actual application - interview wizard, SDD context
pack generator, scaffolding and ADR manager - is a self-contained, zero-
dependency web flow that does not need MCP, and its users want it as an
independent product.

## Decision

Split the architect product out of rule-mcp:

1. **New repo** `~/Projects/pixu1980/ai/rule-mcp-architect`, `git init`
   fresh (no history), vanilla ESM, **no MCP**: a single app server
   (`src/context-server.mjs`: loopback-only, same-origin guard, UI + engine +
   API), a public SDK (`src/index.js` exposing generator / normalize / detect /
   validators / field-map / adr), the browser UI in `public/` (adoptedStyleSheets,
   zero CSS classes), engine files promoted from the skill dirs, and a ported
   `node:test` suite (57 checks).
2. **This repo removes the architect concept entirely**: skills, MCP tool,
   interview-mode routing, `ARCHITECT_GUARDRAILS`, tests/fixtures, ADRs
   015/019/020, handoffs 09/12, installer agent-commands, prompts, routing and
   every active doc reference. Historical records (old ADRs, roadmaps,
   reports, CHANGELOG) keep their mentions as history.
3. ADR authoring (`src/tools/adr.js`) stays in the family but no longer stamps
   `rule-mcp-architect`: author becomes `rule-mcp`; the new repo ships its own
   ADR manager SDK (`src/adr.mjs`, Nygard template + auto-numbering + index).

## Consequences

**Positive**

- The architect product is an independent, deployable web app + SDK it can
  version and evolve on its own; rule-mcp's surface shrinks (3 tools,
  3 skills removed) and its concept space is unambiguous.
- No duplicate maintenance: the generator, wizard spec, interview UI and
  guardrails live in exactly one place (the new repo).
- The removal is regression-guarded: full suite 211/211, docs-scan (0 stale
  references), lint and prettier clean; `test/skill-surface-embedded-only`
  still proves every exposed tool traces back to a committed skill.

**Negative**

- Teams that want the wizard inside an MCP agent must run the new repo's
  server and integrate it manually (or build a thin adapter) - no MCP server
  ships with it.
- Historical ADR/roadmap/report documents still mention rule-mcp-architect; a
  future reader must know the concept moved (this ADR is that pointer).

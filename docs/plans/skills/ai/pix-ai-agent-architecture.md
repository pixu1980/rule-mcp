# rule-ai-agent-architecture - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#83`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: ai, leaf and the area's architectural centre. **205 lines**, one file, no
`guardrails/`, **no dispatcher row**, no `inherits:` (it had one until this
morning: a sentence that opened the Purpose by citing the retired
`rule-platform-agent`, removed with ADR 151). Siblings: `rule-ai-prompting`,
`rule-ai-evals`, `rule-ai-context-engineering`, `rule-ai`.

## Evidence base (measured 2026-10-21)

Sections: the model does not call your tool, the harness decides quality, a loop
until a graph earns it, MCP - what the protocol gives and leaves, tool surface
design, agents in the browser, judging an agent framework.

This leaf is where ADR 137's rules belong: every one of its eight is a statement
about agent code - the tool schema, the call timeout, the token cap, output
validation, secrets in a prompt, the generation span, eval presence, MCP token
validation. The decision of 2026-10-21 (ADR 153, P10) put them here rather than in
the router, so the leaf owns the floor and `rule-ai` stays a list. That is the same
model `rule-data` and `rule-backend` use, with the rules one level lower because
this is the leaf that describes the code they check.

## ADR 137's eight rules, owned here

| Tier | Rules |
| ---- | ----- |
| A | `ai-tool-schema`, `ai-call-timeout`, `ai-max-tokens`, `ai-output-validated`, `ai-no-secrets-in-prompt`, `ai-trace-span` |
| B | `ai-eval-presence`, `ai-mcp-token-validation` |

All eight ship advisory first and are promoted after the corpus gate reports full
precision and recall - ADR 137's own rule, kept as written.

## What this leaf adds on top of ADR 137

| Statement in the body | Rule |
| --------------------- | ---- |
| A degenerate loop is a design error, not a model error | `agent-loop-has-exit` |
| A graph earns its complexity only after a loop fails a measured case | `agent-loop-before-graph` |

Both are checks on the code the leaf describes, and both are the kind of claim a
reviewer argues about: the leaf's answer is in the body and the rule makes it
repeatable.

## The eleven rules

Eight from ADR 137 plus three of its own:

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `ai-tool-schema` | A tool declared without a schema the model can be held to | A | n/a |
| `ai-call-timeout` | A model call with no timeout | A | n/a |
| `ai-max-tokens` | A generation with no output cap | A | n/a |
| `ai-output-validated` | Model output used without validation against its schema | A | n/a |
| `ai-no-secrets-in-prompt` | A credential or key interpolated into a prompt | A | n/a |
| `ai-trace-span` | A generation with no span emitted | A | n/a |
| `ai-eval-presence` | An AI feature with no eval | B | n/a |
| `ai-mcp-token-validation` | An MCP server accepting a token it does not validate | B | n/a |
| `agent-loop-has-exit` | A loop or recursion with no iteration cap and no termination predicate | B | n/a |
| `agent-loop-before-graph` | A graph or multi-agent orchestration introduced with no measured failure of the simpler loop | B | n/a |
| `agent-owner-named` | A section delegating context, evals, telemetry or the tool surface without naming the owner | B | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-ai` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] Implement ADR 137 here: eight `ai-*` rules in
      `skills/rule-ai-agent-architecture/guardrails`, advisory first, each citing
      OWASP / MCP / OpenTelemetry where the ADR says so.
- [ ] ADR: the AI family shape, amending 137's placement (rules in the leaf, not
      in the router) and superseding its proposed status.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-agent-architecture/`: `clean/`, `tool-without-schema/`,
      `unbounded-generation/`, `unvalidated-output/`, `secret-in-prompt/`,
      `unbounded-loop/`, `graph-without-measurement/`, `unnamed-owner/`, each with
      a one-line `README.md`.
- [ ] Eleven `CORPUS` pairs bound to `rule-ai-agent-architecture`, eight of them
      for ADR 137's rules.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai-agent-architecture/guardrails/`: eleven rule files plus
      `index.js`.
- [ ] `guardrails:` frontmatter lists them all, equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - Door and neighbours

- [ ] `rule` dispatcher row.
- [ ] The browser-agent section points at `rule-platform-web` for the delivery
      contract, which owns it; the tool-surface argument stays here.
- [ ] The telemetry assumption in "judging an agent framework" links
      `rule-devops-observability`.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-ai-agent-architecture/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- "The harness is the product" is the single most useful sentence in the AI area,
  and the eight rules ADR 137 proposes are its operational form. Nothing here
  needs rewriting; it needs a floor.
- ADR 151 removed the scaffolding skill this leaf used to point at. The sentence
  was rewritten rather than left dangling, which is the tombstone rule working on
  prose rather than on a link.
- `agent-loop-has-exit` is the rule with the best false-positive story: every
  legitimate loop has an exit, so a hit is almost always a real unbounded loop.

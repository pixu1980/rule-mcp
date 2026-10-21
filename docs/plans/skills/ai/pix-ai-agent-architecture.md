# rule-ai-agent-architecture - plan

Status: plan only, 2026-10-21. Index row `#83`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: ai, leaf and the area's architectural centre. **205 lines**, one file, no
`guardrails/`, **no dispatcher row**, no `inherits:` (it had one until this
morning: a sentence that opened the Purpose by citing the retired
`rule-platform-agent`, removed with ADR 151). Siblings: `rule-ai-prompting`,
`rule-ai-evals`, `rule-ai-context-engineering`, `rule-ai`.

## Evidence base (measured 2026-10-21)

Sections: the model does not call your tool, the harness decides quality, a loop
until a graph earns it, MCP - what the protocol gives and leaves, tool surface
design, agents in the browser, judging an agent framework.

This leaf is where ADR 137's rules belong conceptually even though the ADR puts
them in the router: every one of its eight is a statement about agent code - the
tool schema, the call timeout, the token cap, output validation, secrets in a
prompt, the generation span, eval presence, MCP token validation. This plan
therefore treats ADR 137 as the leaf's floor and adds the two the ADR leaves out.

## What this leaf adds on top of ADR 137

| Statement in the body | Rule |
| --------------------- | ---- |
| A degenerate loop is a design error, not a model error | `agent-loop-has-exit` |
| A graph earns its complexity only after a loop fails a measured case | `agent-loop-before-graph` |

Both are checks on the code the leaf describes, and both are the kind of claim a
reviewer argues about: the leaf's answer is in the body and the rule makes it
repeatable.

## The three rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `agent-loop-has-exit` | A loop or recursion with no iteration cap and no termination predicate | B | n/a |
| `agent-loop-before-graph` | A graph or multi-agent orchestration introduced with no measured failure of the simpler loop | B | n/a |
| `agent-owner-named` | A section delegating context, evals, telemetry or the tool surface without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] Implement ADR 137: eight `ai-*` rules in `rule-ai/guardrails`, advisory
      first. This leaf inherits them and owns three more.
- [ ] Answer ADR 137's open question: children declare `inherits: [rule-ai]`.
- [ ] ADR: the AI family shape, superseding 137's proposed status.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-agent-architecture/`: `clean/`, `unbounded-loop/`,
      `graph-without-measurement/`, `unnamed-owner/`, each with a one-line
      `README.md`.
- [ ] Three `CORPUS` pairs bound to `rule-ai-agent-architecture`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai-agent-architecture/guardrails/`: three rule files plus
      `index.js`.
- [ ] `guardrails:` and `inherits: [rule-ai]` in the frontmatter.
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

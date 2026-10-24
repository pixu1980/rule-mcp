# Per-skill plan dependencies

Live ordering authority: [skills-plan.md](skills-plan.md).

One plan per skill, and an order to run them in that does not leave two people editing the same contract at the same time. The index is `docs/plans/skills/README.md`; this file says what must be true before a plan starts.

## The rule

A plan starts when the plans it points at are done. Nothing else gates it: the per-skill plans are independent by construction, which is why the order below is mostly alphabetical. The exceptions are the four edges in the graph, and they are the reason this file exists.

## Graph

```
rule-mcp-process-ai                    <- first: every other plan writes prose, scope and gates by its rules
  |
  +--> the 83 leaf plans          <- reverse alphabetical, area by area
  |                                  (84 plans: the catalog plus the planned mobile skill)
          |
          +--> the area router of that area   (rule-mcp-styleguide, rule-mcp-process, ...)
          |       |
          |       +--> nothing: a router is the last thing planned in its area
          |
          +--> every plan that ships a guardrail  (needs the corpus and the naming from the leaf)
```

## Edges

| From                  | To                             | Why                                                                                                                                                                                           |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule-mcp-process-ai` | every other plan               | It owns English, American spelling, ASCII punctuation, the prose rules and the scope contract. Every plan is a document, and its nine guardrails run on the artifacts the other plans produce |
| a leaf plan           | the router plan of its area    | A router table can only list children that exist and have a plan                                                                                                                              |
| a leaf plan           | any plan that adds a guardrail | A new rule needs the corpus naming and the family the leaf established                                                                                                                        |
| every leaf of an area | the next area                  | Not a dependency, an ordering: an area is finished before the next begins so its router can be written against a stable set                                                                   |

## Execution order

1. **`rule-mcp-process-ai`** - merged, renamed and applied. Everything after it inherits its rules.
2. **The 83 leaves plus the one planned leaf** (84 plans), area by area in this order: ui, toolchain, styleguide, process, platform, meta, frontend, devops, data, backend, ai. Inside an area, reverse alphabetical, which is the order the index already carries.
3. **The area routers**, each after its own children: `rule-mcp-styleguide`, `rule-mcp-process`, `rule-mcp-toolchain`, `rule-mcp-ui`, `rule-mcp-platform`, `rule-mcp-meta`, `rule-mcp-frontend`, `rule-mcp-devops`, `rule-mcp-data`, `rule-mcp-backend`, `rule-mcp-ai`.

## What is not a dependency

- The `oss`, `execution-plan` and `*-guardrails` plans at `docs/plans/` are area plans, not skill plans. They read the same corpus but they do not edit skill text, so they can run alongside any step above.
- The `decision-models` track (audit, review, plan, probe harness) lives here since the fold retired `feat/decision-models`. It re-measures the routing corpus after skill text settles, so it is not a skill-plan edge on this branch.
- A plan with no graph edge to another is genuinely independent: the graph shows every edge that exists, so an absent edge is an absent dependency and not an omission.

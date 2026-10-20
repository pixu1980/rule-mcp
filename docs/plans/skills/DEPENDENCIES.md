# Per-skill plan dependencies

One plan per skill, and an order to run them in that does not leave two people editing the same contract at the same time. The index is `docs/plans/skills/README.md`; this file says what must be true before a plan starts.

## The rule

A plan starts when the plans it points at are done. Nothing else gates it: the per-skill plans are independent by construction, which is why the order below is mostly alphabetical. The exceptions are the four edges in the graph, and they are the reason this file exists.

## Graph

```
rule-process-ai                    <- first: every other plan writes prose, scope and gates by its rules
  |
  +--> the 83 leaf plans          <- reverse alphabetical, area by area
  |       |
  |       +--> the area router of that area   (rule-styleguide, rule-process, ...)
  |       |       |
  |       |       +--> nothing: a router is the last thing planned in its area
  |       |
  |       +--> every plan that ships a guardrail  (needs the corpus and the naming from the leaf)
  |
  +--> decision-models            <- touches the ranker, so it runs after the routing-facing work
```

## Edges

| From                  | To                             | Why                                                                                                                                                                                           |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule-process-ai`      | every other plan               | It owns English, American spelling, ASCII punctuation, the prose rules and the scope contract. Every plan is a document, and its nine guardrails run on the artifacts the other plans produce |
| a leaf plan           | the router plan of its area    | A router table can only list children that exist and have a plan                                                                                                                              |
| a leaf plan           | any plan that adds a guardrail | A new rule needs the corpus naming and the family the leaf established                                                                                                                        |
| `rule-process-ai`      | `decision-models`              | The ranker is measured on skill text; the merged skill changed the text the corpus reads, so the corpus must be re-measured first                                                             |
| every leaf of an area | the next area                  | Not a dependency, an ordering: an area is finished before the next begins so its router can be written against a stable set                                                                   |

## Execution order

1. **`rule-process-ai`** - merged, renamed and applied. Everything after it inherits its rules.
2. **The 83 leaves**, area by area in this order: ui, toolchain, styleguide, process, platform, meta, frontend, devops, data, backend, ai. Inside an area, reverse alphabetical, which is the order the index already carries.
3. **The area routers**, each after its own children: `rule-styleguide`, `rule-process`, `rule-toolchain`, `rule-ui`, `rule-platform`, `rule-meta`, `rule-frontend`, `rule-devops`, `rule-data`, `rule-backend`, `rule-ai`.
4. **`decision-models`**, because it re-measures the routing corpus that the steps above keep changing.

## What is not a dependency

- The `oss`, `execution-plan` and `*-guardrails` plans at `docs/plans/` are area plans, not skill plans. They read the same corpus but they do not edit skill text, so they can run alongside any step above.
- A plan with no graph edge to another is genuinely independent: the graph shows every edge that exists, so an absent edge is an absent dependency and not an omission.

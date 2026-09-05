# Engineering guides

## The token budget

`tools/list` is the only output paid on every model turn, before the model has
decided to do anything. A skill file costs tokens when someone loads it; a tool
schema costs them always.

`scripts/tool-surface-report.mjs` measures it and
`test/tool-surface-budget.test.mjs` guards the number against the budget in
`src/core/tool-budget.js`. Raising that budget is a deliberate act with its
reasoning recorded beside it: every future turn of every user gets more
expensive.

Three levers reduce what reaches the model, and they compose:

| Lever                   | Effect                                                  |
| ----------------------- | ------------------------------------------------------- |
| Routing                 | Returns matching sections instead of a whole skill file |
| `mode=tldr`             | Only the sections a named query ranks for               |
| Result cache            | An identical call replays instead of recomputing        |
| Caveman and fingerprint | Filler removed from prose; code and JSON untouched      |

`rule-mcp stats` reports what those measurably saved, with the routing
estimate kept separate because it models a read that did not happen.

The result cache has a shared half. `cache stats` says what is stored, which
tier answers and which areas still recompute; `cache verify` recomputes every
entry and reports what no longer reproduces; `cache export` promotes the calls
reused at least three times, checks each still reproduces, and writes
`rule-catalog.json` for a person to read and commit. A committed catalog
loads under the local cache at startup, so a teammate inherits answers this
project already agreed on without them ever outranking what their own machine
computed.

## Measured response times

Measured on this repository with the result cache disabled, so every number is
a full computation rather than a replay. Eleven runs per tool, median and
slowest reported. Apple silicon, Node 24.

| Tool                            | Median  | Slowest |
| ------------------------------- | ------- | ------- |
| `rule` (routing)             | 14.4 ms | 28.1 ms |
| `pix_gateway`               | 13.0 ms | 14.9 ms |
| `pix_frontend_react` (full) | 3.4 ms  | 4.3 ms  |
| `pix_search`                | 1.3 ms  | 2.6 ms  |
| `pix_detect`                | 1.0 ms  | 1.4 ms  |
| `pix_frontend_react` (tldr) | 0.9 ms  | 1.4 ms  |
| `pix_check`                 | 0.7 ms  | 5.4 ms  |
| `pix_component`             | 0.6 ms  | 2.0 ms  |

Loading all 88 skills takes about 40 ms, once per process.

Routing is the slowest because it scores the query against every skill. With
the cache on, a repeated call is served in under a millisecond, and a warm
gateway call is around 0.8 ms.

**No tool calls a model.** The times above are the whole cost.

## Worked example: a React component

```bash
pnpm create vite@latest my-app -- --template react
cd my-app
pnpm add -D rule-mcp
pnpm exec rule-mcp install --agent claude
```

Then, from the agent:

```
pix_detect path="."
→ { "framework": "react", "typescript": false, "buildTool": "vite" }

pix_gateway prompt="a primary button with a loading state" framework="react"
→ routes to rule-frontend-react, returns the sections that answer it,
  and a receipt if code was passed and passed the guardrails

pix_component component="button" framework="react" name="PrimaryButton"
→ src/components/PrimaryButton/_PrimaryButton.jsx
  src/components/PrimaryButton/_PrimaryButton.css
  src/components/PrimaryButton/index.js
```

The generated files follow the conventions the guardrails enforce: no CSS
classes, no inline styles, semantic HTML, styles in an external sheet.

## Worked example: validating before writing

```
pix_gateway prompt="..." files=[{ path: "src/x.js", content: "..." }]
→ ✅ All 59 guardrails pass
  Receipt: <token> (valid 5 min)

pix_apply files=[...] receipt="<token>" path="/abs/project"
→ written
```

`pix_apply` refuses without the receipt, and the receipt is bound to those
exact paths and contents. Changing either invalidates it.

## Contributing

**Tests come before the implementation.** The suite is `pnpm run ci`: lint
first, then everything else. A new rule arrives with a test that fails on the
current code and passes on the new, and the failure is worth seeing rather than
assuming.

**A number decides a performance change.** Measure before optimizing. Two
phases in this project optimized the wrong thing because nobody measured which
part was heavy first.

**Structural decisions get an ADR.** `rule-mcp adr new "<title>"` writes
it and regenerates the index. The ADR log is the only place history belongs;
comments and documents describe what is true now.

**Commits are conventional and scoped.** `type(scope): subject`, enforced by
the `commit-msg` hook.

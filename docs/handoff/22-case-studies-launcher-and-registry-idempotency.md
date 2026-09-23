## HANDOFF: rule-mcp

- Branch: `main`
- Commit range: `47490808..9c8f8a13`
- Date: 2026-09-23
- File: `docs/handoff/22-case-studies-launcher-and-registry-idempotency.md`

### Project Identity

- Description: MCP server for rule-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 0.2.0-rc

### Shipped this session

**One command starts the six case-study apps (ADR 123).** The three bookmarks web apps and three phonebook Electron apps each hardcoded dev ports, and the Electron mains hardcoded their renderer URL, so six terminals collided. `pnpm case-studies` (`scripts/case-studies/index.mjs`) allocates one Vite port and one API port per app from per-app bases, exports them as `VITE_PORT`, `PORT`, `VITE_API_ORIGIN`, `VITE_API_URL`, CORS origins and `ELECTRON_RENDERER_URL`, starts the six in parallel with app-prefixed logs, and kills every process group on Ctrl-C. The apps read their ports from the environment and keep the old defaults for standalone runs. `phonebook-ds4-flash` gained `electron/package.json` with `"type": "commonjs"` so its CommonJS main loads despite the app's `type: module`. `case-studies/**` is now tracked (six apps plus the two benchmark reports).

**Tool registration is idempotent by name.** The core tools are registered from two entry points in one process (the CLI `preAction` hook and `startServer`), so a blind push advertised `rule_tool_gateway` and `rule_tool_apply` twice and every MCP client had to dedupe them. `registerTool` now replaces an existing name in place, preserving registry order, and `resetTools` owns the generation bump. The registry state moved to `src/tools/router/_registry.js`; `src/tools/router/_hooks.js` re-exports its public surface. New test `src/tools/router/__tests__/_registry-idempotency.test.mjs` covers duplicate-name, order and `bootstrapCoreTools`. Verified: 3/3 pass under `node --import ./scripts/alias-hook.mjs --test`.

**Generated docs refreshed.** ADR 123 recorded and indexed; `docs/02-architecture.md` decision count 122 → 123; `tests/fixtures/census.json` hash regenerated; `site-dist/index.html` rebuilt to the live surface (107 tools, 37 prompts, 40 slash commands).

Surface unchanged this session: 107 tools, 40 commands, 37 prompts, 89 skills.

### ADR Log

| #   | Status   | Title                                                              | Tags                              | Decision                                                                                                                    |
| --- | -------- | ------------------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 123 | accepted | Start the six case-study apps with one port-allocating command      | tooling, case-studies, dev-server | `pnpm case-studies` allocates ports per app, exports them as env vars, starts six in parallel, kills all on Ctrl-C.        |
| 122 | accepted | The fix tool and command apply the deterministic guardrails...      | tools, commands, guardrails       | `rule_tool_fix` applies the deterministic guardrail fixes; `/rule-fix` mirrors it.                                            |
| 121 | accepted | The install reconciles the bundled skills when the step is not...   | installer, skills, commands       | Declining the skills step removes what an earlier install copied; `skills uninstall` is a real action.                      |
| 120 | accepted | Fold the per-operation persona commands into one per role...        | commands, personas, prompts       | One `/rule-persona-<role>`; the depth is read from the request; old names deleted.                                          |
| 117 | accepted | Area slash commands are collectors only...                          | commands, prompts, areas          | Slash and MCP area prompts emit only hub collectors; leaves route from free text.                                           |

Full log: `docs/adr/ADR.md` (123 entries).

### Recent Commits

```
9c8f8a13 docs(adr): record 123 and regenerate the architecture count and census
7abe0be5 feat(case-studies): start the six apps with one port-allocating command
ed68537c fix(router): make tool registration idempotent by name
47490808 chore(handoff): add session handoff 21-fix-tool-and-nomenclature-alignment
73d18476 docs(handoff): refresh the root handoff summary
66188b2d chore(census): map the rule-fix command to rule_tool_fix
a9333f14 docs(adr): record 122 and regenerate the census for the fix tool
```

### Flagged, not fixed

- `main` is 30 commits ahead of `origin/main`; never pushed.
- The census pre-commit hook (`.githooks/pre-commit`) regenerates and stages `docs/02-architecture.md` on every commit, so the 122 → 123 count landed in `fix(router)` rather than the `docs(adr)` commit. Same hook keeps the other generated docs current.
- Backlog Step 4 (ARCH-10) is open: no `Transport` interface and no `ToolPolicy` type (`docs/plans/backlog.md`).
- The owner actions in `docs/plans/backlog.md` (GitHub vulnerability reporting, branch protection, Pages URL, labels, sponsors, Vigilant Mode, stale `v1.0.0` tag) are unchanged.
- The docs site and the presentation deck remain the agreed next workstream; the deck artifact (new or existing) is still not confirmed.
- `case-studies/**/tsconfig.tsbuildinfo` is a build artifact that is now tracked (it was staged by the earlier session); consider ignoring `*.tsbuildinfo`.

### Resume Prompt

next session opens with this block.

```prompt
Resume work on rule-mcp from `docs/handoff/22-case-studies-launcher-and-registry-idempotency.md`.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.

Branch: `main` (30 commits ahead of origin/main; never pushed).
Commit range covered: `47490808..9c8f8a13`.
Shipped this session: `pnpm case-studies` starts the six case-study apps on allocated ports (ADR 123), and `registerTool` is idempotent by name (registry moved to `src/tools/router/_registry.js`). The surface is unchanged at 107 tools, 40 commands, 37 prompts; site-dist and the census were refreshed.

First step: resume the documentation site and the presentation deck. Ask the user which artifact to start and whether the deck is new or already exists, then confirm the docs-site surface/counts pages (`scripts/docs-site/`, `site-dist/`) match the live surface and ADR 123 before touching the deck.
```

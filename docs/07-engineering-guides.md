# Engineering guides

Practical guides for working on rule-mcp itself: the engineering loop,
the guardrails, the docs pipeline, and the numbers that matter. Counts here are
verified by `tests/docs/docs-accuracy.test.mjs` against the live registries; the
heavy inventories live in the generated census blocks of `docs/01-`,
`docs/02-` and `docs/04-`.

## The engineering loop

The server is deterministic and LLM-free: tools route, scaffold, validate,
search, and record - they never generate prose by calling a model. Work on it
follows the standard loop, enforced by the repo's own guardrails:

1. **Write the failing test first.** `node --test tests/<area>.test.mjs` runs a
   single suite; `pnpm test:all` runs everything.
2. **Implement until the suite is green.**
3. **Self-check with the repo's own guardrails**: `pnpm lint` (eslint with
   `--max-warnings 50`) and `tests/core/self-guardrails.test.mjs` (the server must
   pass its own `rule_tool_check` rules - a guardrail product whose source
   cannot pass its checks is ignored by everyone downstream).
4. **Format**: `pnpm format:fix` (prettier) so `pnpm format` stays clean.
5. **Regenerate the census** when the surface changed: `pnpm census` updates
   the generated blocks in `docs/01-`, `docs/02-`, `docs/04-`, `docs/05-`
   (`tests/docs/census-generated.test.mjs` fails otherwise).
6. **Commit with a scoped conventional message**: `type(scope): subject`
   (the `commit-msg` hook rejects scope-less subjects).

## The guardrails

Guardrail rules live in `src/core/guardrails/` split by domain and are applied
per skill by `src/core/guardrails.js` (`getGuardrails` / `checkCode`).

- **Shared + quality families run on every skill**: TypeScript strictness, the
  fingerprint family (em/en dashes, curly quotes, British -> American
  spellings), comment hygiene, simplicity rules, flex-first layout, and the
  English-only rule (`en-english-only-prose`: comments, identifiers and whole
  `.md` documents must be English, American spelling).
- **Domain families** attach per skill: backend, database (data-*), devops,
  a11y (frontend/platform/ui/styleguide), framework and scaffold rules.
- **Precision is measured**: `tests/fixtures/guardrail-corpus.mjs` feeds every
  rule labeled good/bad snippets; `tests/core/guardrails-precision-recall.test.mjs`
  requires 100% precision and recall per rule - a rule that fires on idiomatic
  code or sleeps on violations fails the suite.
- **The repo is its own first customer**: `tests/core/self-guardrails.test.mjs`
  runs the JavaScript rules over `src/**` and fails on any violation.

## The docs pipeline

Numbered docs are partly generated. `scripts/reports/census/index.mjs` refreshes the
blocks between `<!-- census:begin/end:<marker> -->` markers in the numbered
docs and is wired into `prebuild`:

- `docs/02-product-architecture.md` - tool-family counts
- `docs/04-operations.md` - tools in detail, resources, review personas,
  `.roo/commands` snapshot
- `docs/03-agent-instructions.md` - the command surface and persona table
- `docs/05-env-variables.md` - the environment registry

`docs/README.md` is the index. ADRs in `docs/adr/` are immutable decision
records (a merger or a reversal writes a new ADR). A roadmap or plan never
claims a numbered slot: it is deleted when fully executed or obsolete.
`01-getting-started.md` is the first-run guide.

To add a surface, change the code, run `pnpm census`, verify
`tests/docs/census-generated.test.mjs` and `tests/docs/docs-accuracy.test.mjs`, then
commit - the docs follow the code instead of being remembered.

## Measured numbers

- **Skills**: 96 `skills/*/SKILL.md` documents, each registered as a
  `rule-tool-<skill>` MCP tool with full/summary/tldr/search/guardrails/check
  modes; 112 tools and 198 `rule://` resources in total (runtime counts, see
  the generated blocks).
- **Skill reading** is cached (LRU): a cache hit is sub-millisecond, a miss is
  one disk read.
- **Routing** builds a deterministic BM25 index at startup; routing is measured
  against `tests/fixtures/routing-corpus.mjs` with floors on exact and top-or-alternative
  hits, so a new skill can only land when routing still finds the intended
  target.
- **Tests**: the suite covers the installer (bash + PowerShell), the CLI
  parse surface, the guardrails corpus, the docs/census drift, the personas
  and the transports (stdio, SSE, HTTP, daemon, Docker).
- **Compression** (`pnpm report:compression`, 2026-09-09) removes, by level:

  | Corpus                    | `lite` | `full` | `ultra` |
  | ------------------------- | ------ | ------ | ------- |
  | skills (89 SKILL.md)      | 0.06 % | 1.52 % | 2.02 %  |
  | docs (17 files)           | 0.02 % | 0.56 % | 0.73 %  |
  | real tool results (6)     | 0.11 % | 2.03 % | 2.58 %  |
  | verbose prose (synthetic) | 17.4 % | 34.2 % | 42.3 %  |

  The two rows are not in conflict. The shipped corpora are already written
  in the compressed style, so on them the rules measure how little filler is
  left; the synthetic corpus is what an uncompressed assistant answer looks
  like, and that is the corpus the level table describes. Guard violations
  are 0 at every level on all four, which is the number that has to stay 0.

  The rules are ported from the [`rule-compression`](../skills/rule-compression/SKILL.md)
  skill and its `caveman-compress` companion: the vocabulary tables, the
  classification guards and `validate.py`'s structural validator. The LLM
  compression step is deliberately not ported - an LLM in the output path
  costs determinism, cacheability and the zero-dependency contract, and the
  guard plus per-block rollback buys the same safety for free (ADR 073).

## Compression surfaces: everything the server emits to a model

The rule is one sentence: every text the server hands to a model runs through
`src/core/text/` before it leaves. The manifest lives in
[`src/core/text/_surfaces.js`](../src/core/text/_surfaces.js) and is pinned
by `src/core/text/__tests__/_surfaces.test.mjs`; the table below is that
manifest rendered. "Prose" surfaces shorten verbose text, keep JSON identical
and never break structure (the guard errors stay 0); the documented skips say
why they are not compressed.

| Surface                                                    | Where                                                  | Status                                | Telemetry source           |
| ---------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- | -------------------------- |
| tools/call results                                         | `src/tools/router/_helpers.js` `finalize()`            | prose                                 | `caveman`                  |
| resources/read bodies (text/*)                             | `src/resources/_serve.js` `readResource()`             | prose                                 | `caveman-resource`         |
| prompts/get bodies                                         | `src/server/_prompt-handlers.js` `GetPrompt`           | prose                                 | `caveman-prompt`           |
| prompts/list descriptions                                  | `src/server/_prompt-handlers.js` `ListPrompts`         | prose                                 | `caveman-prompt-list`      |
| tools/list descriptions                                    | `src/tools/router/_surface.js` `listTools()`           | prose                                 | none (memoized at startup) |
| resources/list labels                                      | `src/resources/_listing.js`                            | prose (no-op on the terse set)        | none (ADR 077)             |
| resume hook block (SessionStart / UserPromptSubmit)        | `src/core/session/resume/_context.js` `handoffBlock()` | prose                                 | `caveman-resume`           |
| banners (self-update notice, resume announcement)          | `src/tools/router/_helpers.js` `withBanner()`          | prose                                 | `caveman-banner`           |
| workflow reminder                                          | `src/core/enforcement/_reminder.js`                    | prose (rides on the tool-result pass) | `caveman`                  |
| error envelopes                                            | `src/tools/router/call/_pipeline.js`                   | terse by construction, not compressed | -                          |
| completions/complete                                       | `src/server/_completions.js`                           | fixed vocabulary, not prose (ADR 077) | -                          |
| JSON payloads (application/json bodies, JSON tool content) | `_serve.js`, `_helpers.js`                             | data, never compressed                | -                          |

By document category, the answer to "is it compressed before it reaches a
model?":

| Category                                                                            | Status                                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Markdown (handoffs, docs served via `rule://` text resources, the resume hook block) | compressed (tool result, resource read, `caveman-resume`)                                                                |
| Skills (full body + summary resources, tool-embedded evidence)                      | compressed (resource read + tool-result pass)                                                                            |
| Resources                                                                           | read: compressed; list labels: pass-through (no-op, ADR 077)                                                             |
| Instructions (session/prompt directives, agent-instruction files)                   | directives already terse by authorship; anything emitted runs the pass                                                   |
| Prompts                                                                             | get: compressed; list: descriptions compressed (ADR 077)                                                                 |
| Tools                                                                               | results: compressed; list: descriptions compressed, schemas never (ADR 077)                                              |
| Personas                                                                            | served content (plan outputs): compressed via the tool-result pass; `src/roles/*.md` source files stay untouched on disk |

Opt-outs apply everywhere: `RULE_MCP_NO_CAVEMAN=1` and
`RULE_MCP_CAVEMAN_LEVEL=off` turn the pass off on every surface that
runs it (plus `RULE_MCP_NO_RESUME_HANDON` for the resume block and
`RULE_MCP_NO_REMINDER` for the reminder).

- **Startup** (`pnpm report:startup`, 2026-09-09): warm `--help` 48 ms,
  `tools list` 265 ms, stdio `initialize` 251 ms. A cold process spends 12 ms
  on the entry import, 53 ms registering skills and 8 ms converting tool
  schemas; the second `tools/list` in a process is free. The compiled code
  cache is worth 2-6 %; the 168 ms came from what `--help` no longer loads
  (ADR 074).

## The TokenSave adapter

[TokenSave](https://github.com/aovestdipaperino/tokensave) is a local code-graph MCP server.
When a project ships `.tokensave/tokensave.db`, the server prefers it for the reads a graph serves
better and keeps the JavaScript it replaced as the tested fallback. The adapter is
`src/core/tokensave/`: no other module calls TokenSave directly, and `RULE_MCP_NO_TOKENSAVE=1`
turns the whole integration off.

| Provider                         | Prefers                                                | Falls back to                                 |
| -------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `_probe.js`                      | `.tokensave/tokensave.db`, config and branch metadata  | no graph                                      |
| `_client.js` / `_client-sync.js` | `tokensave tool <name> --json --args <json>`           | one `{ ok: false, unavailable: true }` result |
| `_files.js`                      | `files` (unioned with a live walk)                     | `readdirSync` walk                            |
| `_edit.js`                       | `str_replace` for an existing file                     | `writeFileSync`                               |
| `_deps.js`                       | `config` for name, deps and engines                    | direct `package.json` read                    |
| `_graph.js`                      | the architecture checklist in the plan prompt          | no section                                    |
| `_changes.js`                    | `commit_context`, `diff_context`, `log` in the handoff | no section                                    |
| `_routing.js`                    | `search` as a routing bonus                            | BM25 alone                                    |
| `_memory.js`                     | `record_decision` / `session_recall`                   | no-op                                         |
| `_ledger.js`                     | `tokensave gain --json` in `rule_tool_stats`            | no section                                    |

The graph is refused outright when its `last_indexed_version` names a different major than the
adapter supports (currently `7`), and a failing tool call is skipped, never failed.

Measured on 2026-09-15, `develop`:

- **Savings ledger** (`tokensave gain --json --range 30d`): 85 calls, ~97.6k tokens saved, $0.29.
- **Missed opportunities** (`tokensave discover --since 30d`): 472 navigation turns, ~120.7k
  addressable input tokens, ~60.3k conservative recoverable.
- **Routing** (`tests/fixtures/routing-corpus.mjs`): 80% exact / 95% top-or-alternative without
  the graph, 81% exact / 95% with it.

## Contributing

- Read `docs/README.md`, then the numbered docs relevant to your change.
- Open work is tracked in the issue tracker; plans inside the repo are
  deleted when fully executed or obsolete.
- When a custom persona is added, it is a markdown file in `src/roles/` with
  frontmatter and a lenses list in the body, not a code change; run
  `pnpm census` afterwards.
- Keep prose English, American spelling (enforced by `en-english-only-prose`).
- Git hooks live in `.githooks/` and are installed by `pnpm install` (via
  `prepare`), or on demand with `pnpm hooks:install`. What lands in
  `.git/hooks/` is a shim that executes the tracked hook, so the two cannot
  drift; `pnpm hooks:check` fails when a clone is missing them.

<!-- census:begin:command-surface -->

### The command surface today (246)

| Kind       | Count | Example           | Reach for it when                                                   |
| ---------- | ----- | ----------------- | ------------------------------------------------------------------- |
| `router`   | 1     | `/rule`            | Routes a free-text request to the skill that answers it             |
| `area`     | 182   | `/rule-area-ai`    | Routes within one area, when the area is known and the skill is not |
| `workflow` | 2     | `/rule-check`      | Runs a named workflow: a decision record, a pre-flight check        |
| `session`  | 4     | `/rule-handoff`    | Carries a session across a context boundary                         |
| `persona`  | 57    | `/rule-audit-a11y` | Runs one review role at one operation, and writes its documents     |

**Areas**: `/rule-area-ai`, `/rule-area-ai-agent-architecture`, `/rule-area-ai-agent-architecture-check`, `/rule-area-ai-check`, `/rule-area-ai-context-engineering`, `/rule-area-ai-context-engineering-check`, `/rule-area-ai-evals`, `/rule-area-ai-evals-check`, `/rule-area-ai-prompting`, `/rule-area-ai-prompting-check`, `/rule-area-backend`, `/rule-area-backend-check`, `/rule-area-backend-express`, `/rule-area-backend-express-check`, `/rule-area-backend-fastify`, `/rule-area-backend-fastify-check`, `/rule-area-backend-graphql`, `/rule-area-backend-graphql-check`, `/rule-area-backend-hono`, `/rule-area-backend-hono-check`, `/rule-area-backend-nestjs`, `/rule-area-backend-nestjs-check`, `/rule-area-backend-node`, `/rule-area-backend-node-check`, `/rule-area-backend-security`, `/rule-area-backend-security-check`, `/rule-area-backend-workers`, `/rule-area-backend-workers-check`, `/rule-area-compression`, `/rule-area-compression-check`, `/rule-area-data`, `/rule-area-data-check`, `/rule-area-data-duckdb`, `/rule-area-data-duckdb-check`, `/rule-area-data-indexed-db`, `/rule-area-data-indexed-db-check`, `/rule-area-data-mongodb`, `/rule-area-data-mongodb-check`, `/rule-area-data-mysql`, `/rule-area-data-mysql-check`, `/rule-area-data-postgresql`, `/rule-area-data-postgresql-check`, `/rule-area-data-sql`, `/rule-area-data-sql-check`, `/rule-area-data-sqlite`, `/rule-area-data-sqlite-check`, `/rule-area-devops`, `/rule-area-devops-check`, `/rule-area-devops-deploy-preview`, `/rule-area-devops-deploy-preview-check`, `/rule-area-devops-docker`, `/rule-area-devops-docker-check`, `/rule-area-devops-observability`, `/rule-area-devops-observability-check`, `/rule-area-devops-testing`, `/rule-area-devops-testing-check`, `/rule-area-frontend`, `/rule-area-frontend-angular`, `/rule-area-frontend-angular-check`, `/rule-area-frontend-check`, `/rule-area-frontend-custom-element`, `/rule-area-frontend-custom-element-check`, `/rule-area-frontend-react`, `/rule-area-frontend-react-check`, `/rule-area-frontend-solidjs`, `/rule-area-frontend-solidjs-check`, `/rule-area-frontend-svelte`, `/rule-area-frontend-svelte-check`, `/rule-area-frontend-template-engine`, `/rule-area-frontend-template-engine-check`, `/rule-area-frontend-vanilla-reactive`, `/rule-area-frontend-vanilla-reactive-check`, `/rule-area-frontend-vue`, `/rule-area-frontend-vue-check`, `/rule-area-frontend-workers`, `/rule-area-frontend-workers-check`, `/rule-area-meta`, `/rule-area-meta-astro`, `/rule-area-meta-astro-check`, `/rule-area-meta-check`, `/rule-area-meta-next`, `/rule-area-meta-next-check`, `/rule-area-meta-nuxt`, `/rule-area-meta-nuxt-check`, `/rule-area-meta-remix`, `/rule-area-meta-remix-check`, `/rule-area-platform`, `/rule-area-platform-agent`, `/rule-area-platform-agent-check`, `/rule-area-platform-auth`, `/rule-area-platform-auth-check`, `/rule-area-platform-check`, `/rule-area-platform-desktop`, `/rule-area-platform-desktop-check`, `/rule-area-platform-library`, `/rule-area-platform-library-check`, `/rule-area-platform-web`, `/rule-area-platform-web-check`, `/rule-area-process`, `/rule-area-process-adr`, `/rule-area-process-adr-check`, `/rule-area-process-ai-sdlc`, `/rule-area-process-ai-sdlc-check`, `/rule-area-process-bmad`, `/rule-area-process-bmad-check`, `/rule-area-process-changelog`, `/rule-area-process-changelog-check`, `/rule-area-process-check`, `/rule-area-process-code-review`, `/rule-area-process-code-review-check`, `/rule-area-process-handoff`, `/rule-area-process-handoff-check`, `/rule-area-process-npm-release`, `/rule-area-process-npm-release-check`, `/rule-area-process-simplicity`, `/rule-area-process-simplicity-check`, `/rule-area-process-tdd`, `/rule-area-process-tdd-check`, `/rule-area-styleguide`, `/rule-area-styleguide-a11y`, `/rule-area-styleguide-a11y-check`, `/rule-area-styleguide-baseline`, `/rule-area-styleguide-baseline-check`, `/rule-area-styleguide-check`, `/rule-area-styleguide-comments`, `/rule-area-styleguide-comments-check`, `/rule-area-styleguide-css`, `/rule-area-styleguide-css-check`, `/rule-area-styleguide-english`, `/rule-area-styleguide-english-check`, `/rule-area-styleguide-file-tree`, `/rule-area-styleguide-file-tree-check`, `/rule-area-styleguide-fingerprint`, `/rule-area-styleguide-fingerprint-check`, `/rule-area-styleguide-html`, `/rule-area-styleguide-html-check`, `/rule-area-styleguide-i18n`, `/rule-area-styleguide-i18n-check`, `/rule-area-styleguide-javascript`, `/rule-area-styleguide-javascript-check`, `/rule-area-styleguide-json`, `/rule-area-styleguide-json-check`, `/rule-area-styleguide-markdown`, `/rule-area-styleguide-markdown-check`, `/rule-area-styleguide-naming`, `/rule-area-styleguide-naming-check`, `/rule-area-styleguide-patterns`, `/rule-area-styleguide-patterns-check`, `/rule-area-styleguide-readme`, `/rule-area-styleguide-readme-check`, `/rule-area-styleguide-typescript`, `/rule-area-styleguide-typescript-check`, `/rule-area-styleguide-validation`, `/rule-area-styleguide-validation-check`, `/rule-area-toolchain`, `/rule-area-toolchain-biome`, `/rule-area-toolchain-biome-check`, `/rule-area-toolchain-check`, `/rule-area-toolchain-commits`, `/rule-area-toolchain-commits-check`, `/rule-area-toolchain-eslint`, `/rule-area-toolchain-eslint-check`, `/rule-area-toolchain-husky`, `/rule-area-toolchain-husky-check`, `/rule-area-toolchain-parcel`, `/rule-area-toolchain-parcel-check`, `/rule-area-toolchain-pnpm`, `/rule-area-toolchain-pnpm-check`, `/rule-area-toolchain-project`, `/rule-area-toolchain-project-check`, `/rule-area-toolchain-rspack`, `/rule-area-toolchain-rspack-check`, `/rule-area-toolchain-turborepo`, `/rule-area-toolchain-turborepo-check`, `/rule-area-toolchain-typescript`, `/rule-area-toolchain-typescript-check`, `/rule-area-toolchain-vite`, `/rule-area-toolchain-vite-check`, `/rule-area-ui`, `/rule-area-ui-check`, `/rule-area-ui-design-system`, `/rule-area-ui-design-system-check`

**Workflows**: `/rule-check`, `/rule-flight`

**Sessions**: `/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-update`

Every command, with its description and its install target, is in
[`11-instructions.md`](11-instructions.md). Regenerate this block with `pnpm census`.

<!-- census:end:command-surface -->

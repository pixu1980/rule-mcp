# Engineering guides

Practical guides for working on pix-galaxy-mcp itself: the engineering loop,
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
   pass its own `pix_tool_check` rules - a guardrail product whose source
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
  `pix-tool-<skill>` MCP tool with full/summary/tldr/search/guardrails/check
  modes; 112 tools and 198 `pix://` resources in total (runtime counts, see
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

  The rules are ported from the [`pix-process-compression`](../skills/pix-process-compression/SKILL.md)
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
| Markdown (handoffs, docs served via `pix://` text resources, the resume hook block) | compressed (tool result, resource read, `caveman-resume`)                                                                |
| Skills (full body + summary resources, tool-embedded evidence)                      | compressed (resource read + tool-result pass)                                                                            |
| Resources                                                                           | read: compressed; list labels: pass-through (no-op, ADR 077)                                                             |
| Instructions (session/prompt directives, agent-instruction files)                   | directives already terse by authorship; anything emitted runs the pass                                                   |
| Prompts                                                                             | get: compressed; list: descriptions compressed (ADR 077)                                                                 |
| Tools                                                                               | results: compressed; list: descriptions compressed, schemas never (ADR 077)                                              |
| Personas                                                                            | served content (plan outputs): compressed via the tool-result pass; `src/roles/*.md` source files stay untouched on disk |

Opt-outs apply everywhere: `PIX_GALAXY_MCP_NO_CAVEMAN=1` and
`PIX_GALAXY_MCP_CAVEMAN_LEVEL=off` turn the pass off on every surface that
runs it (plus `PIX_GALAXY_MCP_NO_RESUME_HANDON` for the resume block and
`PIX_GALAXY_MCP_NO_REMINDER` for the reminder).

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
`src/core/tokensave/`: no other module calls TokenSave directly, and `PIX_GALAXY_MCP_NO_TOKENSAVE=1`
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
| `_ledger.js`                     | `tokensave gain --json` in `pix_tool_stats`            | no section                                    |

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

| Kind       | Count | Example                   | Reach for it when                                                   |
| ---------- | ----- | ------------------------- | ------------------------------------------------------------------- |
| `router`   | 1     | `/pix`                    | Routes a free-text request to the skill that answers it             |
| `area`     | 182   | `/pix-area-ai`            | Routes within one area, when the area is known and the skill is not |
| `workflow` | 1     | `/pix-check`              | Runs a named workflow: a decision record, a pre-flight check        |
| `session`  | 5     | `/pix-handoff`            | Carries a session across a context boundary                         |
| `persona`  | 57    | `/pix-persona-a11y-audit` | Runs one review role at one operation, and writes its documents     |

**Areas**: `/pix-area-ai`, `/pix-area-ai-agent-architecture`, `/pix-area-ai-agent-architecture-check`, `/pix-area-ai-check`, `/pix-area-ai-context-engineering`, `/pix-area-ai-context-engineering-check`, `/pix-area-ai-evals`, `/pix-area-ai-evals-check`, `/pix-area-ai-prompting`, `/pix-area-ai-prompting-check`, `/pix-area-backend`, `/pix-area-backend-check`, `/pix-area-backend-express`, `/pix-area-backend-express-check`, `/pix-area-backend-fastify`, `/pix-area-backend-fastify-check`, `/pix-area-backend-graphql`, `/pix-area-backend-graphql-check`, `/pix-area-backend-hono`, `/pix-area-backend-hono-check`, `/pix-area-backend-nestjs`, `/pix-area-backend-nestjs-check`, `/pix-area-backend-node`, `/pix-area-backend-node-check`, `/pix-area-backend-security`, `/pix-area-backend-security-check`, `/pix-area-backend-workers`, `/pix-area-backend-workers-check`, `/pix-area-data`, `/pix-area-data-check`, `/pix-area-data-duckdb`, `/pix-area-data-duckdb-check`, `/pix-area-data-indexed-db`, `/pix-area-data-indexed-db-check`, `/pix-area-data-mongodb`, `/pix-area-data-mongodb-check`, `/pix-area-data-mysql`, `/pix-area-data-mysql-check`, `/pix-area-data-postgresql`, `/pix-area-data-postgresql-check`, `/pix-area-data-sql`, `/pix-area-data-sql-check`, `/pix-area-data-sqlite`, `/pix-area-data-sqlite-check`, `/pix-area-devops`, `/pix-area-devops-check`, `/pix-area-devops-deploy-preview`, `/pix-area-devops-deploy-preview-check`, `/pix-area-devops-docker`, `/pix-area-devops-docker-check`, `/pix-area-devops-observability`, `/pix-area-devops-observability-check`, `/pix-area-devops-testing`, `/pix-area-devops-testing-check`, `/pix-area-frontend`, `/pix-area-frontend-angular`, `/pix-area-frontend-angular-check`, `/pix-area-frontend-check`, `/pix-area-frontend-custom-element`, `/pix-area-frontend-custom-element-check`, `/pix-area-frontend-react`, `/pix-area-frontend-react-check`, `/pix-area-frontend-solidjs`, `/pix-area-frontend-solidjs-check`, `/pix-area-frontend-svelte`, `/pix-area-frontend-svelte-check`, `/pix-area-frontend-template-engine`, `/pix-area-frontend-template-engine-check`, `/pix-area-frontend-vanilla-reactive`, `/pix-area-frontend-vanilla-reactive-check`, `/pix-area-frontend-vue`, `/pix-area-frontend-vue-check`, `/pix-area-frontend-workers`, `/pix-area-frontend-workers-check`, `/pix-area-meta`, `/pix-area-meta-astro`, `/pix-area-meta-astro-check`, `/pix-area-meta-check`, `/pix-area-meta-next`, `/pix-area-meta-next-check`, `/pix-area-meta-nuxt`, `/pix-area-meta-nuxt-check`, `/pix-area-meta-remix`, `/pix-area-meta-remix-check`, `/pix-area-platform`, `/pix-area-platform-agent`, `/pix-area-platform-agent-check`, `/pix-area-platform-auth`, `/pix-area-platform-auth-check`, `/pix-area-platform-check`, `/pix-area-platform-desktop`, `/pix-area-platform-desktop-check`, `/pix-area-platform-library`, `/pix-area-platform-library-check`, `/pix-area-platform-web`, `/pix-area-platform-web-check`, `/pix-area-process`, `/pix-area-process-adr`, `/pix-area-process-adr-check`, `/pix-area-process-ai-sdlc`, `/pix-area-process-ai-sdlc-check`, `/pix-area-process-bmad`, `/pix-area-process-bmad-check`, `/pix-area-process-changelog`, `/pix-area-process-changelog-check`, `/pix-area-process-check`, `/pix-area-process-code-review`, `/pix-area-process-code-review-check`, `/pix-area-process-compression`, `/pix-area-process-compression-check`, `/pix-area-process-handoff`, `/pix-area-process-handoff-check`, `/pix-area-process-npm-release`, `/pix-area-process-npm-release-check`, `/pix-area-process-simplicity`, `/pix-area-process-simplicity-check`, `/pix-area-process-tdd`, `/pix-area-process-tdd-check`, `/pix-area-styleguide`, `/pix-area-styleguide-a11y`, `/pix-area-styleguide-a11y-check`, `/pix-area-styleguide-baseline`, `/pix-area-styleguide-baseline-check`, `/pix-area-styleguide-check`, `/pix-area-styleguide-comments`, `/pix-area-styleguide-comments-check`, `/pix-area-styleguide-css`, `/pix-area-styleguide-css-check`, `/pix-area-styleguide-english`, `/pix-area-styleguide-english-check`, `/pix-area-styleguide-file-tree`, `/pix-area-styleguide-file-tree-check`, `/pix-area-styleguide-fingerprint`, `/pix-area-styleguide-fingerprint-check`, `/pix-area-styleguide-html`, `/pix-area-styleguide-html-check`, `/pix-area-styleguide-i18n`, `/pix-area-styleguide-i18n-check`, `/pix-area-styleguide-javascript`, `/pix-area-styleguide-javascript-check`, `/pix-area-styleguide-json`, `/pix-area-styleguide-json-check`, `/pix-area-styleguide-markdown`, `/pix-area-styleguide-markdown-check`, `/pix-area-styleguide-naming`, `/pix-area-styleguide-naming-check`, `/pix-area-styleguide-patterns`, `/pix-area-styleguide-patterns-check`, `/pix-area-styleguide-readme`, `/pix-area-styleguide-readme-check`, `/pix-area-styleguide-typescript`, `/pix-area-styleguide-typescript-check`, `/pix-area-styleguide-validation`, `/pix-area-styleguide-validation-check`, `/pix-area-toolchain`, `/pix-area-toolchain-biome`, `/pix-area-toolchain-biome-check`, `/pix-area-toolchain-check`, `/pix-area-toolchain-commits`, `/pix-area-toolchain-commits-check`, `/pix-area-toolchain-eslint`, `/pix-area-toolchain-eslint-check`, `/pix-area-toolchain-husky`, `/pix-area-toolchain-husky-check`, `/pix-area-toolchain-parcel`, `/pix-area-toolchain-parcel-check`, `/pix-area-toolchain-pnpm`, `/pix-area-toolchain-pnpm-check`, `/pix-area-toolchain-project`, `/pix-area-toolchain-project-check`, `/pix-area-toolchain-rspack`, `/pix-area-toolchain-rspack-check`, `/pix-area-toolchain-turborepo`, `/pix-area-toolchain-turborepo-check`, `/pix-area-toolchain-typescript`, `/pix-area-toolchain-typescript-check`, `/pix-area-toolchain-vite`, `/pix-area-toolchain-vite-check`, `/pix-area-ui`, `/pix-area-ui-check`, `/pix-area-ui-design-system`, `/pix-area-ui-design-system-check`

**Workflows**: `/pix-check`

**Sessions**: `/pix-handoff`, `/pix-handon`, `/pix-init`, `/pix-process-flight`, `/pix-update`

Every command, with its description and its install target, is in
[`11-instructions.md`](11-instructions.md). Regenerate this block with `pnpm census`.

<!-- census:end:command-surface -->

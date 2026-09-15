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

- `docs/01-product-architecture.md` - tool-family counts
- `docs/02-tools-operations.md` - tools in detail, resources, review personas,
  `.roo/commands` snapshot
- `docs/04-agent-instructions.md` - the command surface and persona table
- `docs/05-env-variables.md` - the environment registry

`docs/README.md` is the index. ADRs in `docs/adr/` are immutable decision
records (a merger or a reversal writes a new ADR). A roadmap or plan never
claims a numbered slot: it is deleted when fully executed or obsolete.
`GETTING_STARTED.md` is the first-run guide.

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

  The rules are ported from the [`rule-caveman`](../skills/rule-caveman/SKILL.md)
  skill and its `caveman-compress` companion: the vocabulary tables, the
  classification guards and `validate.py`'s structural validator. The LLM
  compression step is deliberately not ported - an LLM in the output path
  costs determinism, cacheability and the zero-dependency contract, and the
  guard plus per-block rollback buys the same safety for free (ADR 076).

- **Startup** (`pnpm report:startup`, 2026-09-09): warm `--help` 48 ms,
  `tools list` 265 ms, stdio `initialize` 251 ms. A cold process spends 12 ms
  on the entry import, 53 ms registering skills and 8 ms converting tool
  schemas; the second `tools/list` in a process is free. The compiled code
  cache is worth 2-6 %; the 168 ms came from what `--help` no longer loads
  (ADR 077).

## Contributing

- Read `docs/README.md`, then the numbered docs relevant to your change.
- Open work is tracked in the issue tracker; plans inside the repo are
  deleted when fully executed or obsolete.
- When a custom persona is added, it is a markdown file in `src/roles/` with
  frontmatter and a lenses list in the body, not a code change; run
  `pnpm census` afterwards.
- Keep prose English, American spelling (enforced by `en-english-only-prose`).

<!-- census:begin:command-surface -->

### The command surface today (155)

| Kind       | Count | Example           | Reach for it when                                                   |
| ---------- | ----- | ----------------- | ------------------------------------------------------------------- |
| `router`   | 1     | `/rule`            | Routes a free-text request to the skill that answers it             |
| `area`     | 90    | `/rule-area-ai`    | Routes within one area, when the area is known and the skill is not |
| `workflow` | 2     | `/rule-adr`        | Runs a named workflow: a decision record, a pre-flight check        |
| `session`  | 5     | `/rule-handoff`    | Carries a session across a context boundary                         |
| `persona`  | 57    | `/rule-audit-a11y` | Runs one review role at one operation, and writes its documents     |

**Areas**: `/rule-area-ai`, `/rule-area-ai-agent-architecture`, `/rule-area-ai-context-engineering`, `/rule-area-ai-evals`, `/rule-area-ai-prompting`, `/rule-area-backend`, `/rule-area-backend-express`, `/rule-area-backend-fastify`, `/rule-area-backend-graphql`, `/rule-area-backend-hono`, `/rule-area-backend-nestjs`, `/rule-area-backend-node`, `/rule-area-backend-security`, `/rule-area-backend-workers`, `/rule-area-caveman`, `/rule-area-data`, `/rule-area-data-duckdb`, `/rule-area-data-indexed-db`, `/rule-area-data-mongodb`, `/rule-area-data-mysql`, `/rule-area-data-postgresql`, `/rule-area-data-sql`, `/rule-area-data-sqlite`, `/rule-area-devops`, `/rule-area-devops-deploy-preview`, `/rule-area-devops-docker`, `/rule-area-devops-observability`, `/rule-area-devops-testing`, `/rule-area-frontend`, `/rule-area-frontend-angular`, `/rule-area-frontend-custom-element`, `/rule-area-frontend-meta-astro`, `/rule-area-frontend-meta-next`, `/rule-area-frontend-meta-nuxt`, `/rule-area-frontend-meta-remix`, `/rule-area-frontend-react`, `/rule-area-frontend-solidjs`, `/rule-area-frontend-svelte`, `/rule-area-frontend-template-engine`, `/rule-area-frontend-vanilla-reactive`, `/rule-area-frontend-vue`, `/rule-area-frontend-workers`, `/rule-area-platform`, `/rule-area-platform-agent`, `/rule-area-platform-auth`, `/rule-area-platform-desktop`, `/rule-area-platform-library`, `/rule-area-platform-web`, `/rule-area-process`, `/rule-area-process-adr`, `/rule-area-process-ai-sdlc`, `/rule-area-process-bmad`, `/rule-area-process-changelog`, `/rule-area-process-code-review`, `/rule-area-process-handoff`, `/rule-area-process-npm-release`, `/rule-area-process-simplicity`, `/rule-area-process-tdd`, `/rule-area-styleguide`, `/rule-area-styleguide-a11y`, `/rule-area-styleguide-baseline`, `/rule-area-styleguide-comments`, `/rule-area-styleguide-css`, `/rule-area-styleguide-english`, `/rule-area-styleguide-file-tree`, `/rule-area-styleguide-fingerprint`, `/rule-area-styleguide-html`, `/rule-area-styleguide-i18n`, `/rule-area-styleguide-javascript`, `/rule-area-styleguide-json`, `/rule-area-styleguide-markdown`, `/rule-area-styleguide-naming`, `/rule-area-styleguide-patterns`, `/rule-area-styleguide-readme`, `/rule-area-styleguide-typescript`, `/rule-area-styleguide-validation`, `/rule-area-toolchain`, `/rule-area-toolchain-biome`, `/rule-area-toolchain-commits`, `/rule-area-toolchain-eslint`, `/rule-area-toolchain-husky`, `/rule-area-toolchain-parcel`, `/rule-area-toolchain-pnpm`, `/rule-area-toolchain-project`, `/rule-area-toolchain-rspack`, `/rule-area-toolchain-turborepo`, `/rule-area-toolchain-typescript`, `/rule-area-toolchain-vite`, `/rule-area-ui`, `/rule-area-ui-design-system`

**Workflows**: `/rule-adr`, `/rule-flight`

**Sessions**: `/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-process-check`, `/rule-update`

Every command, with its description and its install target, is in
[`09-instructions.md`](09-instructions.md). Regenerate this block with `pnpm census`.

<!-- census:end:command-surface -->

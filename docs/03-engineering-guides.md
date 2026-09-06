# Engineering guides

Practical guides for working on rule-mcp itself: the engineering loop,
the guardrails, the docs pipeline, and the numbers that matter. Counts here are
verified by `test/docs-accuracy.test.mjs` against the live registries; the
heavy inventories live in the generated census blocks of `docs/01-`,
`docs/02-` and `docs/04-`.

## The engineering loop

The server is deterministic and LLM-free: tools route, scaffold, validate,
search, and record - they never generate prose by calling a model. Work on it
follows the standard loop, enforced by the repo's own guardrails:

1. **Write the failing test first.** `node --test test/<area>.test.mjs` runs a
   single suite; `pnpm test:all` runs everything.
2. **Implement until the suite is green.**
3. **Self-check with the repo's own guardrails**: `pnpm lint` (eslint with
   `--max-warnings 50`) and `test/self-guardrails.test.mjs` (the server must
   pass its own `rule_tool_check` rules - a guardrail product whose source
   cannot pass its checks is ignored by everyone downstream).
4. **Format**: `pnpm format:fix` (prettier) so `pnpm format` stays clean.
5. **Regenerate the census** when the surface changed: `pnpm census` updates
   the generated blocks in `docs/01-`, `docs/02-`, `docs/04-`, `docs/05-`
   (`test/census-generated.test.mjs` fails otherwise).
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
- **Precision is measured**: `test/fixtures/guardrail-corpus.mjs` feeds every
  rule labeled good/bad snippets; `test/guardrails-precision-recall.test.mjs`
  requires 100% precision and recall per rule - a rule that fires on idiomatic
  code or sleeps on violations fails the suite.
- **The repo is its own first customer**: `test/self-guardrails.test.mjs`
  runs the JavaScript rules over `src/**` and fails on any violation.

## The docs pipeline

Numbered docs are partly generated. `scripts/generate-census.mjs` refreshes the
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
`test/census-generated.test.mjs` and `test/docs-accuracy.test.mjs`, then
commit - the docs follow the code instead of being remembered.

## Measured numbers

- **Skills**: 96 `skills/*/SKILL.md` documents, each registered as a
  `rule-tool-<skill>` MCP tool with full/summary/tldr/search/guardrails/check
  modes; 112 tools and 198 `rule://` resources in total (runtime counts, see
  the generated blocks).
- **Skill reading** is cached (LRU): a cache hit is sub-millisecond, a miss is
  one disk read.
- **Routing** builds a deterministic BM25 index at startup; routing is measured
  against `test/routing-corpus.mjs` with floors on exact and top-or-alternative
  hits, so a new skill can only land when routing still finds the intended
  target.
- **Tests**: the suite covers the installer (bash + PowerShell), the CLI
  parse surface, the guardrails corpus, the docs/census drift, the personas
  and the transports (stdio, SSE, HTTP, daemon, Docker).

## Contributing

- Read `docs/README.md`, then the numbered docs relevant to your change.
- Open work is tracked in the issue tracker; plans inside the repo are
  deleted when fully executed or obsolete.
- When a custom persona is added, it is a markdown file in `src/roles/` with
  frontmatter and a lenses list in the body, not a code change; run
  `pnpm census` afterwards.
- Keep prose English, American spelling (enforced by `en-english-only-prose`).

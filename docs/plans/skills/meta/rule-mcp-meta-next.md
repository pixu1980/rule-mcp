# rule-mcp-meta-next - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#44`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: meta, leaf. Sibling plans: `rule-mcp-meta-remix`, `rule-mcp-meta-nuxt`,
`rule-mcp-meta-astro` (same rule set) and `rule-mcp-meta` (the dispatcher).

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question           | Decision                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                                                                                                                               |
| Identity           | Thin leaf that delegates: App Router, server components and caching stay, everything another skill owns becomes a pointer                                                                                                                   |
| Shared owners      | `rule-mcp-frontend-react` owns the component model; `rule-mcp-styleguide-configuration` owns environment handling; `rule-mcp-platform-web` owns deployment, performance budgets and image policy; `rule-mcp-devops-testing` owns the runner |
| Reach              | Fixed here: the leaf links the dispatcher, the dispatcher lists the leaf                                                                                                                                                                    |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                                                                                                            |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                                                                                                                   |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                                                                                                                |
| Flow               | Failing test first                                                                                                                                                                                                                          |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck                                                                                                                                                                             |
| Commits            | One per phase                                                                                                                                                                                                                               |
| ADR                | Two for the whole area: the meta family shape, the rule design                                                                                                                                                                              |
| Done               | The leaf owns what it claims and the rules pass                                                                                                                                                                                             |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-meta-next/SKILL.md` is **197 lines**, no `guardrails/`, no
`references/`, no auxiliary folders.

| Section                           | Lines | Owner today                                                                       |
| --------------------------------- | ----- | --------------------------------------------------------------------------------- |
| When to use                       | 4     | **keep**                                                                          |
| Core Rules                        | 3     | clean: a pointer at `rule-mcp-frontend-react` and `rule-mcp-styleguide`           |
| File Tree Convention (App Router) | ~32   | `rule-mcp-styleguide-file-tree`, with the `app/` conventions kept                 |
| App Router                        | ~10   | **keep**                                                                          |
| Server vs Client Components       | ~20   | **keep**: the decision this framework is built around                             |
| Data Fetching                     | ~17   | **keep**: caching and revalidation semantics                                      |
| API Routes                        | ~11   | **keep**                                                                          |
| Middleware                        | ~16   | **keep**                                                                          |
| Image Optimization                | ~16   | `rule-mcp-platform-web` owns the image and budget policy; keep the Next API       |
| Static Export                     | ~9    | **keep**                                                                          |
| Environment Variables             | ~7    | `rule-mcp-styleguide-configuration`; this leaf duplicates the `NEXT_PUBLIC_` rule |
| Deployment                        | ~8    | `rule-mcp-platform-web` and `rule-mcp-devops` own the targets                     |
| Quick Reference                   | ~20   | derived                                                                           |

### Reach

| Door                       | State                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `rule-mcp` dispatcher      | listed                                                                                             |
| `rule-mcp-meta` dispatcher | the leaf does not link it, and `rule-mcp-meta` is itself missing from `rule-mcp`                   |
| See also                   | `rule-mcp`, `rule-mcp-frontend`, `rule-mcp-styleguide`: no meta router, no `rule-mcp-platform-web` |

### The duplication that matters

The environment section restates the `NEXT_PUBLIC_` prefix rule that
`rule-mcp-platform-web` already gives as one line among three frameworks
(`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`). Two places, one rule, and the meta leaf
is the one that should defer.

## Target shape

Keep App Router, server/client split, data fetching, API routes, middleware and
static export; cut the file tree, images, env and deployment to pointers; land
around 120 lines.

## The six rules

| id                             | Rejects                                                  | Reads                       | Tier | Today                        |
| ------------------------------ | -------------------------------------------------------- | --------------------------- | ---- | ---------------------------- |
| `meta-no-duplicate-core-rules` | A restatement of the markup and CSS rules                | `code`                      | B    | clean                        |
| `meta-router-linked`           | A meta leaf that does not link `rule-mcp-meta`           | `code`                      | B    | red: four leaves             |
| `meta-owner-named`             | A delegated section naming no owner                      | `code`                      | B    | red: env, images, deployment |
| `meta-no-stale-file-ref`       | A reference to a file that does not exist                | `code` + `context.fileList` | B    | clean                        |
| `meta-no-stale-skill-id`       | A `rule-mcp-...` id with no skill directory              | `code` + `context.fileList` | B    | clean                        |
| `meta-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close | `code`                      | B    | n/a: no scaffold block       |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape, shared with the other three leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-next/`: `clean/`, `core-rules-restated/`,
      `router-unlinked/`, `unnamed-owner/`, `stale-file-ref/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-mcp-meta-next`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-mcp-meta-next/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Trim and wire

- [ ] File Tree Convention: keep `app/`, link `rule-mcp-styleguide-file-tree`.
- [ ] Images: keep the `next/image` API, link `rule-mcp-platform-web` for budgets.
- [ ] Environment: one line naming `rule-mcp-styleguide-configuration`.
- [ ] Deployment: one line plus `rule-mcp-platform-web`.
- [ ] See also gains `rule-mcp-meta` and `rule-mcp-platform-web`.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-meta-next/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Trim and wire        | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-meta-next/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-meta` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The server/client split is the section a reader actually comes for, and it is
  also the one most likely to be copied into `rule-mcp-frontend-react`. It stays
  here because it is a property of this framework's compiler, not of React.
- Next and Nuxt answer the same questions with different defaults. The
  dispatcher in `rule-mcp-meta` is where the difference belongs; the leaves keep
  only their own answer.

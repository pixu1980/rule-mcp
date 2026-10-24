# rule-mcp-meta-remix - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#42`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: meta, leaf. Sibling plans: `rule-mcp-meta-nuxt`, `rule-mcp-meta-next`,
`rule-mcp-meta-astro` (same rule set) and `rule-mcp-meta` (the dispatcher, planned last).

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question           | Decision                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                                                                                         |
| Identity           | Thin leaf that delegates: the framework patterns stay, everything another skill owns becomes a pointer                                                                                                |
| Shared owners      | `rule-mcp-styleguide-*` own markup, CSS and a11y; `rule-mcp-frontend-react` owns the component model; `rule-mcp-platform-web` owns deployment targets; `rule-mcp-devops-testing` owns the test runner |
| Reach              | Fixed here: the leaf links the dispatcher, the dispatcher lists the leaf                                                                                                                              |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                                                                      |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                                                                             |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                                                                          |
| Flow               | Failing test first                                                                                                                                                                                    |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck                                                                                                                                       |
| Commits            | One per phase                                                                                                                                                                                         |
| ADR                | Two for the whole area: the meta family shape, the rule design                                                                                                                                        |
| Done               | The leaf owns what it claims and the rules pass                                                                                                                                                       |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-meta-remix/SKILL.md` is **220 lines**, no `guardrails/`, no
`references/`, no auxiliary folders.

| Section                     | Lines | Owner today                                                                                               |
| --------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| When to use                 | 4     | **keep**                                                                                                  |
| Core Rules                  | 4     | clean: it already points at `rule-mcp-frontend-react` and `rule-mcp-styleguide` instead of restating them |
| File Tree Convention        | ~22   | `rule-mcp-styleguide-file-tree`, with Remix's own `app/routes` shape kept                                 |
| Loaders, Actions            | ~50   | **keep**: this is what the framework is                                                                   |
| Progressive Enhancement     | ~19   | **keep**: it is the reason to choose Remix                                                                |
| Nested Routes with Layouts  | ~19   | **keep**                                                                                                  |
| Sessions and Cookies        | ~24   | `rule-mcp-backend-security` owns session semantics; keep only the Remix API                               |
| Resource Routes, Middleware | ~13   | **keep**                                                                                                  |
| Deployment                  | ~10   | `rule-mcp-platform-web` and `rule-mcp-devops` own the targets                                             |
| Quick Reference             | ~17   | derived                                                                                                   |

The skill is already better behaved than most: its Core Rules are a pointer,
which is the pattern the other three meta skills should copy (Astro does not).

### Reach

| Door                       | State                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `rule-mcp` dispatcher      | listed                                                                                             |
| `rule-mcp-meta` dispatcher | the leaf does not link it, and `rule-mcp-meta` is itself missing from `rule-mcp`                   |
| See also                   | `rule-mcp`, `rule-mcp-frontend`, `rule-mcp-styleguide`: no meta router, no `rule-mcp-platform-web` |

## Target shape

Keep the framework patterns, cut the rest to a pointer, land around 130 lines.
The See-also block gains the meta dispatcher and the deployment owner.

## The six rules

| id                             | Rejects                                                                          | Reads                       | Tier | Today                     |
| ------------------------------ | -------------------------------------------------------------------------------- | --------------------------- | ---- | ------------------------- |
| `meta-no-duplicate-core-rules` | A restatement of the markup and CSS rules                                        | `code`                      | B    | clean                     |
| `meta-router-linked`           | A meta leaf that does not link `rule-mcp-meta`                                   | `code`                      | B    | red: four leaves          |
| `meta-owner-named`             | A delegated section naming no owner                                              | `code`                      | B    | red: deployment, sessions |
| `meta-no-stale-file-ref`       | A reference to a file that does not exist (`rule-mcp-styleguide -> comments.md`) | `code` + `context.fileList` | B    | clean here                |
| `meta-no-stale-skill-id`       | A `rule-mcp-...` id with no skill directory                                      | `code` + `context.fileList` | B    | clean                     |
| `meta-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close                         | `code`                      | B    | n/a: no scaffold block    |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape. Rendering, routing and data loading
      belong to the meta skills; the component model belongs to the framework
      skills; deployment belongs to `rule-mcp-platform-web`.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-remix/`: `clean/`, `core-rules-restated/`,
      `router-unlinked/`, `unnamed-owner/`, `stale-file-ref/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-mcp-meta-remix`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-mcp-meta-remix/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Trim and wire

- [ ] File Tree Convention: keep the `app/routes` shape, link
      `rule-mcp-styleguide-file-tree` for the rules.
- [ ] Sessions: keep the Remix API, link `rule-mcp-backend-security` for the
      semantics.
- [ ] Deployment: one line plus the link to `rule-mcp-platform-web`.
- [ ] See also gains `rule-mcp-meta` and `rule-mcp-platform-web`.
- [ ] Quick Reference trimmed to what the body still owns.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-meta-remix/guardrails/`
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
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-meta-remix/guardrails/
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

- This is the least broken leaf in the meta area and the smallest edit of the
  five plans. Its value is as the model the other three copy: the Core Rules
  pointer is the pattern Astro, Nuxt and Next should end up with.
- Progressive enhancement is the one thing no other skill in the catalog can
  own. It stays even if the leaf gets shorter.

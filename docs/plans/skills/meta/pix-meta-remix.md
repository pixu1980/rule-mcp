# pix-meta-remix - plan

Status: plan only, 2026-10-21. Index row `#42`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: meta, leaf. Sibling plans: `pix-meta-nuxt`, `pix-meta-next`,
`pix-meta-astro` (same rule set) and `pix-meta` (the dispatcher, planned last).

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | Thin leaf that delegates: the framework patterns stay, everything another skill owns becomes a pointer |
| Shared owners | `pix-styleguide-*` own markup, CSS and a11y; `pix-frontend-react` owns the component model; `pix-platform-web` owns deployment targets; `pix-devops-testing` owns the test runner |
| Reach | Fixed here: the leaf links the dispatcher, the dispatcher lists the leaf |
| Rule set | Six rules, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, census, lint and typecheck |
| Commits | One per phase |
| ADR | Two for the whole area: the meta family shape, the rule design |
| Done | The leaf owns what it claims and the rules pass |

## Evidence base (measured 2026-10-21)

`skills/pix-meta-remix/SKILL.md` is **220 lines**, no `guardrails/`, no
`references/`, no auxiliary folders.

| Section | Lines | Owner today |
| ------- | ----- | ----------- |
| When to use | 4 | **keep** |
| Core Rules | 4 | clean: it already points at `pix-frontend-react` and `pix-styleguide` instead of restating them |
| File Tree Convention | ~22 | `pix-styleguide-file-tree`, with Remix's own `app/routes` shape kept |
| Loaders, Actions | ~50 | **keep**: this is what the framework is |
| Progressive Enhancement | ~19 | **keep**: it is the reason to choose Remix |
| Nested Routes with Layouts | ~19 | **keep** |
| Sessions and Cookies | ~24 | `pix-backend-security` owns session semantics; keep only the Remix API |
| Resource Routes, Middleware | ~13 | **keep** |
| Deployment | ~10 | `pix-platform-web` and `pix-devops` own the targets |
| Quick Reference | ~17 | derived |

The skill is already better behaved than most: its Core Rules are a pointer,
which is the pattern the other three meta skills should copy (Astro does not).

### Reach

| Door | State |
| ---- | ----- |
| `pix` dispatcher | listed |
| `pix-meta` dispatcher | the leaf does not link it, and `pix-meta` is itself missing from `pix` |
| See also | `pix`, `pix-frontend`, `pix-styleguide`: no meta router, no `pix-platform-web` |

## Target shape

Keep the framework patterns, cut the rest to a pointer, land around 130 lines.
The See-also block gains the meta dispatcher and the deployment owner.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `meta-no-duplicate-core-rules` | A restatement of the markup and CSS rules | `code` | B | clean |
| `meta-router-linked` | A meta leaf that does not link `pix-meta` | `code` | B | red: four leaves |
| `meta-owner-named` | A delegated section naming no owner | `code` | B | red: deployment, sessions |
| `meta-no-stale-file-ref` | A reference to a file that does not exist (`pix-styleguide -> comments.md`) | `code` + `context.fileList` | B | clean here |
| `meta-no-stale-skill-id` | A `pix-...` id with no skill directory | `code` + `context.fileList` | B | clean |
| `meta-scaffold-terminated` | A `## Project Scaffolding` block the parser cannot close | `code` | B | n/a: no scaffold block |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape. Rendering, routing and data loading
      belong to the meta skills; the component model belongs to the framework
      skills; deployment belongs to `pix-platform-web`.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-remix/`: `clean/`, `core-rules-restated/`,
      `router-unlinked/`, `unnamed-owner/`, `stale-file-ref/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `pix-meta-remix`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/pix-meta-remix/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Trim and wire

- [ ] File Tree Convention: keep the `app/routes` shape, link
      `pix-styleguide-file-tree` for the rules.
- [ ] Sessions: keep the Remix API, link `pix-backend-security` for the
      semantics.
- [ ] Deployment: one line plus the link to `pix-platform-web`.
- [ ] See also gains `pix-meta` and `pix-platform-web`.
- [ ] Quick Reference trimmed to what the body still owns.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/pix-meta-remix/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/pix-meta-remix/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- This is the least broken leaf in the meta area and the smallest edit of the
  five plans. Its value is as the model the other three copy: the Core Rules
  pointer is the pattern Astro, Nuxt and Next should end up with.
- Progressive enhancement is the one thing no other skill in the catalog can
  own. It stays even if the leaf gets shorter.

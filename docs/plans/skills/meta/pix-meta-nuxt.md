# rule-meta-nuxt - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#43`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: meta, leaf. Sibling plans: `rule-meta-remix`, `rule-meta-next`,
`rule-meta-astro` (same rule set) and `rule-meta` (the dispatcher).

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | Thin leaf that delegates: Nitro, auto-imports and rendering modes stay, everything another skill owns becomes a pointer |
| Shared owners | `rule-frontend-vue` owns the component model; `rule-styleguide-*` own markup, CSS and a11y; `rule-platform-web` owns deployment targets; `rule-toolchain-*` own the build |
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

`skills/rule-meta-nuxt/SKILL.md` is **177 lines**, no `guardrails/`, no
`references/`, no auxiliary folders.

| Section | Lines | Owner today |
| ------- | ----- | ----------- |
| When to use | 5 | **keep** |
| Core Rules | 4 | clean: a pointer at `rule-frontend-vue` and `rule-styleguide` |
| File Tree Convention | ~30 | `rule-styleguide-file-tree`, with Nuxt's `pages/`, `server/` and `composables/` shape kept |
| Routing | ~20 | **keep**: file-based routes with typed params |
| SSR / SSG / Hybrid | ~15 | **keep**: rendering modes are the framework's own answer |
| Server Routes (Nitro) | ~12 | **keep** |
| Auto-Imports | ~12 | **keep**: the property that makes Nuxt feel different |
| Modules | ~9 | **keep**, with a rule about how many is too many |
| Data Fetching | ~15 | **keep**: `useAsyncData` and `useFetch` semantics |
| Deployment | ~10 | `rule-platform-web` and `rule-devops` own the targets |
| Quick Reference | ~17 | derived |

### Reach

| Door | State |
| ---- | ----- |
| `rule` dispatcher | listed |
| `rule-meta` dispatcher | the leaf does not link it, and `rule-meta` is itself missing from `rule` |
| See also | `rule`, `rule-frontend`, `rule-styleguide`: no meta router, no deployment owner |

### One checked non-defect

The routing examples use arrows in HTML comments
(`<!-- pages/index.vue → / -->`). That looks like a fingerprint violation and
is not one: `TYPOGRAPHIC_RE` covers quotes and the ellipsis, not arrows, and
the catalog uses `→` throughout its Quick Selection blocks. No edit needed,
recorded here so the next reader does not "fix" it.

## Target shape

Keep Nitro, auto-imports, rendering modes and data fetching; cut the file tree
and deployment to pointers; land around 130 lines.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `meta-no-duplicate-core-rules` | A restatement of the markup and CSS rules | `code` | B | clean |
| `meta-router-linked` | A meta leaf that does not link `rule-meta` | `code` | B | red: four leaves |
| `meta-owner-named` | A delegated section naming no owner | `code` | B | red: deployment, file tree |
| `meta-no-stale-file-ref` | A reference to a file that does not exist | `code` + `context.fileList` | B | clean |
| `meta-no-stale-skill-id` | A `rule-...` id with no skill directory | `code` + `context.fileList` | B | clean |
| `meta-scaffold-terminated` | A `## Project Scaffolding` block the parser cannot close | `code` | B | n/a: no scaffold block |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape, shared with the other three leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-nuxt/`: `clean/`, `core-rules-restated/`,
      `router-unlinked/`, `unnamed-owner/`, `stale-file-ref/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-meta-nuxt`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-meta-nuxt/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Trim and wire

- [ ] File Tree Convention: keep the Nuxt shape, link
      `rule-styleguide-file-tree`.
- [ ] Deployment: one line plus `rule-platform-web`.
- [ ] See also gains `rule-meta` and `rule-platform-web`.
- [ ] Quick Reference trimmed to the kept sections.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-meta-nuxt/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-meta-nuxt/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-meta` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- Auto-imports are the section most likely to be copied into another skill
  later, because they look like a general Vue convenience. They are not: they
  are Nuxt's build-time transform. The `meta-owner-named` rule is what keeps
  the pointer honest if that happens.
- Nuxt and Next answer the same questions with different defaults, and the
  dispatcher in `rule-meta` is where the difference belongs. The leaf keeps the
  framework's answer only.

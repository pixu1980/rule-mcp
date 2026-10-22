# rule-toolchain - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, eleventh skill (the router).

## Evidence base

Read in this session:

- `skills/rule-toolchain/SKILL.md`: four routing tables, a quick selection
  guide, a long "Choosing a formatter and a linter" section with a prescribed
  "rule default" of Prettier plus ESLint, and two links.
- `docs/plans/skills/toolchain/bundler-family.md`, which names this router as
  the owner of the shared bundler contract.
- `docs/plans/skills/ui/rule-ui.md`, the sibling router plan, which proposed
  router-integrity rules owned by that skill.

Problems found:

| Problem                                       | Detail                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| the prescribed default is stale               | it says Prettier plus ESLint while `rule-toolchain-biome` recommends Biome                         |
| the comparison duplicates the tool skills     | a ten-row table restates what the Biome and ESLint skills own                                     |
| webpack still appears                         | the bundler family removed it                                                                     |
| the tables are hand-maintained                | nine children, and `rule-styleguide-configuration` and `rule-styleguide-git` recently left the area |
| the bundler family has no implementation home | the contract exists only as a plan document                                                       |

Local articles: the formatting-tools piece covers Biome, ESLint and husky. It
stays context only; the plan anchors to the tool documentation.

## Decisions

| Question               | Decision                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Role                   | Router plus short comparison guidance, not a rule owner for tool content                     |
| Comparison section     | Brief summary with links to the owning skills                                                |
| Default                | None prescribed; a decision rule instead                                                     |
| Bundler family         | `rule-toolchain` owns the contract; the bundler skills inherit it                             |
| Family guardrails      | Public-variable secrets, dev-server exposure, declared target, declared IO, sourcemap policy |
| Routing table          | Generated from the registry                                                                  |
| Routing quality        | Verified quick guide, a decision tree, cross-references to the styleguides                   |
| Router-integrity rules | Owned by the central `rule` router, inherited by every area router                            |
| Delivery               | Plan only now                                                                                |
| ADR                    | Only when a decision is structural                                                           |

## Workstream A - Role and comparison

1. The router indexes the nine toolchain children and states the area boundary.
2. The comparison section shrinks to a short guide: what a formatter and a
   linter each do, and a link to `rule-toolchain-biome` and
   `rule-toolchain-eslint` for the rules.
3. The "rule default" disappears. In its place, a decision rule: a new project
   picks one formatter and one linter and enforces them in CI; a project with a
   large ESLint ecosystem keeps it; a project willing to take the one-time
   formatting diff takes Biome.

## Workstream B - The bundler family contract

1. `rule-toolchain` owns the shared rules: public-variable secrets, dev-server
   exposure, declared target, declared entry and output, sourcemap policy.
2. `rule-toolchain-vite`, `rule-toolchain-rspack` and `rule-toolchain-parcel`
   declare `inherits: [rule-toolchain]`, so the family rules reach them once.
3. The `guardrails/index.js` here exports the family rules; the plan document
   `bundler-family.md` becomes the design note behind them.
4. No bundler skill restates a family row; each points here.

## Workstream C - Generated routing table

The four tables become one generated block, written between census markers
from the skill registry and the area map, the same mechanism proposed for
`rule-ui`. A child added to the area appears without an edit here.

## Workstream D - Routing quality

1. The quick selection guide stays and is checked against the registry.
2. A decision tree covers build tool, lint and format, package manager,
   monorepo, hooks and configuration.
3. Cross-references point at `rule-styleguide-configuration` and
   `rule-styleguide-git`, which left the area and are easy to mis-route.

## Workstream E - Router-integrity rules live in rule

The four integrity rules are owned by the central `rule` router and inherited
by every area router, so `rule`, `rule-ui` and `rule-toolchain` share one
definition: links resolve, every child is reachable, no rule is duplicated, and
the description states a use case.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                           | Rejects                                                | Tier | Source                    |
| --------------------------------- | ------------------------------------------------------ | ---- | ------------------------- |
| `bundler-no-public-secret`        | a public prefix on a secret-looking build variable     | A    | Vite, Rspack, Parcel docs |
| `bundler-dev-not-exposed`         | a dev server on all interfaces with no allowlist       | A    | Bundler dev-server docs   |
| `bundler-target-declared`         | a build with no declared browser target                | B    | Bundler target docs       |
| `bundler-io-declared`             | a build with no explicit entry or output               | B    | Bundler docs              |
| `bundler-sourcemap-policy`        | source maps on in production with no explicit decision | B    | Bundler docs              |
| `toolchain-no-webpack`            | a webpack reference in the toolchain area              | A    | Family decision           |
| `toolchain-no-prescribed-default` | a formatter or linter named as the global default      | B    | This plan                 |

The router-integrity rules (`router-link-resolves`, `router-child-coverage`,
`router-no-dup-rules`, `router-use-when`) are owned by `rule`; this skill
inherits them.

## Assets and templates to ship

- `assets/templates/toolchain-decision-tree.md`.
- A registry-backed routing table generator, shared with the `rule-ui` plan.

## Phases

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `bundler-family` (HARD), `rule-toolchain-biome` (HARD), `rule-toolchain-eslint` (HARD), `rule-toolchain-husky` (HARD), `rule-toolchain-parcel` (HARD), `rule-toolchain-pnpm` (HARD), `rule-toolchain-rspack` (HARD), `rule-toolchain-turborepo` (HARD), `rule-toolchain-vite` (HARD), `rule-process#2` (CONTRACT), `rule-process#3` (CONTRACT)

Feeds: —

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the router and the family contract.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Replace the four tables with the generated block.
- [ ] Shrink the comparison section and remove the stale default.
- [ ] Add the decision rule and the decision tree.
- [ ] Add the cross-references to the two styleguide skills that left.
- [ ] Remove the webpack reference.

### Phase 2 - Family contract and guardrails

- [ ] Add `guardrails/index.js` with the five bundler-family rules.
- [ ] Add `inherits: [rule-toolchain]` to vite, rspack and parcel.
- [ ] Implement `toolchain-no-webpack` and `toolchain-no-prescribed-default`.
- [ ] Move the four integrity rules to `rule` and inherit them here.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the family ownership and the generated router table,
      since both are structural decisions.

### Phase 3 - Verification

- [ ] Test that every toolchain child is reachable from the router.
- [ ] Test that every relative link resolves.
- [ ] Test that the generated table is current.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/docs/router-integrity.test.mjs
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The `rule-ui` plan proposed the router-integrity rules with `ui-router-*` ids
  owned by `rule-ui`. The decision here supersedes that: the ids become
  `router-*` and the owner is `rule`. The sibling plan needs the same update
  when it is implemented.
- The family rules move from the `bundler-family.md` design note into this
  skill's guardrails; the note stays as the explanation, not a second copy.

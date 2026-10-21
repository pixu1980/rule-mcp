# pix-method - the methodology family and its guardrails

Status: revision 2, 2026-10-21. Written for `skills/pix-process-bmad`; the
family it describes is now `pix-method`. This file replaces the previous
"best-practice implementation plan" in place, and then supersedes its own
single-skill scope: the owner decided on 2026-10-21 that each methodology gets
a skill, under a new `pix-method` area.

Area: method. Old index row: `#32`, `pix-process-bmad` (process). Read this
plan together with ADR 149 (superseded by 150) and ADR 150.

## Target surface

| Skill | Home | Role |
| ----- | ---- | ---- |
| `pix-method` | router, new | Chooses between the four frameworks; owns the cross-framework rules |
| `pix-method-bmad` | `pix-process-bmad`, renamed | BMAD: tracks, phases, agents, install |
| `pix-method-spec-kit` | new | GitHub Spec Kit: constitution, specify, plan, tasks, implement, converge |
| `pix-method-openspec` | new | OpenSpec: delta specs, brownfield, minimal ceremony |
| `pix-method-gsd` | new | GSD / Ralph loops / Task Master: unattended and iterative loops |

`pix-process` keeps its other children (adr, code-review, changelog,
npm-release, readme, tdd, ai) and gains one line pointing methodology questions
at `pix-method`.

## Scope decisions (owner)

Interview, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Where we restart | Plan rewritten from scratch, in place at this path |
| Skill body | `SKILL.md` stays structurally unchanged - no cut to 120-150 lines, no `references/` split in this pass |
| Corrections that are not a cut | The stale expansion and the stale install block **are** corrected; rule `bmad-expansion-current` is otherwise red on our own tree |
| Neighbors | All four boundaries in scope (`pix-process`, `pix-process-ai`, `pix-process-adr`, `pix-process-code-review`) |
| Rule set | Five rules: `bmad-single-framework`, `bmad-output-not-in-src`, `bmad-expansion-current` plus `bmad-install-stale` and `bmad-dual-scaffold` |
| Tier | All Tier B (advisory). Nothing blocking in this pass |
| Detection | Filesystem markers, limited text scan, skill frontmatter |
| Fixtures | Synthetic trees in the tests **and** versioned trees on disk |
| Flow | Failing test first, then the rule |
| Gates | Rule suite, corpus suites, `pix_tool_check`, census, lint + typecheck |
| Commits | One per phase, Conventional Commits with a scope |
| ADR | Two: the family policy, the guardrail design |
| Done | Rules green, content corrected, routers updated, gates run |

Directive, same day, revising the two rows below:

| Question | Decision |
| -------- | -------- |
| Framework skills | Create `pix-method-spec-kit`, `pix-method-openspec`, `pix-method-gsd` and a `pix-method` router - one skill per framework, not a single chooser |
| Naming | The whole family is `pix-method-*`; `pix-process-bmad` is renamed `pix-method-bmad`. No `pix-process-*` methodology skill survives |
| Rule home | Refined by the split: rules that name a framework path live in that framework's skill; rules that compare frameworks live in `pix-method` |

The rule-home refinement is the one interview answer this plan changes. It
follows from the family split: `bmad-single-framework` compares `_bmad/`
against `.specify/`, so it cannot belong to the BMAD leaf once the Spec Kit
leaf exists. All five rules keep the same ids, tier and detection.

Creation order: the plan creates the four new skills directly under their
final names. Creating `pix-process-spec-kit` and renaming it in the next
commit would add a rename commit that carries no information; if the literal
two-step history is wanted, it is one extra `git mv` per phase and changes
nothing else.

## Evidence base (verified 2026-10-21)

- `skills/pix-process-bmad/SKILL.md`: **421 lines**, no `guardrails/`, no
  `references/`, no `guardrails:` frontmatter key.
- Line 20 still expands the acronym as **"Build More Architect Dreams"**;
  upstream brands **Breakthrough Method for Agile AI-Driven Development**.
- Line 109-118 documents `pnpx bmad-method install` and no stable / preview
  channel; upstream ships v6.12 stable via `npx bmad-method install` and a v7
  preview via `npx skills add bmad-code-org/BMAD-METHOD`.
- `skills/pix/SKILL.md:182` repeats the stale expansion in the dispatcher
  table, so the fix is two files, not one.
- No `_bmad/`, `_bmad-output/` or `.specify/` anywhere in this repository: the
  tree is a clean negative for every filesystem-shaped rule.
- Ten files mention `pix-process-bmad`: the skill, `pix-process`, the `pix`
  dispatcher, `docs/08-skills.md`, `docs/16-surface-map.md`,
  `docs/plans/skills/README.md`, the `pix-process-tdd` plan, this plan, and
  ADR 149 plus the ADR index.

### What an area is, mechanically

- An area is any `pix-<word>` directory that has `pix-<word>-*` children
  (`src/core/skills/__tests__/_router-child-coverage.test.mjs`). There is no
  whitelist to edit: creating `pix-method-spec-kit` makes `pix-method` an area,
  and the router under it must then link every child.
- An area router may own guardrails: `pix-backend` does.
- A leaf may declare `inherits: [pix-method]` in frontmatter and inherits the
  router's rules (`pix-backend-express` is the precedent).
- `skills/pix/SKILL.md`, `docs/08-skills.md` and `docs/16-surface-map.md` are
  generated by `pnpm census`; the tool name follows the skill name, so
  `pix_process_bmad` becomes `pix_method_bmad` in the same run.
- `src/tools/ai/_rank-skills.js` has no BMAD branch, so the rename needs no
  ranker edit. Its framework-bias list does not name `process` either.
- Rename precedent: ADR 142 (`pix-toolchain-project` → `pix-styleguide-configuration`)
  and ADR 143 (`pix-toolchain-commits` → `pix-styleguide-git`). ADR 143 is the
  template: directory, name, tool name, router rows, cross-references, census.

### How guardrails work here (this constrains the design)

- A rule is `{ id, label, description, check }` exported from
  `skills/<skill>/guardrails/index.js` as `GUARDRAILS`; the engine calls
  `check(code, context)` and `pass: false` is a failure. There is **no severity
  field** - "Tier B" is a wiring decision: these rules ship in their own suite
  and are never added to a blocking gate.
- A rule **imports nothing** (ADR 089): what it needs arrives in `context`.
  Filesystem-shaped rules therefore never touch `fs`; they read an injected
  `context.fileList` (repo-relative POSIX paths).
- Frontmatter `guardrails: [...]` and the exported ids are cross-checked
  (`src/core/layers/_guardrails.js`, `reportDrift`), so ids must match exactly.
- The project-wide graph layer (`src/core/guardrails/project/_checks.js`,
  tokensave-backed) supports `advisory: true`, but needs a probe these rules do
  not: not used here.

## The five rules

| id | Home | Rejects | Reads | Tier |
| -- | ---- | ------- | ----- | ---- |
| `method-single-framework` | `pix-method` | `_bmad/` or `.specify/` or `openspec/` markers for two frameworks with no `FRAMEWORK.md` naming the active one | `context.fileList` | B |
| `method-output-not-in-src` | `pix-method` | `_bmad-output/`, `.specify/` or `openspec/changes/` artifacts committed under `src/` or `skills/` | `context.fileList` | B |
| `bmad-expansion-current` | `pix-method-bmad` | Prose expanding BMAD as "Build More Architect Dreams" | `code` | B |
| `bmad-install-stale` | `pix-method-bmad` | A BMAD install instruction with no channel (stable vs preview), or the retired `npm i -g bmad-method` | `code` | B |
| `bmad-dual-scaffold` | `pix-method-bmad` | Two `_bmad/` roots in one tree, or two manifests recording different method versions | `context.fileList` | B |

The three new framework leaves ship with no rules of their own: they inherit
the router's two cross-framework rules. A leaf earns its own rule only when a
real fixture tree exists that fails it - the same bar the old plan set and then
ignored.

Out of scope by decision: `pnpx` vs `npx` in a quoted install line is tooling
preference, not staleness. The house `pnpm` rule governs our own commands, not
an upstream install path copied into a doc.

### `context.fileList` contract

```
["_bmad/agents/analyst.md", ".specify/specs/001/spec.md", "src/index.js", ...]
```

Repo-relative, POSIX separators, no leading `./`. A rule that receives no
`fileList` returns `{ pass: true, note: "no file list supplied" }` - never a
failure, the same stance the project layer takes on an unreachable graph.

## Phases

### Phase 0 - Lock the decisions

- [x] Interview the owner; fix scope, tier, detection, homes, gates.
- [x] Rewrite this plan in place.
- [x] ADR 149 - one SDD framework per repository, chooser over peer skills.
- [x] ADR 150 - open the `pix-method` area, one skill per framework, rename
      `pix-process-bmad` to `pix-method-bmad`. Supersedes 149; 149 flipped to
      `superseded` and the ADR index was rebuilt in the same step.
- [ ] ADR 151 - filesystem-shaped rules read an injected file list, all Tier B.

### Phase 1 - Structure before content (pure moves)

- [ ] `git mv skills/pix-process-bmad skills/pix-method-bmad`; frontmatter
      `name:`, title line, description.
- [ ] New `skills/pix-method/SKILL.md`: router table with four rows, the
      chooser, `guardrails: [method-single-framework, method-output-not-in-src]`.
- [ ] New leaves `skills/pix-method-spec-kit/`, `pix-method-openspec/`,
      `pix-method-gsd/`: command spine, upstream links, `inherits: [pix-method]`.
- [ ] `skills/pix-process/SKILL.md` drops the methodology rows and points at
      `pix-method`.
- [ ] Census regenerates `skills/pix/SKILL.md`, `docs/08-skills.md`,
      `docs/16-surface-map.md`; README counts move from 85 to 89 skills.
- [ ] `git mv docs/plans/skills/process/pix-process-bmad.md
      docs/plans/skills/method/pix-method.md`: the plan follows its skill into
      the new area.
- [ ] Index rows: `pix-method`, `pix-method-bmad`, `pix-method-spec-kit`,
      `pix-method-openspec`, `pix-method-gsd` in `docs/plans/skills/README.md`
      and `DEPENDENCIES.md`.
- [ ] Gate: `_router-child-coverage`, `_corpus`, `census:check`, docs accuracy.

### Phase 2 - Fixtures first (red)

- [ ] Synthetic trees in the suite: dual framework, output under `src/`,
      duplicate `_bmad/` roots, clean tree.
- [ ] Versioned trees under `tests/fixtures/method/`: `clean/`,
      `dual-framework/`, `output-in-src/`, `dual-scaffold/`, each with a
      one-line `README.md` stating what the tree proves.
- [ ] Five suites written against the final paths and watched to fail with
      "rule not found".

### Phase 3 - The rules

- [ ] `skills/pix-method/guardrails/`: `_single-framework.js`,
      `_output-not-in-src.js`, `index.js`.
- [ ] `skills/pix-method-bmad/guardrails/`: `_expansion-current.js`,
      `_install-stale.js`, `_dual-scaffold.js`, `index.js`.
- [ ] Frontmatter `guardrails:` on both skills, ids equal to the exports.
- [ ] Green the Phase 2 suites.

### Phase 4 - Correct what the rules measure

- [ ] `pix-method-bmad/SKILL.md`: retract "Build More Architect Dreams", state
      the current expansion.
- [ ] Split the install block into stable v6 and preview v7, both dated.
- [ ] `skills/pix/SKILL.md`: the expansion fix survives regeneration (census
      reads the skill, so fix the source, not the table).
- [ ] `bmad-expansion-current` and `bmad-install-stale` pass on this repository.

### Phase 5 - Router and neighbors

- [ ] `skills/pix-process/SKILL.md` quick selection: "spec-driven / Spec Kit /
      OpenSpec / loop" routes to `pix-method`.
- [ ] BM25 tags on `pix-method` gain `spec-driven`, `sdd`, `spec-kit`,
      `openspec`, `gsd`.
- [ ] Routing corpus gains prompts for each of the five skills.
- [ ] One cross-link from `pix-process-ai`: external methodology packs go to
      `pix-method`.
- [ ] Boundary lines for `pix-process-adr` and `pix-process-code-review`: ADR
      policy and human review stay authoritative whatever framework runs.

### Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/pix-method/guardrails/ skills/pix-method-bmad/guardrails/`
- [ ] `pnpm census && pnpm census:check`
- [ ] `pix_tool_check` on the touched files
- [ ] `pnpm lint` and the typecheck task
- [ ] `grep -rn "pix-process-bmad" skills src docs tests prompts` returns only
      historical records (ADRs, changelog)

### Phase 7 - Deferred (not this pass)

- [ ] Cut `pix-method-bmad/SKILL.md` to ~120-150 lines; move install and the
      workflow matrix into dated `references/`.
- [ ] `pix-method/references/landscape.md`: the comparison table, the
      "pick one framework for 90 days" rule, the Kiro data-posture note.
- [ ] A leaf rule for Spec Kit, OpenSpec and GSD once a failing fixture tree
      exists for each.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/pix-method/guardrails/
node --import ./scripts/alias-hook.mjs --test skills/pix-method-bmad/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- Upstream moves fast. The install block corrected in Phase 4 is already a
  dated snapshot; Phase 7 replaces it with a link.
- Trademark: upstream asserts the **BMad** / **BMAD-METHOD** marks. We quote
  the method, claim no affiliation, and retire invented expansions.
- The old plan's three advisory rules carried no fixtures. That is why they
  were never implemented: a rule with no failing test is a paragraph.
- Four framework skills invite the "install both" anti-pattern the landscape
  research warns about. That is exactly why `method-single-framework` sits in
  the router: the family is only safe if the choice is enforceable.

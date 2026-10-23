# rule-method - the methodology family and its guardrails

Status: `planned`
Notes:`planned` Notes:revision 2, 2026-10-21. Written for `skills/rule-process-bmad`; the family it describes is now `rule-method`. This file replaces the previous "best-practice implementation plan" in place, and then supersedes its own single-skill scope: the owner decided on 2026-10-21 that each methodology gets a skill, under a new `rule-method` area.

Area: method. Old index row: `#32`, `rule-process-bmad` (process). Read this
plan together with ADR 149 (superseded by 150) and ADR 150.

## Target surface

| Skill | Home | Role |
| ----- | ---- | ---- |
| `rule-method` | router, new | Chooses between the four frameworks; owns the cross-framework rules |
| `rule-method-bmad` | `rule-process-bmad`, renamed | BMAD: tracks, phases, agents, install |
| `rule-method-spec-kit` | new | GitHub Spec Kit: constitution, specify, plan, tasks, implement, converge |
| `rule-method-openspec` | new | OpenSpec: delta specs, brownfield, minimal ceremony |
| `rule-method-gsd` | new | GSD / Ralph loops / Task Master: unattended and iterative loops |

`rule-process` keeps its other children (adr, code-review, changelog,
npm-release, readme, tdd, ai) and gains one line pointing methodology questions
at `rule-method`.

## Scope decisions (owner)

Interview, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Where we restart | Plan rewritten from scratch, in place at this path |
| Skill body | `SKILL.md` stays structurally unchanged - no cut to 120-150 lines, no `references/` split in this pass |
| Corrections that are not a cut | The stale expansion and the stale install block **are** corrected; rule `bmad-expansion-current` is otherwise red on our own tree |
| Neighbors | All four boundaries in scope (`rule-process`, `rule-process-ai`, `rule-process-adr`, `rule-process-code-review`) |
| Rule set | Five rules: `bmad-single-framework`, `bmad-output-not-in-src`, `bmad-expansion-current` plus `bmad-install-stale` and `bmad-dual-scaffold` |
| Tier | All Tier B (advisory). Nothing blocking in this pass |
| Detection | Filesystem markers, limited text scan, skill frontmatter |
| Fixtures | Synthetic trees in the tests **and** versioned trees on disk |
| Flow | Failing test first, then the rule |
| Gates | Rule suite, corpus suites, `rule_tool_check`, census, lint + typecheck |
| Commits | One per phase, Conventional Commits with a scope |
| ADR | Two: the family policy, the guardrail design |
| Done | Rules green, content corrected, routers updated, gates run |

Directive, same day, revising the two rows below:

| Question | Decision |
| -------- | -------- |
| Framework skills | Create `rule-method-spec-kit`, `rule-method-openspec`, `rule-method-gsd` and a `rule-method` router - one skill per framework, not a single chooser |
| Naming | The whole family is `rule-method-*`; `rule-process-bmad` is renamed `rule-method-bmad`. No `rule-process-*` methodology skill survives |
| Rule home | Refined by the split: rules that name a framework path live in that framework's skill; rules that compare frameworks live in `rule-method` |

The rule-home refinement is the one interview answer this plan changes. It
follows from the family split: `bmad-single-framework` compares `_bmad/`
against `.specify/`, so it cannot belong to the BMAD leaf once the Spec Kit
leaf exists. All five rules keep the same ids, tier and detection.

Creation order: the plan creates the four new skills directly under their
final names. Creating `rule-process-spec-kit` and renaming it in the next
commit would add a rename commit that carries no information; if the literal
two-step history is wanted, it is one extra `git mv` per phase and changes
nothing else.

## Evidence base (verified 2026-10-21)

- `skills/rule-process-bmad/SKILL.md`: **421 lines**, no `guardrails/`, no
  `references/`, no `guardrails:` frontmatter key.
- Line 20 still expands the acronym as **"Build More Architect Dreams"**;
  upstream brands **Breakthrough Method for Agile AI-Driven Development**.
- Line 109-118 documents `pnpx bmad-method install` and no stable / preview
  channel; upstream ships v6.12 stable via `npx bmad-method install` and a v7
  preview via `npx skills add bmad-code-org/BMAD-METHOD`.
- `skills/rule/SKILL.md:182` repeats the stale expansion in the dispatcher
  table, so the fix is two files, not one.
- No `_bmad/`, `_bmad-output/` or `.specify/` anywhere in this repository: the
  tree is a clean negative for every filesystem-shaped rule.
- Ten files mention `rule-process-bmad`: the skill, `rule-process`, the `rule`
  dispatcher, `docs/09-skills.md`, `docs/17-surface-map.md`,
  `docs/plans/skills/README.md`, the `rule-process-tdd` plan, this plan, and
  ADR 149 plus the ADR index.

### What an area is, mechanically

- An area is any `rule-<word>` directory that has `rule-<word>-*` children
  (`src/core/skills/__tests__/_router-child-coverage.test.mjs`). There is no
  whitelist to edit: creating `rule-method-spec-kit` makes `rule-method` an area,
  and the router under it must then link every child.
- An area router may own guardrails: `rule-backend` does.
- A leaf may declare `inherits: [rule-method]` in frontmatter and inherits the
  router's rules (`rule-backend-express` is the precedent).
- `skills/rule/SKILL.md`, `docs/09-skills.md` and `docs/17-surface-map.md` are
  generated by `pnpm census`; the tool name follows the skill name, so
  `pix_process_bmad` becomes `pix_method_bmad` in the same run.
- `src/tools/ai/_rank-skills.js` has no BMAD branch, so the rename needs no
  ranker edit. Its framework-bias list does not name `process` either.
- Rename precedent: ADR 142 (`rule-toolchain-project` → `rule-styleguide-configuration`)
  and ADR 143 (`rule-toolchain-commits` → `rule-styleguide-git`). ADR 143 is the
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
| `method-single-framework` | `rule-method` | `_bmad/` or `.specify/` or `openspec/` markers for two frameworks with no `FRAMEWORK.md` naming the active one | `context.fileList` | B |
| `method-output-not-in-src` | `rule-method` | `_bmad-output/`, `.specify/` or `openspec/changes/` artifacts committed under `src/` or `skills/` | `context.fileList` | B |
| `bmad-expansion-current` | `rule-method-bmad` | Prose expanding BMAD as "Build More Architect Dreams" | `code` | B |
| `bmad-install-stale` | `rule-method-bmad` | A BMAD install instruction with no channel (stable vs preview), or the retired `npm i -g bmad-method` | `code` | B |
| `bmad-dual-scaffold` | `rule-method-bmad` | Two `_bmad/` roots in one tree, or two manifests recording different method versions | `context.fileList` | B |

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

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

Produces: `rule-method`

### Phase 0 - Lock the decisions

- [x] Interview the owner; fix scope, tier, detection, homes, gates.
- [x] Rewrite this plan in place.
- [x] ADR 149 - one SDD framework per repository, chooser over peer skills.
- [x] ADR 150 - open the `rule-method` area, one skill per framework, rename
      `rule-process-bmad` to `rule-method-bmad`. Supersedes 149; 149 flipped to
      `superseded` and the ADR index was rebuilt in the same step.
- [ ] ADR 151 - filesystem-shaped rules read an injected file list, all Tier B.

### Phase 1 - Structure before content (pure moves)

- [ ] `git mv skills/rule-process-bmad skills/rule-method-bmad`; frontmatter
      `name:`, title line, description.
- [ ] New `skills/rule-method/SKILL.md`: router table with four rows, the
      chooser, `guardrails: [method-single-framework, method-output-not-in-src]`.
- [ ] New leaves `skills/rule-method-spec-kit/`, `rule-method-openspec/`,
      `rule-method-gsd/`: command spine, upstream links, `inherits: [rule-method]`.
- [ ] `skills/rule-process/SKILL.md` drops the methodology rows and points at
      `rule-method`.
- [ ] Census regenerates `skills/rule/SKILL.md`, `docs/09-skills.md`,
      `docs/17-surface-map.md`; README counts move from 85 to 89 skills.
- [ ] `git mv docs/plans/skills/process/rule-process-bmad.md
      docs/plans/skills/method/rule-method.md`: the plan follows its skill into
      the new area.
- [ ] Index rows: `rule-method`, `rule-method-bmad`, `rule-method-spec-kit`,
      `rule-method-openspec`, `rule-method-gsd` in `docs/plans/skills/README.md`
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

- [ ] `skills/rule-method/guardrails/`: `_single-framework.js`,
      `_output-not-in-src.js`, `index.js`.
- [ ] `skills/rule-method-bmad/guardrails/`: `_expansion-current.js`,
      `_install-stale.js`, `_dual-scaffold.js`, `index.js`.
- [ ] Frontmatter `guardrails:` on both skills, ids equal to the exports.
- [ ] Green the Phase 2 suites.

### Phase 4 - Correct what the rules measure

- [ ] `rule-method-bmad/SKILL.md`: retract "Build More Architect Dreams", state
      the current expansion.
- [ ] Split the install block into stable v6 and preview v7, both dated.
- [ ] `skills/rule/SKILL.md`: the expansion fix survives regeneration (census
      reads the skill, so fix the source, not the table).
- [ ] `bmad-expansion-current` and `bmad-install-stale` pass on this repository.

### Phase 5 - Router and neighbors

- [ ] `skills/rule-process/SKILL.md` quick selection: "spec-driven / Spec Kit /
      OpenSpec / loop" routes to `rule-method`.
- [ ] BM25 tags on `rule-method` gain `spec-driven`, `sdd`, `spec-kit`,
      `openspec`, `gsd`.
- [ ] Routing corpus gains prompts for each of the five skills.
- [ ] One cross-link from `rule-process-ai`: external methodology packs go to
      `rule-method`.
- [ ] Boundary lines for `rule-process-adr` and `rule-process-code-review`: ADR
      policy and human review stay authoritative whatever framework runs.

### Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-method/guardrails/ skills/rule-method-bmad/guardrails/`
- [ ] `pnpm census && pnpm census:check`
- [ ] `rule_tool_check` on the touched files
- [ ] `pnpm lint` and the typecheck task
- [ ] `grep -rn "rule-process-bmad" skills src docs tests prompts` returns only
      historical records (ADRs, changelog)

### Phase 7 - Deferred (not this pass)

- [ ] Cut `rule-method-bmad/SKILL.md` to ~120-150 lines; move install and the
      workflow matrix into dated `references/`.
- [ ] `rule-method/references/landscape.md`: the comparison table, the
      "pick one framework for 90 days" rule, the Kiro data-posture note.
- [ ] A leaf rule for Spec Kit, OpenSpec and GSD once a failing fixture tree
      exists for each.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Lock the decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Structure before content (pure moves) | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 3 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 4 - Correct what the rules measure | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 5 - Router and neighbors | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 6 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |
| Phase 7 - Deferred (not this pass) | `T7-author` | `qwen3.8-max` | skill bodies and references |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-method/guardrails/
node --import ./scripts/alias-hook.mjs --test skills/rule-method-bmad/guardrails/
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

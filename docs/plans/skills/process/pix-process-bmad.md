# rule-process-bmad - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`. Order: `docs/plans/skills/DEPENDENCIES.md`, after `rule-process-ai`.

Area: process. Order: reverse alphabetical, thirty-second skill (`#32` in the index).

## Evidence base

### This repository

- `skills/rule-process-bmad/SKILL.md`: **421 lines**, no `guardrails/`, no `references/`.
  It mirrors an external product: phases, tracks, install, agents, every workflow
  name, customization TOML, and a full command matrix.
- Expansion in the skill title line: **"Build More Architect Dreams"**. Upstream
  today brands **Breakthrough Method for Agile AI-Driven Development**
  ([bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD),
  ~54k stars as of this write-up).
- Install text says `pnpx bmad-method install` and a `_bmad/` + `_bmad-output/`
  layout. Upstream README (fetched 2026-10-21) ships **v6.12 stable** via
  `npx bmad-method install` and a **v7 preview** via `npx skills add
  bmad-code-org/BMAD-METHOD`, with `uv` + Python required. The skill is already
  behind the install story.
- `skills/rule-process/SKILL.md`: routes "Need a development methodology?" to
  this skill. Quick selection has no Spec Kit / OpenSpec / SDD wording.
- `skills/rule-process-ai/SKILL.md`: owns the house AI lifecycle (intent → plan →
  gates → review → scope). Overlaps BMAD's "plan before build" message without
  naming BMAD.
- `skills/rule-process-code-review/SKILL.md` + `rule_tool_impersonation`: own
  review machinery that BMAD's `bmad-code-review` would duplicate if both ran.
- No BMAD install artifacts (`_bmad/`, `_bmad-output/`) in this repository.
- Routing corpus: no dedicated `process-bmad` prompts found in a quick scan of
  `tests/fixtures/routing-corpus.mjs` (methodology prompts lean process-ai /
  process area). Worth confirming in Phase 1.

### Public landscape (fetched / searched 2026-10-21)

Sources: [BMAD-METHOD README](https://github.com/bmad-code-org/BMAD-METHOD),
[GitHub Spec Kit](https://github.com/github/spec-kit) (~142k stars),
[Konabos comparison (2026-04-30)](https://konabos.com/blog/choosing-an-ai-development-framework-a-practical-guide-for-individuals-teams-and-organizations),
plus secondary coverage of OpenSpec, GSD, Task Master, Ralph loops, AWS Kiro.

| Framework | Kind | Fit | Notes |
| --------- | ---- | --- | ----- |
| **BMAD Method** | Multi-agent SDLC + modules | Deep greenfield planning, persona collaboration | Heaviest learning curve; scale-adaptive tracks; ecosystem modules (Test Architect, Game Dev, Loop, …) |
| **GitHub Spec Kit** | Spec-Driven Development toolkit | Default for many teams; agent-agnostic | Phases: constitution → specify → plan → tasks → implement → converge; also bug-fix and idea-assessment extensions |
| **OpenSpec** (Fission AI) | Lightweight SDD | Brownfield, small teams | Delta specs; "fluid not rigid"; fewer gates |
| **AWS Kiro** | Proprietary IDE | AWS-centric shops | Not a bolt-on methodology; data-posture review required |
| **GSD / Ralph / Task Master** | Agent loops & task boards | Unattended or iterative coding loops | Complementary to specs, not full SDLC replacements |
| **AGENTS.md / CLAUDE.md** | Convention | Individuals, tiny teams | Often enough before any framework |

Konabos' operational rule, repeated across community threads: **pick one
framework and run it for ~90 days**. Parallel frameworks create dual training
paths and constant "which one for this ticket?" debates.

Problems found:

| Problem | Detail |
| ------- | ------ |
| stale upstream mirror | 421 lines restate install, agents and workflows that already moved (v6.12 / v7, naming, `uv`) |
| wrong expansion | "Build More Architect Dreams" is not the current official expansion |
| no landscape | a reader asking "methodology?" never hears Spec Kit or OpenSpec, which dominate 2026 SDD discourse |
| overlaps house process | `rule-process-ai`, ADR, code-review, handoff already cover much of "structure before code" without BMAD |
| zero enforceable rules | a paste of external docs cannot fail a check; nothing owns `_bmad` hygiene if someone does install |
| dual-framework risk | if we add full sibling skills for Spec Kit and OpenSpec, we teach the anti-pattern Konabos warns against |
| size | 421 lines is a documentation site, not a skill the ranker or an agent should swallow whole |

## Recommendation: affix by chooser, not by sibling skills

**Do not** create `rule-process-spec-kit`, `rule-process-openspec`, or
`rule-process-gsd` as peer skills in this pass.

**Do** keep one methodology skill (`rule-process-bmad`) and give it:

1. A **when to use which** chooser (BMAD vs Spec Kit vs OpenSpec vs house
   `rule-process-ai` + project instruction files).
2. A **thin BMAD guide**: official links, install pointers that age in
   `references/`, and the three tracks in one table — not the full workflow
   encyclopedia.
3. Explicit **non-goals**: this skill does not replace `rule-process-ai`,
   `rule-process-adr`, or `rule-process-code-review`.

Rationale: the market already treats these as **alternative frameworks**, not
layers you stack. Affixing them as equal skills in the catalog invites "install
both." Affixing them as a chooser inside one skill matches how practitioners
actually decide, and keeps the surface map honest.

If later traffic shows Spec Kit prompts dominating the corpus, **then** promote
a dedicated thin skill. Until measured, one skill + landscape reference is
enough.

## Decisions

| Question | Decision |
| -------- | -------- |
| Skill id | Keep `rule-process-bmad` (no rename this pass). Tags gain `spec-driven`, `sdd`, `spec-kit`, `openspec` so BM25 can reach it from those words |
| Shape | Cut `SKILL.md` to ~120–150 lines. Move install and the long workflow matrix to `references/` that **link upstream** instead of forking docs |
| Expansion | Correct to **Breakthrough Method for Agile AI-Driven Development**; retire "Build More Architect Dreams" |
| Landscape | New `references/landscape.md`: BMAD, Spec Kit, OpenSpec, Kiro, GSD/Ralph/Task Master, AGENTS.md — with "pick one" rule |
| Default advice | Greenfield product with unknown architecture → BMAD. Most feature work / widest agent support → Spec Kit. Brownfield delta changes / minimal ceremony → OpenSpec. This repository's own discipline without an external install → `rule-process-ai` (+ ADR / review / handoff) |
| Dual install | Skill states: do not run two SDD frameworks in one repo. Switching requires an explicit teardown of the other |
| Guardrails | Three advisory rules (below). No Tier A until a real BMAD fixture tree exists in the test corpus |
| Delivery | Plan only |

## Workstream A - Cut the mirror, keep the map

| Today in `SKILL.md` | Disposition |
| ------------------- | ----------- |
| Full workflow matrix (30+ commands) | Delete from body; one-line "see upstream docs" + optional `references/workflows.md` that is a **dated snapshot** with a "verify on docs.bmad-method.org" banner |
| Inline install (`pnpx`, old layout) | `references/install.md` with stable v6 and preview v7 paths copied from upstream on the day of the edit, plus link |
| Agent customization / TOML merge rules | Link upstream; do not restate |
| Four phases + three tracks | Stay in the body (the useful core) |
| Fresh chats / BMad-Help | Stay, short |

## Workstream B - Landscape chooser

`references/landscape.md` holds the comparison table from the evidence base,
plus:

- Spec Kit command spine (`constitution` / `specify` / `plan` / `tasks` /
  `implement` / `converge`) as orientation only.
- OpenSpec delta-spec one-pager.
- "Start with AGENTS.md" escape hatch.
- Explicit row: **this MCP server** already supplies process-ai, ADR, review,
  handoff — use those when the user wants house rules without installing a
  third-party methodology pack.

`SKILL.md` opens with a five-row "choose your path" table that links into that
reference.

## Workstream C - Boundaries with house skills

| Neighbor | Boundary |
| -------- | -------- |
| `rule-process-ai` | Lifecycle, scope, prose, English — always on. BMAD is optional external orchestration |
| `rule-process-adr` | Decisions still land as ADRs when structural; BMAD architecture docs do not replace ADR policy |
| `rule-process-code-review` | Human/persona review remains authoritative; BMAD code-review is an upstream workflow, not a second house standard |
| `rule-process` router | Quick selection keeps BMAD for "full methodology pack"; add a line for "spec-driven / Spec Kit / OpenSpec → see rule-process-bmad landscape" so those words route here |

## Workstream D - Guardrails (advisory)

| Rule id | Rejects | Tier |
| ------- | ------- | ---- |
| `bmad-single-framework` | A tree that contains both `_bmad/` (or BMAD skill markers) **and** `.specify/` (Spec Kit) without a `FRAMEWORK.md` (or equivalent) naming the active one | B |
| `bmad-output-not-in-src` | `_bmad-output/` (or `.specify/`) planning artifacts committed under `src/` or `skills/` | B |
| `bmad-expansion-current` | Skill or project docs that still expand BMAD as "Build More Architect Dreams" | B |

No blocking rules in v1: false positives on monorepos that legitimately vendor
examples would be worse than silence.

## Phases

### Phase 0 - Evaluation and decisions

- [x] Audit the skill against upstream BMAD (v6.12 / v7) and the 2026 SDD landscape.
- [x] Decide: chooser inside one skill, not new peer skills.
- [x] Create this plan and flip the index row to `planned`.

### Phase 1 - Correct and cut

- [ ] Fix the expansion and the install pointers (dated `references/install.md`).
- [ ] Cut `SKILL.md` to ~120–150 lines; add `references/landscape.md`.
- [ ] Add BM25 tags for `spec-kit`, `openspec`, `sdd`.
- [ ] Gate: skill corpus tests; spot-check routing for "spec kit" / "openspec" / "bmad".

### Phase 2 - Router and neighbors

- [ ] Update `rule-process` quick selection.
- [ ] One cross-link from `rule-process-ai` ("external methodology packs → bmad skill landscape").
- [ ] Gate: router-child-coverage green.

### Phase 3 - Advisory guardrails

- [ ] Fixtures for dual-framework and output-path cases.
- [ ] Implement the three Tier B rules.
- [ ] Gate: rule suites green; this repository (no `_bmad`) stays clean.

### Phase 4 - Verification

- [ ] `pnpm census` / surface map if frontmatter `guardrails:` changes.
- [ ] Confirm no second methodology skill was added without a measured demand note.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-process-bmad/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- Upstream moves fast (v7 alpha ETA called out as 2026-10-16 on the README
  fetched today). Any workflow matrix we keep will rot; prefer links.
- Promoting Spec Kit to its own skill later is allowed if the routing corpus
  shows sustained demand. The kill criterion for keeping a single skill: fewer
  than a handful of distinct Spec Kit / OpenSpec prompts in the corpus after
  tags are added.
- Trademark: upstream asserts **BMad** / **BMAD-METHOD** marks. The skill must
  not invent alternate expansions or imply affiliation beyond "how to use the
  open-source method."
- Kiro is documented in the landscape as proprietary IDE, not recommended as a
  bolt-on beside this MCP server.

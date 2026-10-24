# rule-process-adr - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Nothing is implemented here: the owner asked for the plan, the code waits for a later pass. Index row `#34`, currently `pending`.

Area: process. Sibling plans: `rule-process-ai` (the prose and scope rules this
plan obeys), `rule-process-bmad` (the family this plan's guardrails pattern is
copied from).

## Scope decisions (owner, 2026-10-21)

| Question               | Decision                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass     | **Plan only.** Rules, tool fixes and content land in a later pass                                                                                                                 |
| Skill shape            | Align the body to what the tool really does **and** restructure it around the workflow: when to write an ADR, how to write it, how it gets superseded                             |
| Tool gaps              | All three are in scope for the implementation pass: expose `endsWhen`, expose `--alternatives`, validate the supersede link                                                       |
| Conventions to declare | `What would end this` is mandatory; the author is a person or a team, never the server name; three-digit numbering; explicit supersede in both directions; English title and slug |
| Rule set               | Six rules: naming, status vocabulary, author line, ends-when, derived index, English                                                                                              |
| Tier                   | All Tier B (advisory)                                                                                                                                                             |
| Detection              | Parsed header fields for status and author, text patterns for slug and sections, injected `fileList` for the index check                                                          |
| Fixtures               | Both: entries in `tests/fixtures/guardrail-corpus.mjs` and versioned ADR trees on disk                                                                                            |
| Rule home              | Like `rule-process-ai`: rule files in `skills/rule-process-adr/guardrails/`, cases in the shared corpus                                                                           |
| Flow                   | Failing test first, then the rule                                                                                                                                                 |
| Gates                  | Skill suite, tool suite, corpora, clean repository ADRs, census, lint and typecheck                                                                                               |
| Commits                | One per phase                                                                                                                                                                     |
| ADR                    | Two records: the ADR conventions, the guardrail design. Written in the implementation pass, not now                                                                               |

## Evidence base (measured 2026-10-21)

`skills/rule-process-adr/SKILL.md` is 100 lines, has no `guardrails/`, no
`references/`, no `guardrails:` frontmatter key, and no rule of any kind. That
last part is the finding: the skill documents the format of every decision the
project records and enforces none of it.

### The body is stale in four places

| Where        | What it says                                             | What the code does                                                                                                       |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Template     | `- **Author**: rule-mcp`                                 | `adrAuthor()` stamps `Name <email>` from the git identity, and falls back to `rule-mcp` only when git has no `user.name` |
| Example call | `"title": "Usare PostgreSQL"` with Italian context lines | The tool refuses non-English input: `adrEnglishOffenses` returns `isError: true` and lists the offenses                  |
| Template     | `## Consequences` with `### Positive` / `### Negative`   | `generateAdr` writes one flat Consequences paragraph, then a `## What would end this` section                            |
| Template     | No `## What would end this`                              | Every generated ADR carries it (line 34 of `_body.js`)                                                                   |

### Three real gaps in the tooling

1. `generateAdr` accepts `endsWhen` and writes it, but neither `ADRSchema` nor
   the `adr new` CLI passes it, so **every tool-written ADR gets the
   placeholder** "The assumption this leans on, and the observation that would
   make it wrong." Ninety-four ADRs have the section, 56 do not.
2. `ADRSchema` accepts `alternatives`, the CLI has no `--alternatives` flag.
3. A `superseded` status is accepted with no reference to the record that
   replaces it. Seven ADRs are `superseded` and name no successor; ADR 149 was
   flipped by hand today for exactly this reason.

### What the six rules would say about the 150 ADRs on disk today

| Rule                    | State of the corpus                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `adr-file-naming`       | clean: 150 of 150 match `^[0-9]{3}-[a-z0-9-]+\.md$`                                                                       |
| `adr-author-line`       | clean: no ADR names the server as author                                                                                  |
| `adr-english`           | clean by construction: the tool refuses non-English input                                                                 |
| `adr-ends-when`         | **56 violations**: every record from ADR 091 on carries the section; all 56 gaps sit at ADR 090 or below                  |
| `adr-status-vocabulary` | **~13 non-canonical values** (`superseded (area siblings; ...)` and similar) plus **7 `superseded` records with no link** |
| `adr-index-derived`     | unknown: the index is regenerated on every write, so a mismatch means somebody edited `ADR.md` by hand                    |

Two of the six rules are therefore red on the repository the day they land. The
gate "the 150 existing ADRs stay clean" cannot be met by retrofitting history:
old decisions are immutable by the skill's own first paragraph. The plan needs
a grandfathering policy, or the suite is red forever and gets ignored - the
failure mode the old BMAD plan named and then repeated.

### Grandfathering, by precedent

`src/core/skills/__tests__/_router-child-coverage.test.mjs` keeps a
`scripts/data/router-gaps.data.mjs` list of pre-existing gaps and asserts the
list **only shrinks**. The same shape applies here:

- `scripts/data/adr-legacy.data.mjs` lists the ADR numbers that predate each
  rule, one array per rule.
- The suite asserts every entry is still a violation (a fixed legacy ADR must
  be removed from the list, or the list rots into a blanket exemption).
- New rules apply from ADR 151 onward with no exemption at all.

## The six rules

| id                      | Rejects                                                                                                        | Reads                           | Tier | Legacy list                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---- | --------------------------------------------------------------- |
| `adr-file-naming`       | A file not matching `NNN-kebab-slug.md` with three digits and an English slug                                  | `context.fileList`              | B    | none, corpus is clean                                           |
| `adr-status-vocabulary` | A status outside `proposed / accepted / deprecated / superseded`, or `superseded` with no `by [NNN]` reference | parsed header                   | B    | numbers 039, 079, 080, 085, 087, 097, 106 plus the ~13 variants |
| `adr-author-line`       | A missing `Author`, or one naming the serving tool (`rule-mcp`, `rule-mcp`, `agent`, `claude`)                 | parsed header                   | B    | none, corpus is clean                                           |
| `adr-ends-when`         | A missing `## What would end this`, or the generated placeholder kept verbatim                                 | `code`                          | B    | the 56 ADRs numbered 090 and below                              |
| `adr-index-derived`     | An ADR on disk missing from `docs/adr/ADR.md`, or an index row naming a file that does not exist               | `context.fileList` + index rows | B    | none: the index is regenerated on write                         |
| `adr-english`           | Non-English title, slug or prose, so the tool's blocking gate also exists as a checkable rule                  | `code`                          | B    | none, the tool already refuses these                            |

The English rule duplicates a check that already runs inside the tool. That is
deliberate: the tool refuses writes, the rule explains a file that arrived some
other way (hand-written, pasted, generated by another agent).

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR for the ADR conventions: ends-when mandatory, real author, three
      digits, explicit supersede, English slug.
- [ ] ADR for the guardrail design: tier B, dual detection, legacy lists that
      only shrink.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/adr/` trees: `clean/`, `bad-slug/`, `bad-status/`,
      `orphan-superseded/`, `placeholder-ends-when/`, `index-drift/`. Each with
      a one-line `README.md` stating what it proves.
- [ ] Six `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs`, labeled
      good/bad, one per rule.
- [ ] `scripts/data/adr-legacy.data.mjs` seeded from the measured numbers above.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-process-adr/guardrails/`: one `_rule-name.js` per rule plus
      `index.js`, in the `rule-process-ai` shape.
- [ ] Frontmatter `guardrails: [...]` on `SKILL.md`, ids equal to the exports.
- [ ] Green the Phase 1 suites; the suite asserts the legacy lists only shrink.

### Phase 3 - Close the tool gaps

- [ ] `ADRSchema` and `adr new` gain `endsWhen` (`--ends-when`).
- [ ] `adr new` gains `--alternatives`, repeatable.
- [ ] A `superseded` ADR must name its successor, in the tool and in the CLI;
      document the two-way edit (old record gains `by [NNN]`, new gains
      `supersedes [NNN]`).
- [ ] Tool tests in `src/tools/adr/__tests__/`.

### Phase 4 - Align the skill body

- [ ] Rewrite the template to the sections `generateAdr` really writes, author
      line included.
- [ ] Replace the Italian example with an English one the tool would accept.
- [ ] Restructure around the workflow: when to record, how to write it, how it
      is superseded, what makes it wrong later.
- [ ] State the five conventions as rules of the house, not as preferences.

### Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-process-adr/guardrails/`
- [ ] `node --import ./scripts/alias-hook.mjs --test src/tools/adr/__tests__/`
- [ ] `_corpus` and `_routing-corpus` suites.
- [ ] Every ADR outside the legacy lists passes all six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Close the tool gaps  | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Align the skill body | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 5 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-process-adr/guardrails/
node --import ./scripts/alias-hook.mjs --test src/tools/adr/__tests__/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- Retrofitting the 56 ADRs without the section is allowed and cheap (a one-line
  assumption each), but it is historical editing. The legacy list makes it
  optional; a pass that fixes them can shrink the list to zero.
- `adr-index-derived` is the only rule that guards the index, and the index is
  generated. If the check ever needs to compare rows, it compares the file set,
  not the prose: the one-liners come from the first sentence of Context.
- This skill is the one that records decisions about itself. The two ADRs in
  Phase 0 are the first test of the conventions they establish.
- Routing corpus: no dedicated `adr` prompts were counted for this plan. Phase
  5 checks whether "record a decision" reaches `rule-process-adr` at all, and
  adds prompts only if it does not.

# rule-process-changelog - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`. Order: `docs/plans/skills/DEPENDENCIES.md`, after `rule-process-ai`.

Area: process. Order: reverse alphabetical, thirty-first skill (`#31` in the index).

## Evidence base

Read and measured in this session:

- `skills/rule-process-changelog/SKILL.md`: 161 lines. Sections: purpose, the
  conventional-commit prerequisite (with an inline hook script), when to
  generate, do-not-gate-on-freshness, type-to-section table, tags and shallow
  clones, entry shape, formatter ignore, seven-item checklist, see also.
- `skills/rule-process-changelog/guardrails/`: absent. The skill owns no rule.
- `scripts/build/changelog/`: the generator this skill describes, already
  built here — `index.mjs` (preamble, `build`/`write`/`check`), `_history.mjs`,
  `_render.mjs` (shared `parseCommitMessage` + `stripFingerprint`),
  `_sections.mjs` (`SECTION_FOR_TYPE`, `SECTION_ORDER`), and
  `__tests__/_check.test.mjs`.
- `tests/docs/changelog.test.mjs`, `tests/docs/changelog-header.test.mjs`,
  `tests/docs/version-sync.test.mjs`: prior art that already pins the header,
  the entry form, and agreement between package.json, server.json and the
  newest CHANGELOG heading.
- `.github/workflows/ci.yml` (release-preview job): runs
  `changelog/index.mjs --check` **only when tags exist**; skips when the
  boundary is undefined. Matches ADR 127.
- `.github/workflows/release.yml`: extracts the tagged CHANGELOG entry into the
  GitHub Release body; checkout uses `fetch-depth: 0`.
- `src/core/commit/`: the real commit-msg / pre-push hooks
  (`rule-mcp commit-lint`), not the inline shell snippet in the skill.
- `skills/rule-process/SKILL.md`: the skill is in the area table; it is **not**
  in the quick-selection guide.
- `skills/rule-styleguide-git/SKILL.md`: owns the Conventional Commit rule and
  the hook story this skill depends on.
- `skills/rule-process-npm-release/SKILL.md`: owns the release the changelog is
  generated for; already links here.
- `skills/rule-platform-library/SKILL.md`: still teaches a hand-written
  CHANGELOG and `pnpm changeset version` as the default publish path.
- `skills/rule-process-readme/SKILL.md`: frontmatter excludes CHANGELOG work;
  body still mentions a "hand-maintained changelog" in one line.
- Keep a Changelog 1.1.0 sections: Added, Changed, Deprecated, Removed, Fixed,
  Security. This repository (and the skill) add **Documentation** for `docs`
  and omit Deprecated / Security.
- Routing corpus: four prompts already expect `process-changelog`.

Problems found:

| Problem | Detail |
| ------- | ------ |
| skill disagrees with ADR 127 | the skill says never gate on freshness; this repository gates byte-identity with `--check` once tags define the release boundary, and skips only when there are no tags |
| the hook is a second source | a 7-line `commit-msg` script is pasted in the skill while `src/core/commit` and `rule-styleguide-git` own the real hook; the two will drift |
| zero skill guardrails | twelve checkable claims sit in prose while the author's own tests already enforce several of them outside the skill family |
| quick selection omits it | the area router table lists changelog; the quick-selection guide does not, so routing by glance misses it |
| KaC extension is undeclared | `Documentation` is not a Keep a Changelog section; Deprecated and Security are missing; the skill claims KaC without naming the house delta |
| platform-library contradicts | library skill still says hand-write CHANGELOG / use changesets, which fights "generate from commits" |
| formatter ignore is unchecked | the skill requires CHANGELOG on the formatter ignore list; this repository has no matching ignore entry for it under prettier/biome configs searched |
| the checklist is a second source | seven items restate the body and will drift the moment either side moves |

## Decisions

| Question | Decision |
| -------- | -------- |
| Freshness gate | Align the skill with ADR 127: **shape always**; **byte-identity `--check` when tags exist**; skip when the clone has no tags. The skill's "never gate freshness" paragraph is rewritten, not kept |
| Hook ownership | Delete the inline hook script. Point at `rule-styleguide-git` and at `rule-mcp commit-lint` / `src/core/commit`. One sentence: a documented hook that is not installed is not a hook |
| KaC mapping | Keep `Documentation` for `docs` as a **documented house extension**. Add an explicit "delta from Keep a Changelog" note. Do not invent Deprecated/Security entries from commit types that do not exist in the Conventional Commit set this project uses |
| Boundary | This skill owns generation policy, type→section mapping, entry shape, and when CI may check. `rule-styleguide-git` owns the commit rule. `rule-process-npm-release` owns the publish workflow. `rule-platform-library` links here for libraries that generate; changesets stay an acknowledged monorepo alternative, not the default advice |
| Shape of the body | Cut to about 120 lines. Move the shallow-clone checkout snippet and the long conflict essay into `references/ci-and-checkout.md` |
| Guardrails | Five rules (table below): two blocking, three advisory |
| Router | Add a quick-selection line for changelog |
| Delivery | Plan only |

## Workstream A - Align the skill with the generator and ADR 127

Rewrite the "Do not gate the changelog on being current" section to the policy
this repository already runs:

1. Between tags, the unreleased section moves every commit; do not fail a PR
   solely because Unreleased drifted.
2. When tags exist, `changelog --check` is a gate: the committed file must equal
   a fresh generation (release job regenerates before tag; CI verifies).
3. Always gate **shape**: preamble identity and entry-line form (already in
   `tests/docs/changelog*.test.mjs`).

The type→section table stays the source of truth and must match
`scripts/build/changelog/_sections.mjs` exactly. A content test (or a shared
import in a skill-side fixture) fails when they diverge.

## Workstream B - Cut the body, keep the claims

| Section of today's file | Goes to |
| ----------------------- | ------- |
| Inline `commit-msg` shell script | deleted; link to `rule-styleguide-git` |
| Long pre-commit conflict essay | `references/ci-and-checkout.md` (keep a three-line summary in the body) |
| checkout `fetch-depth: 0` YAML | same reference |
| Seven-item checklist | the rule table (what a rule enforces) plus the two items a rule cannot see (installed hook; human confirms release cadence) |

Target: about 120 lines, no claim without a home.

## Workstream C - The five rules

| Rule id | Rejects | Tier | Prior art |
| ------- | ------- | ---- | --------- |
| `changelog-header-generated` | a `CHANGELOG.md` whose opening lines are not the generated preamble (or a documented consumer equivalent marker) | A | `CHANGELOG_PREAMBLE`, `tests/docs/changelog-header.test.mjs` |
| `changelog-entry-shape` | an entry line under a release heading that is not `- **scope**: subject (\`hash\`)` or the BREAKING form | A | `_render.mjs`, `tests/docs/changelog.test.mjs` |
| `changelog-omitted-types-stated` | a generated-style changelog that never says which Conventional Commit types are left out | B | preamble paragraph in this repo |
| `changelog-formatter-ignored` | prettier/biome (when present) that would format `CHANGELOG.md` | B | skill checklist item 6; currently unmet here |
| `changelog-release-fetch-depth` | a release (or changelog-check) workflow whose checkout lacks `fetch-depth: 0` when it reads git history | A | `.github/workflows/ci.yml` / `release.yml` |

False-positive notes the fixtures must carry: a hand-written CHANGELOG that
explicitly opts out of generation (marker or frontmatter) skips the generated
header rules; a local action path is irrelevant here; a workflow that never
touches git history does not need depth zero.

## Workstream D - Neighbor boundaries

1. `rule-process` quick selection: add
   `Need a changelog from the commits? → rule-process-changelog`.
2. `rule-platform-library`: replace the hand-write / changesets-default block
   with a pointer to this skill for the generated default, and one short note
   that changesets remain valid for multi-package version trains.
3. `rule-process-readme`: drop or rephrase the "hand-maintained changelog"
   fragment so it does not contradict this skill.
4. `rule-styleguide-git` / `rule-process-npm-release`: keep bidirectional links;
   no ownership change.

## Workstream E - Tests the skill must grow

- Good/bad fixtures per rule under `skills/rule-process-changelog/guardrails/`.
- A lock that `SECTION_FOR_TYPE` in the skill's documented table matches
  `_sections.mjs` (import the module in the test; do not duplicate the map).
- Router child coverage already exists; only the quick-selection prose needs
  the manual edit (no machine check today — record as open note).

## Proposed guardrails

Blocking first for the two that make a wrong release note; advisory for the
rest.

| Rule id | Rejects | Tier | Source |
| ------- | ------- | ---- | ------ |
| `changelog-header-generated` | missing generated preamble / marker | A | This skill; repo preamble |
| `changelog-entry-shape` | free-prose bullets under a release heading | A | This skill; `_render.mjs` |
| `changelog-release-fetch-depth` | shallow checkout on a history-reading release/check job | A | This skill; CI/release workflows |
| `changelog-omitted-types-stated` | silent drop of chore/ci/test/… | B | This skill |
| `changelog-formatter-ignored` | formatter mutates the generated file | B | This skill |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Evaluation and decisions

- [x] Audit the skill against the generator, ADR 127, CI and neighbors.
- [x] Record the freshness-gate reversal (skill → ADR 127).
- [x] Create this plan and flip the index row to `planned`.

### Phase 1 - Align prose and references

- [ ] Rewrite the freshness / CI section to match ADR 127.
- [ ] Delete the inline hook; link to `rule-styleguide-git`.
- [ ] Add `references/ci-and-checkout.md`; cut the body toward 120 lines.
- [ ] Document the Keep a Changelog house delta (`Documentation`).
- [ ] Gate: corpus still routes the four changelog prompts; skill corpus tests green.

### Phase 2 - Boundaries

- [ ] Quick-selection line in `rule-process`.
- [ ] `rule-platform-library` and `rule-process-readme` contradiction fixes.
- [ ] Gate: router-child-coverage green; grep shows no "hand-maintained changelog" left in those two skills.

### Phase 3 - Guardrails

- [ ] Fixtures first for the three Tier A rules, then implement.
- [ ] Two Tier B rules with their exception fixtures (opt-out marker; no formatter configured).
- [ ] Add this repository's `CHANGELOG.md` to the active formatter ignore list if a formatter is configured to touch markdown.
- [ ] Gate: rule suites green; `rule_tool_check` on this repository stays clean or only reports pre-agreed exceptions.

### Phase 4 - Verification

- [ ] Run the gates below.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census` and update frontmatter `guardrails:` on the skill.
- [ ] Confirm `SECTION_FOR_TYPE` lock test fails if the skill table and `_sections.mjs` diverge.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Evaluation and decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Align prose and references | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Boundaries | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 3 - Guardrails | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-process-changelog/guardrails/
node --import ./scripts/alias-hook.mjs --test scripts/build/changelog/__tests__/
node --import ./scripts/alias-hook.mjs --test tests/docs/changelog.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/changelog-header.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The skill taught "never freshness-check"; ADR 127 and CI already disagree. The
  plan takes the repository's side. If a consumer project has no tags yet, the
  skip remains mandatory so a shallow first day does not false-fail.
- Quick-selection prose is not covered by `router-child-coverage`. Either accept
  that gap or extend the ratchet later; this plan only edits the guide.
- Changesets remain legitimate for multi-package repos. The plan refuses to
  delete that path from `rule-platform-library`; it demotes it from the default
  sentence to an alternative.
- Deprecated / Security sections are not invented from commit types this
  Conventional Commit set does not carry. A future `security` type or footer
  convention would be a new decision, not a silent mapping.

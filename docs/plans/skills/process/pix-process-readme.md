# rule-process-readme - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: process. Order: after the move from styleguide (ADR 145).

## Evaluation outcome

The skill moved from `styleguide` to `process`.

- Writing a README is a delivery step with an artifact and a review checklist,
  not a rule about how code is written.
- The process area already owns the artifacts around a release: the ADR, the
  changelog and the npm release.
- The Open Source Steward reads the README as the first contact a project has
  with a user, and now carries the skill in its evidence.

Area counts move: styleguide loses one, process gains one. The catalog stays at
88 skills.

## Evidence base

Read in this session:

- `skills/rule-process-readme/SKILL.md`: the progressive-JPEG structure, the
  opening block, the facts, the example, getting started, the internal-repository
  section list, the formatting rules and the checklist.
- `skills/rule-styleguide-markdown/SKILL.md` and
  `skills/rule-styleguide-configuration/SKILL.md`, the neighboring owners.
- `personas/oss.md` and `personas/docs.md`.

Public sources verified in this session:

- Standard Readme, https://github.com/RichardLitt/standard-readme
- GitHub Docs, about READMEs, https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
- Keep a Changelog, https://keepachangelog.com/en/1.1.0/
- Contributor Covenant, https://www.contributor-covenant.org/
- REUSE, https://reuse.software/
- Shields.io, https://shields.io/
- Open Source Guides, https://opensource.guide/
- Make a README, https://www.makeareadme.com/

Problems found:

| Problem                                 | Detail                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| description contradicts the body        | the description says "do NOT use for internal/private repo docs" while the body has a full internal-repository section |
| open source sections are partial        | no security policy, support or funding section                                                                         |
| badge policy is absolute                | "remove all badges" ignores a version, license or build badge that states a fact                                       |
| boundary with the neighbors is implicit | markdown syntax and file presence are not named                                                                        |

Local articles: no README-specific piece exists in
the local article corpus. The Evil Martians article the skill already
cites is external, and the plan keeps it as the origin of the structure.

## Decisions

| Question     | Decision                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Area         | `process`; the rename is done (ADR 145)                                                                            |
| OSS persona  | `rule-process-readme` added to evidence skills, plus a lens on the README as the first contact                      |
| Scope        | The skill covers both the open source and the internal repository structure; the description is corrected          |
| Badges       | A minimal set is allowed when a badge states a fact that is not already in the text                                |
| OSS sections | License and copyright, contributing and code of conduct, security policy, support and funding, changelog delegated |
| Standards    | One cited source per section, as in the table above                                                                |
| Guardrails   | Opening block, getting started, fabricated numbers, directory tree, hand-maintained changelog                      |
| Severity     | Advisory first, then blocking after the corpus gate                                                                |
| Delivery     | Plan only now                                                                                                      |

## Workstream A - The description contradiction

The description becomes: the skill writes a README for an open source project or
an internal repository, and does not cover API reference generation or the
changelog. The body keeps both structures, and the reader is told which one
applies.

## Workstream B - Badges

A badge is allowed when it states a fact the text does not: the current version,
the license, the build status. Everything else is removed. The plan gives the
criterion, not a blanket ban, and points at Shields.io for the badge itself.

## Workstream C - The open source sections

1. **License and copyright**, with the REUSE and SPDX references so the
   license is machine-readable as well as visible.
2. **Contributing** and the **Code of Conduct** (Contributor Covenant), with
   the DCO or CLA the project asks for.
3. **Security policy**: how to report a vulnerability and the expected
   response window, linked to `SECURITY.md`.
4. **Support and funding**: where to ask for help, where to report a bug, and
   the funding channels, linked to `SUPPORT.md` and `FUNDING.yml`.
5. **Changelog**: the section points at the generated changelog; the skill
   never maintains release notes by hand.

## Workstream D - The internal structure stays

The internal-repository section list stays: name and purpose, architecture,
prerequisites, quick start, development workflow, seed policy, Docker usage,
documentation, license, and the agent extras. The rule that "configure as
needed" is not an instruction is what the guardrail checks.

## Workstream E - Boundaries

- `rule-styleguide-markdown` owns the markdown syntax; this skill owns the
  structure and the content.
- `rule-styleguide-configuration` owns whether the file exists and the templates
  for `LICENSE`, `CONTRIBUTING` and friends; this skill owns what the README
  says about them.
- `rule-process-changelog` owns the release notes; the README links them.
- `rule-process-npm-release` owns the package that the README advertises.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                               | Rejects                                                                 | Tier | Source     |
| ------------------------------------- | ----------------------------------------------------------------------- | ---- | ---------- |
| `readme-opening-block`                | a first paragraph missing what, benefit or difference                   | A    | This skill |
| `readme-getting-started`              | an instruction that defers to the reader, such as "configure as needed" | A    | This skill |
| `readme-no-fabricated-numbers`        | a claim with a number and no source                                     | B    | This skill |
| `readme-no-directory-tree`            | a hand-maintained directory tree                                        | B    | This skill |
| `readme-no-hand-maintained-changelog` | a changelog section maintained in the README                            | B    | This skill |

## Assets and templates to ship

- `assets/templates/readme-oss.md` (opening, facts, example, getting started,
  the legal and contribution sections).
- `assets/templates/readme-internal.md` (the fixed section list).
- `assets/templates/readme-checklist.md` (the review checklist).

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Evaluation, move and decisions

- [x] Evaluate the area and record the outcome.
- [x] Move the skill to `rule-process-readme` (ADR 145).
- [x] Add the skill to the Open Source Steward persona.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Fix the description contradiction.
- [ ] Replace the badge ban with the criterion.
- [ ] Add the open source sections and their sources.
- [ ] State the boundaries with markdown, configuration and the changelog.

### Phase 2 - Guardrails and assets

- [ ] Implement the five rules with fixtures and a unit test each.
- [ ] Ship the three templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the badge criterion and the guardrail family if either
      turns out to be structural.

### Phase 3 - Verification

- [ ] Build the open source and internal fixtures and run the checklist.
- [ ] Check every relative link and every command in the samples.
- [ ] Confirm that each number in the samples has a stated source.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Evaluation, move and decisions | `T5-bulk` | `minimax-m3.1-flash` | mechanical edits at scale |
| Phase 1 - Content | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Guardrails and assets | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The checklist is already the best review artifact the skill has; the plan
  promotes it to a template rather than rewriting it.
- The Open Source Steward lens is the only persona change; the docs persona
  keeps the skill and follows the rename.
- No local article is cited; the standards and the existing Evil Martians
  reference are the sources.

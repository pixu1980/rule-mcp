# rule-mcp-devops-deploy-preview - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#60`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: devops, leaf. Sibling plans: `rule-mcp-devops-testing`,
`rule-mcp-devops-observability`, `rule-mcp-devops-docker` (same series) and `rule-mcp-devops`
(the router, which does not list this skill).

## Scope decisions (owner)

Inherited from the platform, meta and frontend interviews, 2026-10-21:

| Question           | Decision                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                                         |
| Identity           | Keep the procedural shape: it is a runbook with two templates, like the template-engine leaf, and it is the only GitLab-specific skill in the catalog |
| Doors              | Fixed here: the area router table row and the dispatcher row it never got                                                                             |
| Templates          | `assets/templates/` moves under `references/` and gets served and parsed, so a broken YAML fails a test instead of a reviewer                         |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                      |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                             |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                          |
| Flow               | Failing test first                                                                                                                                    |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the template parse                                                              |
| Commits            | One per phase                                                                                                                                         |
| ADR                | Two for the whole area: the devops family shape, the rule design                                                                                      |
| Done               | Both doors are open, the templates are served and parsed, and the rules pass                                                                          |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-devops-deploy-preview/SKILL.md` is **111 lines**, with two template
assets:

| File                                      | Purpose                            |
| ----------------------------------------- | ---------------------------------- |
| `assets/templates/.gitlab-ci.preview.yml` | the review-app pipeline            |
| `assets/templates/review-app.yaml`        | the DigitalOcean App Spec template |

No `guardrails/`, no `references/`.

### It has zero doors, and its own router contradicts itself about it

| Door                              | State                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `rule-mcp-devops` table           | **missing**: the entry `"rule-mcp-devops": ["rule-mcp-devops-deploy-preview"]` in `ROUTER_GAPS` |
| `rule-mcp-devops` Quick Selection | **present**: "Need a preview app per merge request? -> `rule-mcp-devops-deploy-preview`"        |
| `rule-mcp` dispatcher             | **missing**: zero rows                                                                          |

So the router's short list points at a skill its own table does not list, and the
central dispatcher does not know it either. A reader who follows the Quick
Selection lands on a skill that no table acknowledges; a reader who scans the
table never hears about it.

### The templates are referenced, unserved and unparsed

The body says "Copy `assets/templates/.gitlab-ci.preview.yml` to
`.gitlab-ci.yml`" and "Copy `assets/templates/review-app.yaml` to
`.do/review-app.yaml`, then adapt every `# TODO` marker". No surface serves those
files, no test parses them, and a YAML typo would reach a user before it reached
a gate. They are also the only GitLab assets in a catalog whose other pipelines
are GitHub Actions, which makes drift likelier, not less.

### The TODO markers are the real contract

The `# TODO` markers are what a user must adapt, and nothing counts them. A rule
can: every template ships at least one marker, and every marker names what to
replace. Otherwise the template silently rots into something that almost works.

## The six rules

| id                          | Rejects                                                                                       | Reads                       | Tier | Today                    |
| --------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- | ---- | ------------------------ |
| `preview-listed-in-area`    | A devops leaf missing from the `rule-mcp-devops` table                                        | `code`                      | B    | **red**: the gap         |
| `preview-templates-served`  | A template no surface reaches and the body does not declare                                   | `context.fileList`          | B    | **red**: two files       |
| `preview-templates-parse`   | A template that is not valid YAML                                                             | `context.fileList`          | B    | n/a: nothing parses them |
| `preview-todos-labelled`    | A template marker that does not say what to replace                                           | `code`                      | B    | n/a                      |
| `preview-owner-named`       | A section delegating the pipeline, the runtime or the port detection without naming the owner | `code`                      | B    | partially red            |
| `preview-no-stale-skill-id` | A `rule-mcp-...` id with no skill directory                                                   | `code` + `context.fileList` | B    | clean                    |

## Phase 0 - Decisions

- [ ] ADR (area): the devops family shape, with the preview pipeline as its own
      concern rather than a section of the docker skill.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/devops-deploy-preview/`: `clean/`, `unlisted/`,
      `unserved-templates/`, `invalid-yaml/`, `unlabelled-todos/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-mcp-devops-deploy-preview`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-mcp-devops-deploy-preview/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Doors and templates

- [ ] `rule-mcp-devops` table row; delete the `"rule-mcp-devops"` gap entry.
- [ ] `rule-mcp` dispatcher row.
- [ ] Move `assets/templates/` under `references/` and consume the
      served-references surface from `rule-mcp-platform-desktop`.
- [ ] Parse both templates in the suite; label every `# TODO`.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-devops-deploy-preview/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Template parse and TODO coverage.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Doors and templates  | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-devops-deploy-preview/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD), `rule-mcp-platform-desktop#3` (CONTRACT)

Feeds: `rule-mcp-devops` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The self-contradiction in `rule-mcp-devops` - a Quick Selection line for a row the
  table does not carry - is the clearest evidence yet that Quick Selection and
  table need the same source. The router plan makes both generated.
- This is the only GitLab-specific skill in a GitHub-Actions catalog. That is not
  a defect, but it is a reason for the templates to be parsed rather than
  trusted: nobody in this repository runs them.
- 111 lines and two templates is a healthy skill. It needs doors and a parser,
  not a rewrite.

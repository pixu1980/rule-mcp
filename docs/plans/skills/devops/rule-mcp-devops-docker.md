# rule-mcp-devops-docker - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#59`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: devops, leaf. Sibling plans: `rule-mcp-devops-testing`,
`rule-mcp-devops-observability`, `rule-mcp-devops-deploy-preview` (same series) and
`rule-mcp-devops` (the router).

## Scope decisions (owner)

Inherited from the platform, meta and frontend interviews, 2026-10-21:

| Question            | Decision                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass  | **Plan only**                                                                                                              |
| Identity            | Keep the runbook shape: it is one of the three leaves in the catalog that already owns rules, and the rules match the body |
| Existing guardrails | **Extend, do not replace**: `docker-healthcheck` and `docker-non-root` stay; three rules join them                         |
| Base image policy   | The policy is stated in the body and unenforced: it becomes a rule                                                         |
| Rule set            | Five rules including the two existing ones, all Tier B (advisory)                                                          |
| Detection           | Both: Dockerfile and compose parsing, plus injected `fileList`                                                             |
| Fixtures            | Shared corpus pairs plus skill trees on disk                                                                               |
| Flow                | Failing test first                                                                                                         |
| Gates               | Skill suite, corpora, catalog clean, census, lint and typecheck                                                            |
| Commits             | One per phase                                                                                                              |
| ADR                 | Two for the whole area: the devops family shape, the rule design                                                           |
| Done                | The base image policy is enforceable and the rules pass                                                                    |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-devops-docker/SKILL.md` is **169 lines** with a `guardrails/` folder
exporting two rules:

| Rule                 | Checks                           |
| -------------------- | -------------------------------- |
| `docker-healthcheck` | the image declares a healthcheck |
| `docker-non-root`    | the runtime user is not root     |

Sections: what the skill produces, building the production image, per-stack
entry points, the ignore file, compose for development and deploy, base image
policy, validation, edge cases.

### The policy it states and does not enforce

> "Every image derives from the current `alpine` variant of the Node major of the
> application [...] Pin by major and patch: `node:22-alpine`, not `node:latest`."

That is the single most consequential Docker rule in the document, and neither
of the two existing rules looks at it: a `FROM node:latest` passes both. The
validation checklist (build, size, boot, healthcheck) does not test it either.

### The validation checklist is a contract with no executor

Four numbered steps: `docker build`, `docker images` within size targets,
`docker run --rm` boots, the healthcheck answers. Nothing in the repository runs
them, and the skill does not say whether they are a human checklist or a
pipeline. Two of the four are what the two rules approximate; the size and the
boot are neither.

## The five rules

| id                          | Rejects                                                                    | Reads  | Tier | Today                  |
| --------------------------- | -------------------------------------------------------------------------- | ------ | ---- | ---------------------- |
| `docker-healthcheck`        | An image with no healthcheck                                               | `code` | B    | existing, keep         |
| `docker-non-root`           | A runtime stage running as root                                            | `code` | B    | existing, keep         |
| `docker-pinned-base-image`  | `FROM node:latest`, an unpinned major, or a floating tag                   | `code` | B    | n/a: unenforced policy |
| `docker-multistage-runtime` | A production Dockerfile copying the build toolchain into the runtime stage | `code` | B    | n/a                    |
| `docker-owner-named`        | A section delegating CI, secrets or previews without naming the owner      | `code` | B    | partially red          |

## Phase 0 - Decisions

- [ ] ADR (area): the devops family shape. Docker owns the image contract; the
      preview pipeline and CI belong to `rule-mcp-devops-deploy-preview` and the
      toolchain.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/devops-docker/`: `clean/`, `latest-tag/`, `single-stage/`,
      `root-user/`, `no-healthcheck/`, each with a one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-mcp-devops-docker`, including the two
      existing rules if their pairs are missing.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Add the three new rules beside `_docker-healthcheck.js` and
      `_docker-non-root.js`.
- [ ] `guardrails:` frontmatter gains the new ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Say who runs the checklist

- [ ] Decide whether the validation list is human or automated, and say which.
      If automated, name the pipeline that runs it; if human, say so.
- [ ] The base image policy links the new rule by id, so a reader can point at
      something.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-devops-docker/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the five rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                 | Class       | Model                     | Why                            |
| ------------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                  | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)       | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                  | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Say who runs the checklist | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Verification               | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-devops-docker/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-devops` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- This is the model the other leaves in this series should follow: a 169-line
  runbook with two rules that match its own content. It needs three more, not a
  rewrite, which is why it has the shortest plan in the devops area.
- `docker-pinned-base-image` would have caught the most common supply-chain
  mistake in the document's own examples, and it is the only rule here with an
  exact string to reject.
- The size target in the validation list has no number in the body ("within the
  size targets above" points at a paragraph that gives "tens of megabytes" for
  backend work). A rule cannot check a range nobody wrote down, so the rule set
  stops at the three and the paragraph stays prose.

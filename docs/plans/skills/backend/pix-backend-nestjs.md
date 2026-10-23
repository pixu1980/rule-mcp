# rule-backend-nestjs - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#74`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf. **93 lines**, one file, no `guardrails/`. It inherits the
router's six rules through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Sections: NestJS architecture, controllers, providers and services, guards and
interceptors, database integration, GraphQL integration, testing.

NestJS has the strongest opinions in this area and therefore the most rules worth
making explicit: a guard is where authorization belongs, a DTO is where
validation belongs, a controller is where neither belongs. The skill states all
three; nothing checks any of them, and the router's six rules never mention a
guard or a DTO.

## The four rules

| id                              | Rejects                                                                            | Tier | Today         |
| ------------------------------- | ---------------------------------------------------------------------------------- | ---- | ------------- |
| `nestjs-authz-in-guard`         | An authorization check inside a controller or service                              | B    | n/a           |
| `nestjs-dto-validation`         | A request body typed without a DTO class or a validation pipe                      | B    | n/a           |
| `nestjs-no-logic-in-controller` | Branching or persistence inside a controller method                                | B    | n/a           |
| `nestjs-owner-named`            | A section delegating pooling, validation or observability without naming the owner | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-backend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape; NestJS owns the layering contract,
      the router owns the HTTP hardening.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-nestjs/`: `clean/`, `authz-in-controller/`,
      `body-without-dto/`, `fat-controller/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-backend-nestjs`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-nestjs/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Shape

- [ ] The testing section names `rule-devops-testing` for the runner and keeps
      only the NestJS harness (`Test.createTestingModule`).

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-nestjs/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Shape                | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- Guards and DTOs are the two NestJS mechanisms a reader must know, and both are
  statements with no rule behind them. Enforcing them is the difference between a
  skill that describes the framework and one that keeps a codebase inside it.
- `rule-backend-fastify` carries a section titled "NestJS Testing" that belongs
  here in substance and not in name. Fixing it is that leaf's job; recording it
  here keeps the pair in one place.

# rule-mcp-styleguide-typescript - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twelfth skill.

## Evidence base

Read in this session:

- `skills/rule-mcp-styleguide-typescript/SKILL.md`: any and unknown, catch clauses,
  type guards over assertions, unions over enums, `satisfies`, optional
  chaining, interface versus type, generics, `never`, `readonly`,
  `Record<string, unknown>`, self-documenting functions, impossible states,
  branded types, type placement, the guardrail table, and a final "Conventions
  (rules -> skills merge)" section.
- `skills/rule-mcp-styleguide-typescript/COMPILER.md`: strict mode, base tsconfigs,
  boundary types, path aliases, composite projects, CLI, enforcement.
- `src/core/skills/__tests__/_content.test.mjs`, which asserts both files.

Public sources verified in this session:

- TypeScript downloads, https://www.typescriptlang.org/download/ (latest is 7.0)
- TypeScript releases, https://github.com/microsoft/TypeScript/releases
  (7.0.2, 6.0.3, 5.9.3)
- TypeScript blog, https://devblogs.microsoft.com/typescript/ (6.0 in March,
  7.0 announced)
- eslint-plugin-unicorn and typescript-eslint facts already recorded in the
  ESLint plan

Problems found:

| Problem             | Detail                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| enum contradiction  | the guardrail fails on `enum` and `const enum`, while the final section says "if an enum is unavoidable, use `const enum`" |
| merge artifact      | the final section carries a nested `# TypeScript Rules` heading and repeats the enum and type-safety rules                 |
| version claim       | `COMPILER.md` calls 7.x a release candidate; 7.0.2 is released and 6.0.3 is the last JavaScript line                       |
| overlap with ESLint | `@typescript-eslint/no-explicit-any` and the `ts-no-explicit-any` guardrail claim the same rule                            |
| missing patterns    | no `Result`, template literal types, domain versus transport types, utility types, or `@ts-expect-error` discipline        |

Local articles: `03-typescript/` has thirteen pieces, most on these exact
topics (`stop-using-any`, the anti-pattern review, interface versus type,
senior tricks, the TS 7 pair). They stay context only; the plan anchors to the
TypeScript documentation.

## Decisions

| Question        | Decision                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Scope           | Enum contradiction, merge artifact, TS 7, missing patterns, ESLint boundary, type placement                                           |
| Enum rule       | No `enum`; `const enum` only with a written waiver marker                                                                             |
| Merge artifact  | Keep it as a coherent final summary, no nested heading, no duplicated rules                                                           |
| Version         | 7.0 as the current line, with the dual install and the 6.0 breaking changes                                                           |
| New patterns    | `Result`, template literal types, domain versus transport types, utility types, non-null assertion ban, `@ts-expect-error` discipline |
| Generics        | Confirmed                                                                                                                             |
| Adoption        | A migration section from JavaScript and from pervasive `any`                                                                          |
| New guardrails  | Non-null assertion, unchecked suppression, `Record<string, unknown>`, type gymnastics                                                 |
| ESLint boundary | Guardrails are deterministic per file; ESLint owns the type-aware rules                                                               |
| Severity        | Advisory first, then blocking after the corpus gate                                                                                   |
| Delivery        | Plan only now                                                                                                                         |

## Workstream A - The enum rule, made single

1. The rule is: prefer a union and an `as const` array; an `enum` is not the
   answer.
2. A `const enum` is allowed only when a written waiver marker names the reason,
   for example a comment on the declaration line. The guardrail
   `ts-union-over-enum` reads the marker and passes, so the exception is
   visible in the diff instead of silent.
3. The final summary repeats this rule in one line and does not contradict it.

## Workstream B - The merge artifact

The final section becomes a real summary: one heading, the rules grouped
(enums, type safety), each in a line, with no nested `# TypeScript Rules` title
and no paragraph repeated from the body above.

## Workstream C - TypeScript 7 in COMPILER.md

1. 7.0 is the current line; the file stops calling it a release candidate.
2. The dual install is explained: the fast native `tsc` and the 6.x package that
   the programmatic consumers still import.
3. The 6.0 breaking changes that bite on the way: `rootDir` no longer inferred,
   deprecated flags becoming errors, `stableTypeOrdering`.
4. The migration order is: clean on 6.0 first, then switch the compiler.

## Workstream D - Missing patterns

1. **`Result` types for expected failures**, so an expected validation failure
   is a value and a thrown exception stays exceptional.
2. **Template literal types** for naming rules that a type can encode.
3. **Domain types separate from transport types**, so an API DTO and the domain
   entity cannot be confused.
4. **Utility types used deliberately**: `Pick`, `Omit`, `Partial`, `Record`,
   with the rule that deriving beats hand-maintaining a second copy.
5. **No non-null assertion**: narrow or check instead.
6. **`@ts-expect-error` discipline**: a reason on the same line, and removal when
   the error disappears.

## Workstream E - Adoption

A migration section for a JavaScript codebase and for one where `any` is
everywhere: turn on the strict flags, narrow at the boundaries first, count the
remaining `any` and ratchet it down, and keep `tsc --noEmit` in CI from the
first step.

## Workstream F - Guardrails

Existing, unchanged: `ts-no-explicit-any`, `ts-catch-unknown`,
`ts-no-double-assertion`, `ts-union-over-enum` (with the waiver marker).

| Rule id                        | Rejects                                                               | Tier | Source          |
| ------------------------------ | --------------------------------------------------------------------- | ---- | --------------- |
| `ts-no-non-null-assertion`     | a `!` non-null assertion                                              | A    | TypeScript docs |
| `ts-no-unchecked-suppression`  | the unchecked suppression comment where the checked form is available | A    | TypeScript docs |
| `ts-no-record-string-unknown`  | `Record<string, unknown>` as a default shape                          | B    | This plan       |
| `ts-no-inline-type-gymnastics` | deeply nested conditional or mapped types in application code         | B    | This plan       |

## Workstream G - The ESLint boundary

The guardrails run on one file with no project, so they catch what a pattern can
see. `rule-mcp-toolchain-eslint` owns the type-aware rules that need the compiler:
floating promises, misused promises, and the rest. The plan states the split
once and links the ESLint skill; it does not add a second copy of a rule that
already lives there.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. A fixture where every example in the skill compiles under `tsc --noEmit`.
3. Negative tests: the counterexamples fail to compile or trip the named rule.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit both files and the content test.
- [x] Verify the TypeScript 7 facts.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Fix the contradictions

- [ ] Make the enum rule single and add the waiver marker to the guardrail.
- [ ] Rewrite the final summary without the nested heading or duplicated rules.
- [ ] Update `COMPILER.md` for 7.0, the dual install and the 6.0 breaking changes.

### Phase 2 - Content

- [ ] Add the six missing patterns.
- [ ] Add the adoption section.
- [ ] State the ESLint boundary and link the skill.

### Phase 3 - Guardrails

- [ ] Add the four rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the guardrail-versus-ESLint split, since it decides
      where a future TypeScript rule goes.

### Phase 4 - Verification

- [ ] Compile the fixture with `tsc --noEmit`.
- [ ] Run the corpus gate.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fix the contradictions    | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 3 - Guardrails                | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 4 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The waiver marker is a deliberate exception path; the corpus needs one good
  snippet without it and one bad declaration with it.
- The TypeScript 7 dual-install detail belongs in `COMPILER.md`, not in the
  code-style half.
- No local article is cited; the TypeScript documentation is the only source.

# rule-platform-mobile - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. New skill: the catalog has no mobile skill, and this plan is opened from `rule-platform` Phase 3. No index row existed for it until now; it appends as `#85`.

Area: platform, fifth leaf. Sibling plans: `rule-platform` (the router that
promised this platform), `rule-platform-web` (whose web rules still apply),
`rule-process-tdd` and `rule-devops-testing` (which already carry the exception
this skill explains).

## Why this skill exists

Three facts, all measured, and none of them a demand study:

1. `rule-platform` describes itself as covering "mobile (Expo)" and carries
   `mobile` and `expo` tags. No skill serves mobile.
2. Two testing skills carry an exception for it and agree with each other:
   `rule-devops-testing` says "One exception: Expo and React Native. That stack
   uses `jest` with the `jest-expo` preset and `@testing-library/react-native`,
   because the native module layer does not run under Vitest", and
   `rule-process-tdd` repeats it and adds "See `expo` rule".
3. That `expo` rule does not exist anywhere in the catalog. A skill defers to a
   rule nobody owns.

So the platform is promised, half-accounted for in testing, and unowned. The
earlier "12 skills mention Expo" figure was wrong: most of those hits are the
word _Export_. The honest signal is two testing exceptions and a dangling
reference.

## Scope decisions (inherited from the `rule-platform` interview)

| Question  | Decision                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Why now   | `rule-platform` cannot stop promising mobile without either removing the claim or opening this plan; the owner chose both |
| Stack     | Expo and React Native are the supported stack; Capacitor is watched, not covered                                         |
| Testing   | The existing `jest` exception is the norm here, and this skill owns the rule it is cited as                              |
| Web rules | The rule web rules still apply to the renderer; they are linked, not restated                                             |
| Detection | `FRAMEWORK_SKILL_MAP` gains `expo` and `react-native` when this skill exists                                             |

## Evidence base (measured 2026-10-21)

| Fact                                                   | State                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Skills mentioning Expo or React Native in a real sense | 2 (`rule-devops-testing`, `rule-process-tdd`)                                              |
| Dangling references                                    | 1: `See \`expo\` rule`in`rule-process-tdd:85`                                             |
| Mobile content anywhere in the catalog                 | none: no file tree, no navigation, no native module guidance                             |
| Detector entries                                       | none for `expo`, `react-native` or `capacitor`                                           |
| Router promise                                         | `rule-platform` description plus two tags, removed by its own plan until this skill lands |

## What this skill will own

1. **Project shape**: Expo-managed versus bare workflow, the app/ and src/
   layout, config files (`app.json` / `app.config.ts`), and when ejecting is
   the wrong answer.
2. **Navigation**: Expo Router file-based routes against React Navigation, and
   the deep-link contract that both must satisfy.
3. **Native boundaries**: what a native module is, when a config plugin is the
   cheaper answer, and how a JS-only dependency stays JS-only.
4. **Testing**: `jest` + `jest-expo` + `@testing-library/react-native`, the
   exception the other two skills already cite, with the reason it exists.
5. **Store delivery**: build profiles, signing, the review checklist, and the
   update path (over-the-air updates versus a store release).
6. **Shared web rules**: linked to `rule-styleguide-*` and `rule-platform-web`,
   not restated.

## The rules

| id                         | Rejects                                                          | Tier | Today                             |
| -------------------------- | ---------------------------------------------------------------- | ---- | --------------------------------- |
| `mobile-test-runner`       | A test setup that uses Vitest in an Expo or React Native project | B    | n/a, the skill does not exist yet |
| `mobile-no-web-only-api`   | A browser-only API used without a native guard                   | B    | n/a                               |
| `mobile-owner-named`       | A delegated section naming no owner                              | B    | n/a                               |
| `mobile-no-stale-skill-id` | A `rule-...` id with no skill directory                           | B    | n/a                               |

The `expo` rule `rule-process-tdd` cites becomes `mobile-test-runner`, and that
skill's line is updated to name it. That is the one edit outside this skill.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-platform` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR: Expo and React Native as the supported stack, Capacitor watched and
      not covered, and why the testing exception is a rule rather than a note.
- [ ] ADR: the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-mobile/`: `clean/`, `vitest-in-native/`,
      `web-only-api/`, `unnamed-owner/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The skill

- [ ] `skills/rule-platform-mobile/SKILL.md` with the six owned topics above.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - Wire it in

- [ ] `rule-platform` router: row and Quick Selection line; the description
      regains the mobile claim and the tags come back only if the routing
      corpus asks for them.
- [ ] `FRAMEWORK_SKILL_MAP` gains `expo` and `react-native`.
- [ ] `rule-process-tdd:85` names `mobile-test-runner` instead of the missing
      `expo` rule.
- [ ] `rule-devops-testing` links here instead of explaining the exception
      alone.
- [ ] `pnpm census && pnpm census:check`, README counts move together.

### Phase 4 - Verification

- [ ] Skill suite, `_corpus`, `_routing-corpus`, `_router-child-coverage`.
- [ ] One prompt for an Expo project reaches this skill without naming it.
- [ ] `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The skill            | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 3 - Wire it in           | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T4-tests` - `deepseek-v4.1-flash`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-platform-mobile/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- This plan is opened on a promise and two testing exceptions, not on measured
  demand. If the owner wants the demand measured first, the honest version is
  to leave the router without the mobile claim and revisit when a real project
  asks. The plan is written so that decision stays reversible: the router edit
  that removes the claim is one line.
- The `expo` rule reference in `rule-process-tdd` has been dangling long enough
  that a reader has probably tried to follow it. It is the cheapest fix here
  and the clearest argument for the tombstone idea applied to rules: a
  reference to a rule should fail when the rule is absent.
- Capacitor is watched because it shares the web-rules-still-apply property
  with Expo, and because nothing in the catalog mentions it at all. No skill
  until something does.

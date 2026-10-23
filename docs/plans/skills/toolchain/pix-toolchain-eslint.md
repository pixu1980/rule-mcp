# rule-toolchain-eslint - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, ninth skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-eslint/SKILL.md`: flat-config-only framing, a minimal
  Unicorn config, a TypeScript and React setup, the Unicorn preset table, the
  high-value rule table, the controversial-rule table, incremental adoption,
  `FlatCompat`, a legacy `.eslintrc` block, and a Biome migration section.
- `src/core/skills/__tests__/_content.test.mjs`, which asserts the skill keeps
  naming `eslint-plugin-unicorn`, the preset configuration names, the rule
  names, `recommended-type-checked`, `FlatCompat` and `eslint.config.mjs`.

Public sources verified in this session:

- ESLint releases, current v10.13.0, https://github.com/eslint/eslint/releases
- ESLint configuration files, https://eslint.org/docs/latest/use/configure/configuration-files
- ESLint migration guide, https://eslint.org/docs/latest/use/configure/migration-guide
- eslint-plugin-unicorn, current 78.0.0 with peer `eslint@^10.11.0`, https://registry.npmjs.org/eslint-plugin-unicorn/latest
- eslint-plugin-unicorn readme, https://github.com/sindresorhus/eslint-plugin-unicorn
- typescript-eslint, current 8.71.2, https://registry.npmjs.org/typescript-eslint/latest
- `@eslint/js`, current 10.0.1 with peer `eslint@^10.0.0`, https://registry.npmjs.org/@eslint/js/latest
- `@eslint/eslintrc`, current 3.3.7 with peer `eslint@^9.20.1`, https://registry.npmjs.org/@eslint%2Feslintrc/latest

Facts that make the current text out of date or unverified:

| Current text                           | Reality                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "ESLint >= 10.4"                       | the current line is 10.13; `eslint-plugin-unicorn` 78 peers on `eslint@^10.11.0`                           |
| "unicorn v69+ requires ESLint >= 10.4" | the current plugin is 78                                                                                   |
| three Unicorn presets                  | unicorn 78 also ships language presets: `recommended-css`, `-html`, `-json`, `-markdown`, `-toml`, `-yaml` |
| `FlatCompat` as the migration path     | the documented path is `@eslint/migrate-config`; `@eslint/eslintrc` 3.3.7 peers on ESLint 9                |
| no CI flags                            | `--max-warnings`, `--cache` and `--report-unused-disable-directives` are the run surface                   |

Local articles: the formatting-tools piece has a real ESLint section ("ESLint
is not a formatter any more", flat config, the Biome comparison). It stays
context only; the plan anchors to the official documentation.

## Decisions

| Question    | Decision                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Scope       | Version, presets, flat config, type-aware, incremental adoption, legacy migration, Biome, CI                          |
| Version     | Pinned: ESLint 10.13, eslint-plugin-unicorn 78, typescript-eslint 8                                                   |
| Boundaries  | Linter configuration only; the TypeScript config, the JS idioms and the formatter are linked                          |
| Presets     | `recommended` default, `unopinionated` for existing code, language presets named, `all` verified before it is kept    |
| Flat config | `defineConfig`, `files` scoping, documented global `ignores`, ESM `.mjs`                                              |
| Type-aware  | `recommendedTypeChecked` as the default                                                                               |
| Adoption    | The six steps stay, plus the warning count as a migration metric                                                      |
| Migration   | `@eslint/migrate-config` primary; `FlatCompat` only for plugins that ship no flat config, with the compatibility note |
| CI          | `--max-warnings`, `--cache`, `--report-unused-disable-directives`                                                     |
| Delivery    | Plan only now                                                                                                         |
| ADR         | Only when a decision is structural                                                                                    |

## Workstream A - Version and requirements

1. ESLint 10.13, ESM, flat config only; the `.eslintrc` system is gone.
2. `eslint-plugin-unicorn` 78 peers on `eslint@^10.11.0`; that is the real
   floor, not 10.4.
3. Node floor from ESLint's own engines: 20.19+, 22.13+, or 24+.
4. typescript-eslint 8 provides the type-aware presets.

## Workstream B - Presets

1. `recommended` is the default starting point.
2. `unopinionated` is for a codebase where the opinionated rules fight the
   existing style.
3. The language presets (`recommended-css`, `-html`, `-json`, `-markdown`,
   `-toml`, `-yaml`) are named for projects that also lint those formats.
4. `all` is verified against the installed plugin before it stays in the table.

## Workstream C - Flat config

1. `defineConfig` from `eslint/config`.
2. Unicorn's JavaScript rules are scoped with `files`, so they do not fire on
   CSS, JSON or Markdown when those languages are linted in the same config.
3. Global ignores use the documented form, separate from a config object that
   carries `files`.
4. The config file is `eslint.config.mjs`.

## Workstream D - Type-aware linting

`tseslint.configs.recommendedTypeChecked` is the default, with the project
service or the parser options it needs. Unicorn and typescript-eslint run as
separate config objects.

## Workstream E - Incremental adoption and measurement

The six steps stay: preset first, autofix, downgrade noisy rules to `warn`,
scope ignores instead of disabling, layer the type-aware config, and revisit
the config each release. Added: count the warnings per run and track the
number, so "ready to promote to error" is a measurement instead of a feeling.

## Workstream F - Migration

1. `@eslint/migrate-config` converts an existing `.eslintrc` to flat config.
2. `FlatCompat` from `@eslint/eslintrc` stays only for a plugin that ships no
   flat config, with the note that the current `@eslint/eslintrc` peers on
   ESLint 9 and the arrangement needs verification on ESLint 10.
3. The legacy `.eslintrc` example stays as the thing not to do.

## Workstream G - Biome as the alternative

The migration commands stay, with the boundary stated once: Biome is the other
linter, not a second one running at the same time.

## Workstream H - CI

1. `--max-warnings` sets the gate; a project can choose its threshold.
2. `--cache` with the cache restored in CI.
3. `--report-unused-disable-directives` so a stale suppression comment surfaces.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                      | Rejects                                                                     | Tier | Source                  |
| ---------------------------- | --------------------------------------------------------------------------- | ---- | ----------------------- |
| `eslint-no-eslintrc`         | an `.eslintrc*` file in a project on ESLint 10                              | A    | Migration guide         |
| `eslint-no-formatting-rules` | formatting rules (`quotes`, `semi`, `indent`, `comma-dangle`) inside ESLint | A    | The formatter moved out |
| `eslint-preset-required`     | a config with hand-picked rules and no preset                               | B    | The skill's own advice  |
| `eslint-suppression-reason`  | a lint suppression comment with no explanation                              | B    | Maintenance             |

## Assets and templates to ship

- `assets/templates/eslint.config.mjs` (JS, TS and React, preset and
  type-aware, ignores).
- `assets/templates/eslint-ci.yml` (cache, max warnings, directives).
- `assets/templates/migrate-eslintrc.md` (migrator, then the manual steps).

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the content test.
- [x] Verify the ESLint, Unicorn and typescript-eslint facts.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Update the version requirements to the real floors.
- [ ] Expand the preset table with the language presets and verify `all`.
- [ ] Confirm the `defineConfig`, `files` and global `ignores` shape.
- [ ] Add the warning-count metric to the adoption section.
- [ ] Replace `FlatCompat` as the primary migration path with
      `@eslint/migrate-config`.
- [ ] Add the CI flags.
- [ ] Keep every string the content test asserts.

### Phase 2 - Guardrails and assets

- [ ] Implement the four rules with fixtures and a unit test each.
- [ ] Ship the config, CI and migration templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the flat-config-only and no-formatting-rules policy,
      since both are structural decisions.

### Phase 3 - Verification

- [ ] Build the fixture and run `eslint` with the reference config.
- [ ] Confirm a `var` or `==` violation fails the run.
- [ ] Run the migrator on a sample `.eslintrc` and check the output.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Guardrails and assets     | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The `@eslint/eslintrc` compatibility with ESLint 10 is a verification item;
  the plan keeps `FlatCompat` as a narrow fallback instead of the main path.
- Whether `unicorn.configs.all` still exists in 78 needs a check against the
  installed package before the plan keeps it in the preset table.
- No local article is cited; the ESLint and Unicorn documentation is the only
  source.

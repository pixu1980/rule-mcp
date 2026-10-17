# rule-toolchain-biome - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, tenth skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-biome/SKILL.md`: a `biome.json` block on the 1.9.4
  schema with a top-level `organizeImports`, a migration section with a bare
  `biome migrate`, CLI commands, a CI snippet, and two links.
- `skills/rule-toolchain-eslint/SKILL.md` for the competing-linter boundary.

Public sources verified in this session:

- Biome configuration reference, https://biomejs.dev/reference/configuration/
- Biome CLI reference, https://biomejs.dev/reference/cli/
- Upgrade to Biome v2, https://biomejs.dev/guides/upgrade-to-biome-v2/
- Migrate from ESLint and Prettier, https://biomejs.dev/guides/migrate-eslint-prettier/
- Package metadata, latest 2.5.15, https://registry.npmjs.org/@biomejs%2Fbiome/latest

Facts that make the current text out of date:

| Current text                       | Biome 2.x reality                                            |
| ---------------------------------- | ------------------------------------------------------------ |
| `$schema` 1.9.4                    | the current line is 2.5.x; the schema URL should match the install |
| top-level `organizeImports`        | replaced by `assist.actions.source.organizeImports`          |
| `biome migrate` with no argument   | `biome migrate --write` upgrades the config; `biome migrate eslint --write` and `biome migrate prettier --write` convert the old tools |
| no file selection guidance         | `files.includes` replaced the removed `include` and `ignore` |
| no domains                         | `linter.domains` selects framework rule sets (`react`, `next`, `test`) |
| `linter.rules.all` untouched        | the `all` option is removed in 2.x                           |
| no `--changed` or `--staged`       | both exist, and `--changed` needs `vcs.defaultBranch`        |

Local articles: the formatting-tools piece has a real Biome section (one tool
instead of two, the 2.x line, the Prettier-compatibility caveat). It stays
context only; the plan anchors to the official documentation.

## Decisions

| Question      | Decision                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Scope         | Config 2.x, CLI, migration, assist, CI, domains, the choice against ESLint plus Prettier |
| Version       | Pinned to the 2.5.x line with the matching schema                        |
| Boundaries    | Biome configuration plus a short "when to choose it" guide; the rest is linked |
| Assist        | `assist.enabled` and `assist.actions.source.organizeImports`             |
| File selection | `files.includes`, `vcs.useIgnoreFile`, `overrides` for specific folders |
| Domains       | Enabled for React, Next and test where the project uses them             |
| Rules         | `recommended` as the base, a few explicit group overrides, nursery rules only when evaluated |
| Migration     | `biome migrate --write`, `migrate eslint --write`, `migrate prettier --write`, `--include-inspired` with review |
| CI            | `biome ci`, `--changed` with `vcs.defaultBranch`, `--staged`, local `check --write` |
| Editor        | The official LSP and format-on-save                                      |
| Delivery      | Plan only now                                                            |
| ADR           | Only when a decision is structural                                       |

## Workstream A - Version and schema

1. The `$schema` URL matches the installed version, so the editor completes the
   keys that exist.
2. The plan states the 2.5.x line and treats 1.x keys as migration input, not
   as current configuration.

## Workstream B - Configuration

1. `assist.enabled` is explicit, with
   `assist.actions.source.organizeImports` for import ordering.
2. `files.includes` carries the inclusion and exclusion patterns; the removed
   `include` and `ignore` keys never appear.
3. `vcs.useIgnoreFile` reuses `.gitignore` instead of duplicating patterns.
4. `overrides` narrows rules for specific folders, tests being the usual case.
5. `linter.rules.recommended` is the base; a few overrides are named per group
   (`complexity`, `correctness`, `style`), and nursery rules enter only after an
   explicit decision.

## Workstream C - Domains

`linter.domains` enables the framework rule sets: `react` and `next` where the
project uses them, `test` on the test tree. Each domain is set to
`recommended`, with `all` reserved for a deliberate audit.

## Workstream D - CLI

`biome check`, `biome lint`, `biome format` and `biome ci` as the four
commands. Local work uses `biome check --write`, which applies safe fixes;
unsafe fixes are a separate, deliberate step.

## Workstream E - Migration

1. `biome migrate --write` upgrades an existing config to the 2.x shape.
2. `biome migrate eslint --write` and `biome migrate prettier --write` port the
   old tool settings.
3. `--include-inspired` brings rules inspired by ESLint plugins and needs a
   manual review, because the migration enables only what it could map.
4. The result is read before it is trusted: the migration replaces the linter
   settings it finds.

## Workstream F - CI and local

1. `biome ci` is the gate and does not write.
2. `--changed` with `vcs.defaultBranch` declared, so only the changed files are
   checked.
3. `--staged` is the pre-commit path and lines up with the hooks skill.
4. The CI and the local command run the same rules, only the write flag differs.

## Workstream G - Editor integration

The official language server and format-on-save are the editor path, so the
formatter and the linter agree with the terminal run.

## Workstream H - Choosing Biome

A short decision guide: a new project or one willing to take the one-time
formatting diff takes Biome; a project with a large ESLint plugin dependency
stays on ESLint and Prettier. The formatter compatibility caveat is stated
plainly: the output is close to Prettier, not identical, and an existing
codebase pays that as a large first diff.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                        | Rejects                                              | Tier | Source            |
| ------------------------------ | ---------------------------------------------------- | ---- | ----------------- |
| `biome-no-organize-imports`    | a top-level `organizeImports` key                    | A    | Upgrade guide     |
| `biome-files-includes`         | `files.include` or `files.ignore`                    | A    | Configuration     |
| `biome-no-linter-all`          | `linter.rules.all`                                   | A    | Upgrade guide     |
| `biome-schema-version`         | a `$schema` that does not match the installed version | B   | Configuration     |

## Assets and templates to ship

- `assets/templates/biome.json` (2.x, assist, files.includes, domains, rules).
- `assets/templates/biome-ci.yml` (`biome ci`, `--changed`).
- `assets/templates/migrate-biome-1-to-2.md` (removed and renamed keys).

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the ESLint boundary.
- [x] Verify the Biome 2.x facts and the current version.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Move `organizeImports` into `assist` and align the schema URL.
- [ ] Replace the migration section with the three real commands.
- [ ] Add `files.includes`, `vcs.useIgnoreFile` and `overrides`.
- [ ] Add the domains section.
- [ ] Add `--changed`, `--staged` and the local write command.
- [ ] Add the editor integration and the choosing guide.

### Phase 2 - Guardrails and assets

- [ ] Implement the four rules with fixtures and a unit test each.
- [ ] Ship the config, CI and migration templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Biome 2.x policy, since it fixes the config shape.

### Phase 3 - Verification

- [ ] Build the fixture and run `biome ci` with the reference config.
- [ ] Confirm the schema URL resolves for the installed version.
- [ ] Run the migrator on a 1.x config and inspect the diff.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The Prettier-compatibility figure in the local article (about 97%) has no
  primary source, so the plan states the caveat without the number.
- No local article is cited; the Biome documentation is the only source.

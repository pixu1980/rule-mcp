# rule-styleguide-configuration - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only, except the dedupe recorded below, which is applied now. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-fifth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-configuration/SKILL.md`, the base repository files.
- `skills/rule-styleguide/SKILL.md`, its "Project Scaffolding" section: the
  verbatim templates the scaffold mode returns.
- `src/tools/skill/_skill-tool.js`: `isStyleguides = skillName === "rule-styleguide"`,
  so the scaffold mode exists only on that tool.
- `src/core/guardrails/engine/_registry.js`: the scaffold family is gated by
  `skillName === "rule-styleguide" && mode === "scaffold"`.
- `src/core/scaffold/_parser.js`: the parser reads the "Project Scaffolding"
  section of `rule-styleguide`.

Public sources verified in this session:

- EditorConfig, https://editorconfig.org/
- Git `gitignore`, https://git-scm.com/docs/gitignore
- Git `gitattributes`, https://git-scm.com/docs/gitattributes
- nvm, `.nvmrc`, https://github.com/nvm-sh/nvm#nvmrc
- The Twelve-Factor App, config, https://12factor.net/config
- REUSE, https://reuse.software/
- GitHub, contributing guidelines, https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors

Local articles: no piece covers these files; the matches are incidental.

Problems found:

| Problem                            | Detail                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `.eslintrc.json` was recommended   | ESLint 10 removed the format; the scaffold template already ships `eslint.config.mjs`        |
| tsconfig was duplicated            | the frontend `tsconfig` restated `rule-styleguide-typescript/COMPILER.md`                     |
| `.nvmrc` appeared twice            | two sections for one file                                                                    |
| the corepack policy was repeated   | the pnpm skill owns it                                                                       |
| the scaffold instruction was false | it named `rule_tool_styleguide_configuration mode=scaffold`, a mode that tool does not expose |
| scaffold ownership is split        | the templates and the mode live in `rule-styleguide`, the description lives here              |
| `.gitattributes` is missing        | its line-ending rule is cited by the fingerprint and CSS skills and the file does not exist  |
| health files are partial           | `SECURITY.md`, `SUPPORT.md`, `FUNDING.yml`, `CODEOWNERS` are not named here                  |

## Decisions

| Question       | Decision                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedupe         | Applied now: the eslintrc section, the tsconfig section, the duplicate `.nvmrc` and the corepack section are gone; the scaffold instruction is corrected |
| Scaffold owner | Move the family key, the mode, the parser and the templates to this skill                                                                                |
| Missing files  | `.gitattributes` plus the security, support, funding and CODEOWNERS files                                                                                |
| Health extras  | `.gitmessage`, `.git-blame-ignore-revs`, `.node-version`                                                                                                 |
| Standards      | EditorConfig, Git, nvm, 12-factor, REUSE, GitHub                                                                                                         |
| Boundaries     | Confirmed: this skill owns the presence and content of the base files; tsconfig, lint, README and release are linked                                     |
| New guardrails | `scaffold-gitattributes`, `scaffold-env-example`, `scaffold-editorconfig-md`, `scaffold-no-eslintrc`                                                     |
| Severity       | The same as the eight existing scaffold rules                                                                                                            |
| Verification   | A scaffold end-to-end test, a dedupe test, a `.gitattributes` test                                                                                       |
| Delivery       | The dedupe now, the rest planned                                                                                                                         |

## Workstream A - The dedupe, applied

Done in this pass:

1. The `.eslintrc.json` section is removed. ESLint 10 has no such format and
   the scaffold template already ships `eslint.config.mjs`.
2. The frontend `tsconfig.json` section is removed; `COMPILER.md` is linked from
   the See also list.
3. The second `.nvmrc` section is removed; the first stays.
4. The corepack section becomes one paragraph and a link to
   `rule-toolchain-pnpm`.
5. The scaffold instruction now names `rule_tool_styleguide`, the tool that
   actually exposes the mode, and says the move is planned.

`.prettierrc` and `jsconfig.json` stay: no other skill owns them.

## Workstream B - Move the scaffold ownership

1. `isStyleguides` in `_skill-tool.js` becomes a check that includes
   `rule-styleguide-configuration`.
2. The scaffold family gate in `_registry.js` points at
   `rule-styleguide-configuration`.
3. `extractScaffoldSection` reads the configuration skill's scaffolding
   section, so the templates live beside the description they belong to.
4. The `rule` and `rule-styleguide` docs that mention the mode are updated, and
   the test "the scaffold mode answers only on rule-styleguide" becomes the
   contract for the new owner.

## Workstream C - Line endings

`.gitattributes` with `* text=auto eol=lf` and a binary list is added to the
base files. The fingerprint and CSS skills already tell a project to set it; the
skill that owns the base files is the right place to ship it.

## Workstream D - Health files

`SECURITY.md`, `SUPPORT.md`, `FUNDING.yml` and `CODEOWNERS` are named with what
each one answers, and the links point at `rule-process-readme` for the README
copy and at the GitHub docs for the files the platform reads. `.gitmessage`,
`.git-blame-ignore-revs` and `.node-version` are listed with their purpose.

## Workstream E - Standards

Each file cites its source: EditorConfig for `.editorconfig`, the Git docs for
`.gitignore` and `.gitattributes`, nvm for `.nvmrc`, 12-factor for `.env`,
REUSE for `LICENSE`, and the GitHub docs for `CONTRIBUTING`, `SECURITY` and
`SUPPORT`.

## Proposed guardrails

The eight `scaffold-*` rules stay. Four join them with the same behavior:

| Rule id                    | Rejects                                                        | Tier | Source       |
| -------------------------- | -------------------------------------------------------------- | ---- | ------------ |
| `scaffold-gitattributes`   | a project with no `.gitattributes`, or one without `eol=lf`    | A    | Git docs     |
| `scaffold-env-example`     | a project with no `.env.example`, or one that carries a secret | A    | 12-factor    |
| `scaffold-editorconfig-md` | `.editorconfig` with no Markdown section                       | B    | EditorConfig |
| `scaffold-no-eslintrc`     | an `.eslintrc*` file                                           | A    | ESLint 10    |

## Verification

1. A scaffold end-to-end test: every promised file is generated with its
   minimum content.
2. A dedupe test: the configuration skill carries no `tsconfig`, no `.eslintrc`
   and no corepack section.
3. A `.gitattributes` test: the file exists and normalizes to LF.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the scaffold implementation and the parser.
- [x] Reproduce the false scaffold instruction and the scaffold ownership split.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Dedupe (done)

- [x] Remove the `.eslintrc.json` section.
- [x] Remove the duplicated `tsconfig.json` and `.nvmrc` sections.
- [x] Reduce the corepack section to a link.
- [x] Correct the scaffold instruction.

### Phase 2 - Ownership and content

- [ ] Move the scaffold mode, the family gate, the parser and the templates.
- [ ] Add `.gitattributes` and the health files.
- [ ] Cite the standards per file.

### Phase 3 - Guardrails and verification

- [ ] Add the four rules with fixtures and a unit test each.
- [ ] Run the scaffold end-to-end test, the dedupe test and the gitattributes
      test.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.
- [ ] Write the ADR for the scaffold ownership move, since it changes a public
      tool mode.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/scaffold/__tests__/*.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The dedupe is applied; the scaffold ownership move is not, because it changes
  a public tool mode and the templates the parser reads.
- `.prettierrc` stays here because no other skill owns it; if a formatter skill
  is created, it becomes a link.
- No local article is cited; the file-format documentation is the source.

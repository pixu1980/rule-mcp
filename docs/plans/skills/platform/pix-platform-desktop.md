# rule-platform-desktop - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#38`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: platform. Sibling plans: `rule-platform-web`, `rule-platform-library`
(same trim model), `rule-process-adr`, `rule-process` (same guardrail shape).

## Scope decisions (owner, 2026-10-21)

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | `SKILL.md` becomes a thin navigable umbrella; the deep material moves to `references/` |
| Aux files | Move into `references/` **and serve them**: unserved files are the bug, not their size |
| Ghost plugins | Become real skills: `rule-toolchain-electron` and `rule-toolchain-tauri` |
| Similar libraries | The owner asked which other candidates are worth evaluating; Phase 0 carries the measured shortlist and waits for a verdict |
| Core rules | Collapse to one pointer line at the markup and CSS owners |
| Rule set | Six rules, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, detector intact, census, lint and typecheck |
| Commits | One per phase |
| ADR | Two: the skill shape and the plugin decision, plus the rule design |
| Done | Ghost plugins resolved and rules green |

## Evidence base (measured 2026-10-21)

`skills/rule-platform-desktop/SKILL.md` is **808 lines**, the largest skill in
the catalog, and the only one with a full auxiliary tree:

| Folder | Files | Lines |
| ------ | ----- | ----- |
| `checklists/` | 2 | 78 |
| `knowledge/` | 1 | 301 |
| `prompts/` | 4 | 103 |
| `templates/` | 3 | 98 |
| **total** | **10** | **580** |

### Nothing serves them

`src/resources/_read.js` serves a skill by reading `SKILL.md` and nothing else,
and `readSkill()` reads one file. No tool, test or resource walks
`checklists/`, `knowledge/`, `prompts/`, `templates/` or `references/`.

Across the catalog that is **81 files and 4,535 lines** nobody can reach
through the rule surface: five frontend skills, `rule-meta-astro`,
`rule-styleguide-a11y` and this one. The size is not the problem; the absence of
a consumer is.

### Two ghost surfaces

1. **Framework plugins.** The "Supported Desktop Frameworks" table lists
   `rule-platform-desktop/electron`, `rule-platform-desktop/tauri` and
   `rule-platform-desktop/neutralino` as skill plugins. None exists as a skill
   or as a directory. The body then documents full Tauri patterns (Rust
   commands, updater, deep links) against a plugin that is not there.
2. **Mobile.** `rule-platform` describes itself as covering "desktop, mobile
   (Expo), library authoring, and web" and carries an `expo` tag. There is no
   mobile skill anywhere in the catalog, and `Expo` is mentioned in 12 skills,
   the highest count of any runtime this plan measured. The router advertises a
   platform it does not serve.

### Demand, measured across the catalog

| Candidate | Skills mentioning it | Verdict this plan proposes |
| --------- | -------------------: | -------------------------- |
| Electron | 5 | skill: already the depth here, now named |
| Tauri | 1 | skill: the owner asked for it; content already exists |
| Neutralinojs | 1 (this skill only) | no skill: no demand beyond the roadmap line |
| Wails, NW.js | 0 | no skill: no demand at all |
| Expo / React Native | 12 / 5 | **`rule-platform-mobile` is the real gap** |
| Capacitor | 0 | no skill yet; watch |
| Vitest / Playwright | 9 / 13 | owned by `rule-devops-testing`; no split |
| webpack / esbuild / Bun | 6 / 5 / 7 | build-tool candidates, none urgent |

The shortlist is deliberately short: the catalog already carries 84 skills and
the landscape research that shaped the `rule-method` plan warned against adding
peers without measured demand. Expo is the one candidate with more demand than
several skills that already exist.

### Other measurements

- The nine Core Rules are the same lines copied in ten skills, labelled here as
  "inherited from rule skills".
- `src/core/detector/_rules.data.js` maps `electron` to this skill, so the
  rename or the plugin split must keep that mapping honest.
- `rule-platform` (the router) describes this skill as "Desktop (Electron),
  cross-platform desktop apps, IPC, native APIs" - still accurate after the
  trim, and it needs a row per new plugin skill.

## Target shape

`SKILL.md` keeps what a reader needs to choose and to start: the framework
table with honest status, when to use it, the process split (main, preload,
renderer), the security guards, and a pointer per `references/` file.

`references/` receives, from the body and from the four folders:

| Reference | Content today |
| --------- | ------------- |
| `main-process.md` | thin entry point, IPC handler modules, barrel |
| `preload.md` | context bridge rules, renderer mocking |
| `native-apis.md` | fs, child process, shell, window management, PDF |
| `packaging.md` | Forge vs builder, package.json skeleton, targets, CSP |
| `auto-update.md` | the dependency chain, electron-updater, Tauri updater |
| `signing.md` | macOS sign and notarize, Windows SmartScreen, distribution |
| `ci.md` | the release workflow, secrets |
| `tauri.md` | Rust commands, config, deep links |
| `knowledge/` content | the performance playbook (301 lines) |
| `checklists/`, `prompts/`, `templates/` | moved as-is, then served |

## Serving the auxiliary files

A new surface is needed, and it changes the resource count, so census and the
docs-accuracy test move with it:

- one resource per skill that has auxiliary files, listing them (name, path,
  size), plus a body fetch by name;
- `references/` becomes the single served folder name, which is why the four
  folders move into it rather than being served under four names;
- the five frontend skills, `rule-meta-astro` and `rule-styleguide-a11y` are
  migrated by their own plans, not here.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `desktop-no-ghost-plugin` | A plugin path (`rule-x/y`) with no matching skill or folder | `code` + `context.fileList` | B | red: three rows |
| `desktop-aux-served` | An auxiliary file no surface reaches and the body does not declare | `context.fileList` | B | red: 10 files |
| `desktop-no-duplicate-core-rules` | A restatement of the markup and CSS rules | `code` | B | red: nine rules |
| `desktop-owner-named` | A delegating section naming no owner | `code` | B | partially red |
| `desktop-no-stale-skill-id` | A `rule-...` id with no skill directory | `code` + `context.fileList` | B | clean |
| `desktop-platform-matrix` | A target matrix that disagrees with the framework table | `code` (tables) | B | red once the plugin column changes |

## Phase 0 - Decisions and the shortlist

- [ ] ADR: the skill shape and the plugin decision. Electron and Tauri become
      real skills; the umbrella stops naming paths that do not exist.
- [ ] ADR: the rule design, Tier B, dual detection.
- [ ] Owner verdict on the shortlist: `rule-platform-mobile` (Expo) is the
      measured gap; Neutralinojs, Wails, NW.js get no skill; Vitest, Playwright,
      webpack, esbuild and Bun stay where they are.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-desktop/`: `clean/`, `ghost-plugin/`,
      `unserved-aux/`, `duplicate-core-rules/`, `unnamed-owner/`,
      `matrix-drift/`, each with a one-line `README.md`.
- [ ] Six `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-platform-desktop`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-platform-desktop/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - References and the served surface

- [ ] Move `checklists/`, `knowledge/`, `prompts/`, `templates/` under
      `references/`, keeping the file names.
- [ ] Split the body into the nine reference files in the table above.
- [ ] New resource: list and fetch a skill's references.
- [ ] `pnpm census && pnpm census:check`; resource counts and the docs-accuracy
      test updated together.

## Phase 4 - Real plugin skills

- [ ] `rule-toolchain-electron`: main/preload/IPC, native APIs, packaging,
      signing, auto-update, the performance playbook.
- [ ] `rule-toolchain-tauri`: Rust commands, config, updater, deep links.
- [ ] The umbrella table keeps one row per real skill and a roadmap line for
      Neutralinojs with no path in it.
- [ ] Index rows in `docs/plans/skills/README.md` and `DEPENDENCIES.md`; the
      toolchain area count moves from 8 to 10.

## Phase 5 - Neighbours

- [ ] `rule-platform` router: rows for the two new skills, `expo` tag and the
      mobile claim removed until `rule-platform-mobile` exists.
- [ ] `src/core/detector/_rules.data.js`: `electron` maps to
      `rule-toolchain-electron`, with the umbrella as the fallback.
- [ ] Dispatcher rows regenerated.

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-platform-desktop/guardrails/`
- [ ] `_corpus` and `_routing-corpus` suites; the electron detector test.
- [ ] Catalog scan with the six rules: only the documented cases remain.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-platform-desktop/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-platform` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The naming the owner chose puts a desktop runtime in the toolchain area
  (`rule-toolchain-electron`), beside Vite, Rspack and Biome. The alternative
  was `rule-platform-desktop-electron`, which matches the wording the skill
  already uses ("skill plugin"). Both work; the toolchain area is where the
  build and packaging tooling already lives, and it is the owner's call, so the
  plan follows it. Consequence: the toolchain area was already planned as
  finished (rows 3-11), so two new leaves reopen it and its router plan moves.
- Splitting 808 lines into a thin body plus nine references is the largest
  edit any plan in this series proposes. The rule `desktop-aux-served` is what
  keeps the split honest: a reference that no surface reaches and the body does
  not mention fails.
- Serving references changes the MCP surface, not just a skill. If the owner
  prefers to keep the surface stable, the fallback is declaring the files in
  the body and serving them later - but then `desktop-aux-served` drops to
  "declared", and the 4,535 unserved lines stay unserved.
- The mobile gap is the finding with the most leverage here. `rule-platform`
  promises Expo and carries the tag; twelve skills mention it; no skill owns
  it. That is a routing promise the catalog cannot keep.

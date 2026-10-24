# rule-mcp-toolchain-electron - plan

Status: `planned`
Notes:`planned`

Notes: new skill, created by `rule-mcp-platform-desktop` phase 4 (ADR 152's ghost plugins). Index row `#86`, planned.

Area: toolchain, leaf. It takes the Electron depth that today lives inside
`rule-mcp-platform-desktop` (808 lines, the largest skill in the catalog) and gives
it a home a reader can route to. Siblings: `rule-mcp-toolchain-tauri`, the eight build
tool leaves, and `rule-mcp-toolchain` (the router).

## Evidence base (measured 2026-10-21)

`rule-mcp-platform-desktop` documents Electron in full and advertises three skill
plugins that do not exist (`rule-mcp-platform-desktop/electron`, `/tauri`,
`/neutralino`). Its plan (`rule-mcp-platform-desktop`, phase 4) turns the first two
into real skills. The material to move:

| Section in `rule-mcp-platform-desktop`                     | Lines | Destination                 |
| ---------------------------------------------------------- | ----: | --------------------------- |
| Main process patterns, IPC modules, barrel                 |   ~70 | body                        |
| Preload and context bridge, renderer mocking               |   ~45 | body                        |
| Native APIs (fs, child process, shell, windows, PDF)       |   ~65 | `references/native-apis.md` |
| Packaging with electron-builder, targets, CSP              |   ~60 | `references/packaging.md`   |
| Auto-update (electron-updater), code signing, notarization |  ~130 | `references/signing.md`     |
| CI release workflow, crash reporting, debugging            |   ~90 | `references/ci.md`          |
| Performance playbook and checklists (aux tree)             |   580 | `references/`               |

Electron is also the framework with the real signatures worth a rule: node
integration left on in the renderer, `webSecurity` disabled, a preload exposing
`ipcRenderer` wholesale, and an updater that downloads without a signature check.

## The five rules

| id                             | Rejects                                                                | Tier | Today |
| ------------------------------ | ---------------------------------------------------------------------- | ---- | ----- |
| `electron-no-node-integration` | `nodeIntegration: true` in the renderer                                | B    | n/a   |
| `electron-web-security-on`     | `webSecurity: false` or a relaxed CSP                                  | B    | n/a   |
| `electron-preload-minimal`     | A preload that exposes `ipcRenderer` or a whole module to the page     | B    | n/a   |
| `electron-update-signed`       | An update path that does not verify a signature                        | B    | n/a   |
| `electron-owner-named`         | A section delegating packaging, signing or CI without naming the owner | B    | n/a   |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR: the desktop family shape. The umbrella keeps the choice; this leaf
      owns the Electron runtime contract.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/toolchain-electron/`: `clean/`, `node-integration/`,
      `web-security-off/`, `wide-preload/`, `unsigned-update/`, each with a
      one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-mcp-toolchain-electron`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-mcp-toolchain-electron/guardrails/`: five rule files plus
      `index.js`.
- [ ] `guardrails:` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - The skill

- [ ] `skills/rule-mcp-toolchain-electron/SKILL.md`: main/preload/IPC, native APIs,
      packaging, signing, auto-update, plus the performance material as
      references.
- [ ] `rule-mcp-platform-desktop` phase 4 drops the moved sections and links here.

### Phase 4 - Wire it in

- [ ] `rule-mcp-toolchain` router row and Quick Selection line.
- [ ] `src/core/detector/_rules.data.js`: `electron` maps to this skill, with the
      umbrella as fallback.
- [ ] `rule-mcp-platform-desktop` keeps a row that points at this leaf.

### Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-toolchain-electron/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - The skill            | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Wire it in           | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- The move is the point: 808 lines of Electron advice inside a platform umbrella
  is a document, not a skill a router can reach. The four security rules are the
  ones a reviewer can enforce today.
- `rule-mcp-toolchain-desktop` was the alternative name; the owner chose the toolchain
  area, which is where the build and packaging tooling already lives.

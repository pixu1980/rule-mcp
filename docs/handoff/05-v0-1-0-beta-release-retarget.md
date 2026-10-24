# Session handoff 05 - v0.1.0-beta release retarget

- Branch: `main`
- Commit range covered: `78ef4f2..1d4baa0` (session created `d778312`, `1d4baa0`)
- Date: 2026-09-11 (UTC)
- Mode: handoff (full, compressed)

## What happened this session

Working tree held an uncommitted release rollback: v1.0.0 -> v0.1.0-beta
across version files, docs, changelog, and the release workflow.
Per `/rule-handoff` Step 1, grouped by concern and committed atomically
with mandatory scopes (commit-msg hook rejects scope-less messages).
No push, commits are local for review.

### Commits created

1. `d778312`, `chore(release): retarget release to v0.1.0-beta with prerelease workflow`
   - `package.json`, `server.json`: version `1.0.0` -> `0.1.0-beta`
   - `README.md`, `CLAUDE.md`: release references v1.0.0 -> v0.1.0-beta
     (v1.0.0 tag deleted; next tag `v0.1.0-beta`)
   - `.github/workflows/release.yml`: `fetch-depth: 0` on checkout +
     `prerelease: ${{ contains(github.ref_name, '-') }}` (hyphenated tags
     ship as prereleases, plain tags as stable)
2. `1d4baa0`, `docs(changelog): rewrite unreleased history for v0.1.0-beta`
   - `CHANGELOG.md`: `[Unreleased]` + `[1.0.0]` sections replaced with a
     single `[0.1.0-beta]` section (265 insertions, 99 deletions)

Left untouched: untracked `site-dist/` (generated HTML site build output,
not in `.gitignore`; deliberately not staged).

## Handoff (generated, full)

## HANDOFF: rule-mcp

### Project Identity

- Description: MCP server for rule-mcp-* skill ecosystem. Serves styleguides,
  component templates, framework best practices, and design system patterns.
- Version: 0.1.0-beta

### ADR log (accepted, most recent first)

| #           | Title                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 077         | CLI entry point loads no command handler it has not built (static decls, lazy handlers; startup perf)                      |
| 076         | Compression has four levels, no LLM in output path (off/lite/full/ultra, deterministic)                                    |
| 075         | Installer asks before copying bundled skills to central agents dir                                                         |
| 074         | Census generates eight numbered docs + three fenced blocks, one formatter                                                  |
| 073         | Installer mode step replaces agent picker (bash/PS parity)                                                                 |
| 072         | Coverage wave four holds floor at 90; daemon fixes                                                                         |
| 071         | src shared for every shareable helper (`src/shared/` + barrel)                                                             |
| 070         | Co-locate every test with its module (`__tests__` next to source)                                                          |
| 069         | Remove externally derived skills from served knowledge base                                                                |
| 068/067/066 | Coverage floor ratchet 83 -> 87 -> 89 -> 90 (endpoint 95)                                                                  |
| 065         | Glob suite runner, co-located tests, branch-coverage gate                                                                  |
| 064         | One global shim; hermetic PNPM_HOME in script tests                                                                        |
| 063         | Plans carry nested sub-steps + exhaustiveness mandate                                                                      |
| 062         | Persona plans are checklists; executed marks survive sync                                                                  |
| 058         | Command surface restructure: /rule router, rule-area-*, compression implicit, rule-process-tdd                             |
| 057         | Review personas split into per-operation commands (plan/audit/review)                                                      |
| 056         | Gateway as single entrypoint with server-side receipts                                                                     |
| 049         | v1.0.0 release + docs-accuracy guard (NOTE: release retargeted to v0.1.0-beta this session; ADR 049 predates the retarget) |
| 048         | rule-mcp-architect splits into standalone web-app repo                                                                     |
| 047         | Installer self-heals global shim, surfaces failures                                                                        |

Proposed (not accepted): 039 native Claude skills integration, 038 skill
"see also" sections, 037 lossless idempotent installer, 036 sandbox timeout
with AbortController, 035 SSE server with bearer auth. Superseded: 040
(VS Code extension fix, extension dropped per ADR 059).

### Recent commits (context at handoff time)

```
1d4baa0 docs(changelog): rewrite unreleased history for v0.1.0-beta
d778312 chore(release): retarget release to v0.1.0-beta with prerelease workflow
78ef4f2 docs(plan): mark steps 1-6, 8 and 9 executed, correct level table by measurement
0f1a4b1 docs(perf): quote measured compression and startup numbers, credit source
fd480cb perf(cli): warm --help from 216 ms to 48 ms, measured not assumed
097314f feat(resources): compress resource and prompt bodies, booked per surface
9e82936 feat(text): four compression levels behind a structural guard
13d20b6 feat(installer): ask before copying bundled skills to central agents dir
d8788ed feat(census): eight generated inventories, three fenced blocks, one formatter
```

### Docs / roadmap status

- Roadmaps: `docs/plans/execution-plan.md`, `docs/plans/structure-hygiene-plan.md`;
  ADRs 057/062/063 touched 2026-09-11 (review-persona plan rendering).
- Key docs: `docs/01-product-architecture.md` ... `docs/10-cli.md` (+ 11/12/13),
  all current as of 2026-09-11. Census docs 06-13 are generated files.
- `docs/adr/`: 74 records (001-077 with gaps at 007, 053-055).
- Convention reminder: Conventional Commits WITH mandatory scope,
  `type(scope): subject`. The `commit-msg` hook rejects scope-less subjects.

### Open work / next session

- `site-dist/` build output is untracked, decide whether to add it to
  `.gitignore` or leave as-is (no action taken this session).
- ADR 049 still records the v1.0.0 release; consider a follow-up ADR or
  amendment recording the v0.1.0-beta retarget rationale.
- The `v0.1.0-beta` tag itself has not been cut yet (`git tag v0.1.0-beta`);
  tagging triggers the GitHub Release workflow. Tags were left uncut
  deliberately, cut only on explicit request.
- Resume guidance: ADRs + snapshot above capture all decisions; continue
  without re-asking answered questions. Use tokensave graph tools for code
  exploration, not grep/glob re-reads.

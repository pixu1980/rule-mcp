# Architect Consolidation — Phase 6: Cross-Harness Entry-Points

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated `.context/` pack auto-load in every major coding agent. Generate a canonical, high-signal `AGENTS.md` at the project root (from the interview answers) and write the SAME rendered instructions into each tool's own entry file — so Claude Code, Cursor, GitHub Copilot, Gemini, Windsurf, Cline, and Pi all pick it up without manual wiring.

**Architecture:** Today the generator writes ONLY into `<targetDir>/.context/`; nothing lands at the project root, so no agent auto-loads the pack. This phase adds a root-output capability to `generator.mjs` and one new placeholder-driven `AGENTS.md` template. The AGENTS.md body is rendered ONCE (through the Phase-4 `normalizeAnswers` + placeholder fill) and fanned out to every target file with format-appropriate framing (frontmatter for Cursor/Windsurf rule files). Per the approved decision, each per-tool file carries the FULL content (not symlinks or pointers) — Copilot/Gemini/Cline read their own file literally and won't follow a pointer; duplication is safe because the files are regenerated.

**Tech Stack:** Node.js ESM, existing `generator.mjs` + `normalize.mjs` + `templates.json`, `node:test`.

## Global Constraints

- Per-tool entry files carry FULL rendered content (approved). Cursor (`.cursor/rules/*.mdc`) and Windsurf (`.windsurf/rules/*.md`) get their required frontmatter + the full body. NO symlinks.
- `AGENTS.md` and the per-tool files are written to the project ROOT (`<targetDir>/…`), NOT `.context/`. The `.context/` pack is unchanged; `AGENTS.md` points into it (`read .context/README.md` for full specs).
- AGENTS.md content is placeholder-driven so it inherits Phase-4 fill (stack, versions, `BUILD_COMMAND`, `ARCH_PATTERN`, derived `STACK_NAME`, key `ENTITY_*`/`PERSONA_*`/`FEATURE_*`, rule conventions). Reuse `normalizeAnswers`; do not re-collect.
- Both web servers' `/api/generate` (writes) and `/api/download` (in-memory) must include the new root files in their `files` output. CLI writes them too (shared generator).
- Zero new runtime deps. Front-end unchanged this phase. Commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch `feat/architect-context-pack`.

## Target entry files (written to project root)

| Tool | Path | Framing |
|---|---|---|
| Cross-tool canonical | `AGENTS.md` | plain markdown (the canonical body) |
| Claude Code | `CLAUDE.md` | full body (may prepend a 1-line `@AGENTS.md` note, but content is inlined) |
| GitHub Copilot | `.github/copilot-instructions.md` | full body |
| Gemini CLI | `GEMINI.md` | full body |
| Cline | `.clinerules` | full body |
| Cursor | `.cursor/rules/project.mdc` | `---\ndescription: <project> project rules\nalwaysApply: true\n---` + full body |
| Windsurf | `.windsurf/rules/project.md` | Windsurf rules frontmatter (`---\ntrigger: always_on\n---`) + full body |
| Pi (pi.dev) | **Task 1 confirms** — default to the user's global convention (`.agents/` canonical, `.pi/` reads it); if Pi's exact reader is unverifiable, write `.agents/AGENTS.md` full body and note it | per Pi convention |

## AGENTS.md content (the new template — placeholder-driven)

Author `templates/AGENTS.md` (added to `templates.json`) with these sections, using `[KEY]` placeholders that Phase-4 fills:
- `# [PROJECT_NAME]` + one-line pitch `[PROJECT_ELEVATOR_PITCH]`.
- `## Stack` — type `[PROJECT_TYPE]`, `[STACK_NAME]`, frontend `[FRONTEND_FRAMEWORK]`, backend `[BACKEND_FRAMEWORK]`, DB `[DATABASE]`, CSS `[STACK_CSS_APPROACH]`, Node `[NODE_VERSION]`, pkg mgr `[STACK_PKG_MANAGER]`, lint `[STACK_LINT_TOOL]`.
- `## Commands` — build `[BUILD_COMMAND]`, preview `[PREVIEW_COMMAND]`, test (from testing fields).
- `## Architecture` — `[ARCH_PATTERN]`.
- `## Conventions` — the rule rules (zero CSS classes, zero inline styles, semantic HTML, external CSS via `adoptedStyleSheets`; pnpm exact versions; English source; `./src` layout) + `[DELIVERY_WORKFLOW]`/`[QUALITY_GATES]` if present.
- `## Domain` — key entities `[ENTITY_1]`…, personas `[PERSONA_1]`…, features `[FEATURE_1]`… (a few, not all).
- `## Do / Don't` — a short generated do/don't from constraints.
- `## Full specs` — `This is a summary. Full SDD specs live in ./.context/ — start with .context/README.md.`

Keep it lean and skimmable (the whole point for LLM consumption). Empty sections follow the Phase-5 policy once P5 lands; for now, unfilled keys render as today.

---

### Task 1: Root-output capability + `AGENTS.md` template + Pi convention

**Files:** Modify `skills/rule-architect/generator.mjs`; add `skills/rule-architect/templates/AGENTS.md` + register in `templates.json` (or inline its content there, matching how existing templates are stored); Test `test/architect-entry-points.test.mjs`.

- [ ] **Step 1** Determine how templates are stored (inline `content` in `templates.json` vs files under `templates/`) — match the existing convention when adding AGENTS.md.
- [ ] **Step 2** Add a `root: true` flag (or an `output` that begins with `/`) to mark templates that write to `<targetDir>` instead of `<targetDir>/.context/`. Extend `generateContext`/`generateContextContent` to honor it (compute `fullPath = root ? join(targetDir, output) : join(ctxDir, output)`; still return the entry in `files` with its root-relative path).
- [ ] **Step 3** Add the `AGENTS.md` template (content per the section above), `root: true`, placeholder-driven.
- [ ] **Step 4** Confirm Pi's entry-file convention (check rule-mcp docs / `.agents/` convention). Encode the decision in the fan-out list (Task 2). If unverifiable, default to `.agents/AGENTS.md` + a code comment, and note it in the report for human confirmation.
- [ ] **Step 5** Write `test/architect-entry-points.test.mjs`: generate with the Phase-4 fixture; assert `AGENTS.md` is produced at root (in `files` with path `AGENTS.md`), contains the real `PROJECT_NAME`/stack/`BUILD_COMMAND` values (not `**[KEY]**`), and contains the `.context/README.md` pointer. Run → drives Steps 2-3.
- [ ] **Step 6** Commit `feat(architect): root-output + canonical AGENTS.md template`.

### Task 2: Fan out the rendered body to all per-tool entry files

**Files:** Modify `skills/rule-architect/generator.mjs` (fan-out step); extend `test/architect-entry-points.test.mjs`.

**Interfaces:** After the AGENTS.md body is rendered (filled), write it to each target in the table with its framing. Implement as a post-render fan-out (render once, write N) — do NOT add N template copies.

- [ ] **Step 1** Extend the test: assert every target file in the table is produced at its path with the full body, and that the frontmatter-framed ones (`.cursor/rules/project.mdc`, `.windsurf/rules/project.md`) start with valid frontmatter followed by the body. Run → fails.
- [ ] **Step 2** Implement the fan-out in the generator: after producing the AGENTS.md content, emit the per-tool files (full body; prepend frontmatter for cursor/windsurf; `.github/` dir created as needed). Include them in the returned `files` array + written to disk in `generateContext`.
- [ ] **Step 3** Run the test → passes. Run Phase-1/4 suites (characterization, parity, fill-coverage) → still pass (root files must not change `.context/` output).
- [ ] **Step 4** Commit `feat(architect): fan out AGENTS.md to CLAUDE/Cursor/Copilot/Gemini/Windsurf/Cline/Pi entry files`.

### Task 3: Server/CLI surface + wire tests

**Files:** Verify both servers' `/api/generate`+`/api/download` include the new root files (they call the shared generator — should be automatic; add an assertion). Modify `package.json` (`test:all`+`ci`).

- [ ] **Step 1** Start a server, POST the fixture to `/api/download`; assert the response `files` now include `AGENTS.md` + `CLAUDE.md` + `.github/copilot-instructions.md` etc. with real content. (If the download UI lists files, confirm they show.)
- [ ] **Step 2** Append `node test/architect-entry-points.test.mjs` to `test:all`+`ci`. Validate JSON. Run the suite → pass.
- [ ] **Step 3** Commit `test(architect): wire entry-points gate into CI`.

## Self-Review

- **Spec coverage:** S4 (canonical AGENTS.md + all target harnesses incl. Pi) → Tasks 1–2; server/CLI surface + CI → Task 3.
- **Placeholder scan:** AGENTS.md section list is concrete; fan-out table is explicit; Pi is a Task-1 verification (not a guess).
- **Type consistency:** `root` flag on templates; fan-out reuses the single rendered body; `files[]` entries gain root-relative paths.
- **Risk:** the frontmatter formats (Cursor/Windsurf) — a bad frontmatter breaks the rule file; Task 2 Step 1 asserts valid frontmatter. Pi convention is the main unknown → Task 1 Step 4 verifies or flags. Root-output must not alter `.context/` output (byte-identical guarantee) → Task 2 Step 3 re-runs the fill/parity suites.

## Roadmap after P6
P5 templates conditional + lean (kill `**[KEY]**`; also applies to AGENTS.md empty sections) · P7 UI Summary•Files panel · fast-follows F1/F5/F7/F8.

# docs-engineer plan

- **Role**: docs-engineer v1
- **Date**: 2026-09-05

Steps re-derived from the open findings in [the review](../reviews/docs-engineer.md) on every run, worst
first. This file is deleted by the run that finds nothing open.

## Roadmap

### Step 1 — Align `docs/06-env-variables.md` with the real runtime paths (F1, high)

**Finding:** the env-variables handbook documents `~/.rule-mcp/projects/<project>/…` as the home of telemetry, usage and flights, but `src/cli/paths.js:61` resolves the state dir to `~/.local/state/rule-mcp` (overridable via `RULE_MCP_STATE_DIR`). The doc says the opposite of what the code does.

**What it takes:**
1. Rewrite rows 76–80 of `docs/06-env-variables.md` to the resolved paths: state files under `~/.local/state/rule-mcp` (or `$RULE_MCP_STATE_DIR`), data under `~/.local/share/rule-mcp`, config under `~/.config/rule-mcp`.
2. State the override env var next to the path table so readers know the documented default is movable.
3. Cross-check `docs/06-env-variables.md:24` (F6, prompt-text recording location) in the same pass — both trace to the same `getRuntimePaths()` source of truth.

**Dependencies:** none (self-contained doc edit).
**Verify:** `grep -n "\.rule-mcp" docs/06-env-variables.md` returns nothing for state paths; `grep -c "\.local/state/rule-mcp" docs/06-env-variables.md` ≥ 1.
**Done when:** every path in the env handbook matches `src/cli/paths.js` and the override var is documented next to it.

---

### Step 2 — Repair the `docs/README.md` handbook index (F2, high)

**Finding:** the handbook links to `./adr/README.md` and `./adr/DECISIONS.md`, which do not exist (the index is `docs/adr/ADR.md`), and it does not list the new `07-census.md`, so two entries dead-end and one document is unreachable from the handbook.

**What it takes:**
1. Replace the broken links with the real index: `[ADR index](./adr/ADR.md)`; drop the `DECISIONS.md` row or repoint it to `ADR.md` (no decision-summary file exists).
2. Add the `07-census.md` row (with purpose: full MCP tool + slash-command census) to the Handbook table.
3. Re-run the link check to confirm zero broken internal links.
4. Add a link-rot guard: re-use the existing `docs-scan`/`docs-accuracy` test seams (or a tiny `test/docs-links.test.mjs`) so a dead `./` link fails CI instead of shipping.

**Dependencies:** Step 4 (agent-instructions deduplication) removes a third dead-end source; do the index edit after so one pass fixes all rows.
**Verify:** the node link-walk reports 0 broken internal links, now and via the new guard test.
**Done when:** every entry in `docs/README.md` resolves to a real file and every numbered document (01–07) is listed.

---

### Step 3 — Resolve the colliding ADR numbering (F3, medium)

**Finding:** `docs/adr/` holds two overlapping series: numbers 001–009 appear 2–3 times each (upstream-ported decisions vs native ones) and 010–016 overlap with the modern series; `ADR.md` indexes a subset and does not record that 018 is superseded by 047.

**What it takes:**
1. Audit the duplicate-numbered files (001–012) and classify each as (a) upstream-ported evidence kept for attribution or (b) native decision.
2. Decide one canonical key: either rename the upstream-ported files into an `upstream/` subfolder (recommended, keeps the 1:1 with upstream ADR numbers) or renumber the native series to the next free number. Do NOT delete — ADR 041/042 fidelity rules require attribution.
3. Regenerate `docs/adr/ADR.md` from the canonical set so every number appears exactly once; run the numbering doctor (`rule-mcp doctor` / docs-numbering-doctor test) to verify.
4. Mark the supersession in the index: add a "superseded by 047" note on the 018 row (mirroring the note already in the 018 file).

**Dependencies:** Step 2 (docs/README index) — the handbook links to `adr/ADR.md`, so the index must be correct before the link points at it.
**Verify:** `ls docs/adr/*.md | grep -oE "/[0-9]{3}-" | sort | uniq -c | awk '$1>1'` returns no duplicate numbers; numbering-doctor passes.
**Done when:** every ADR number is unique, `ADR.md` lists all decisions in canonical order, and superseded statuses (e.g. 018) appear in the index.

---

### Step 4 — Delete the stale `docs/agent-instructions.md` duplicate (F4, medium)

**Finding:** `docs/agent-instructions.md` (unnumbered, unindexed) duplicates `docs/05-agent-instructions.md` with diverging and outdated content (old tool names, no gateway). Per the handbook's own rules, docs that repeat must point instead.

**What it takes:**
1. Diff both files to confirm `05-agent-instructions.md` is the live, correct version (it is updated by the installer; the unnumbered file predates the consolidation).
2. Delete `docs/agent-instructions.md`; keep the numbered `05-` file as the single source.
3. Update the docs/README handbook table if it referenced the unnumbered file.
4. Re-run `docs-scan` and the link-walk to confirm no dangling reference.

**Dependencies:** none; do it before Step 2 so the handbook index is written once, against the final file set.
**Verify:** `ls docs/*.md` shows only numbered docs plus README; `grep -rn "agent-instructions.md"` returns only the intentional `05-` references.
**Done when:** one agent-instructions document exists, it is the numbered `05-` file, and no doc references the deleted file.

---

### Step 5 — Unify ADR front matter and status casing (F5, medium)

**Finding:** the legacy ADR series (001–016) lacks `Author` and in places `Date` front matter and mixes casing (`**Status**: accepted` vs `**Status**: Accepted`); editing 018 to `superseded` was not reflected anywhere machine-checkable.

**What it takes:**
1. Normalize the legacy ADR files to the modern template: `# NNN: title`, `- **Date**: YYYY-MM-DD`, `- **Status**: accepted|proposed|deprecated|superseded`, `- **Tags**: …`, `- **Author**: rule-mcp-architect` (the original author, not the modern one) — lowest-touch: only the front-matter block, never the Decision/Consequences prose.
2. Standardize status casing to lowercase everywhere (`Accepted` → `accepted`).
3. Extend the docs-numbering-doctor (or a new guard in `docs-accuracy`) to assert every ADR has Date/Status/Author and a lowercase status, so front-matter drift fails CI.
4. Re-run `rule_tool_process_adr`-generated index check to ensure the index regenerates cleanly.

**Dependencies:** Step 3 (canonical numbering) — front-matter normalization is frictionless once each file has a unique number and stable name.
**Verify:** `grep -L "^- \\*\\*Author" docs/adr/*.md` returns 0 files; `grep -rE "\\*\\*Status\\*\\*: [A-Z]" docs/adr/` returns nothing.
**Done when:** every ADR file matches the template front matter, statuses are lowercase, and a CI guard enforces it.

---

### Step 6 — Fix the prompt-recording claim in `06-env-variables.md:24` (F6, low)

**Finding:** row 24 claims prompt text is recorded into "the project's own `.rule-mcp/`" directory, which contradicts the runtime stateDir resolution (same root cause as F1).

**What it takes:**
1. Rewrite the prompt-recording description to the real location (state dir / `RULE_MCP_STATE_DIR`).
2. Keep the privacy statement intact (length-only mode, nothing sent anywhere) — only the path changes.
3. Verify with the Step 1 grep.

**Dependencies:** Step 1 (same file, same rows region) — edit in the same pass.
**Verify:** `sed -n '24p' docs/06-env-variables.md` shows the corrected path.
**Done when:** no occurrence of `~/.rule-mcp` or project-local `.rule-mcp` remains in the env handbook except where it genuinely means a project-relative file.

---

## Dependency graph

```
Step 4 (delete dup agent-instructions) ─┐
Step 6 (env:24 prompt path) ──┬──── Step 1 (env paths) ──┐
                              │                          ├──► Step 2 (handbook index) ──► Step 3 (ADR numbering) ──► Step 5 (ADR front matter)
                              └──────── Step 4 ──────────┘
```

Execution order: **Step 6 → Step 1 → Step 4 → Step 2 → Step 3 → Step 5** (each later step depends only on the earlier ones; docs/README index edits happen once all files exist).

---

### Step 7 — Retire the compliance mega-reviews and historical handoffs (F7, medium)

**Finding:** `docs/reports/claude-compliance-mega-review.md`, `gpt-5.6-sol-compliance-mega-review.md` and `security-performance-audit-2026-08-04.md`, plus handoffs `07/08/10/11/13-*.md`, describe remediation that is fully implemented and already recorded in ADRs 017, 030-035, 037-044. They repeat history instead of pointing at the living record; the audit analysis and finding→ADR mapping is preserved in `docs/reports/README.md` and handoff `09` is the current-session record.

**What it takes:**
1. Delete the three report files and the five historical handoff files.
2. Keep and update `docs/reports/README.md` (index + this analysis) and `docs/handoff/README.md` (drop deleted entries).
3. Re-run the link-walk: no surviving doc may reference a deleted file.
4. Do NOT create new ADRs — every deleted document's decisions already have numbers; duplicates would violate the "point, don't repeat" rule.

**Dependencies:** Step 2 (handbook index) — do the deletion before re-indexing so broken links cannot be reintroduced.
**Verify:** link-walk returns 0 broken; `git status` shows exactly the 8 deleted + 2 updated files.
**Done when:** the three reports and five historical handoffs are gone, their content reachable via ADR numbers + report README, and the link-walk is clean.

---

## Definition of done

- `docs/06-env-variables.md` contains no fictional `~/.rule-mcp` state paths (F1, F6).
- `docs/README.md` lists 01–07 and links only existing files (F2).
- `docs/adr/` has unique numbers and a complete, supersession-aware `ADR.md` index (F3).
- One agent-instructions doc survives, numbered (F4).
- Every ADR matches front-matter template, lowercase status, enforced by CI (F5).
- Link-walk, `docs-scan` and `docs-accuracy` all pass green.
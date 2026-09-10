# docs plan

- **Role**: docs v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/docs.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Target order

The numbered sequence becomes a developer journey - install, understand, use, operate,
configure, trust, reference, contribute. Generated docs keep their numbers (07-12) so the
census pipeline is untouched; three manual docs move, one is absorbed, one is appended.

| New   | File                       | Was                        | Role in the journey                                                               |
| ----- | -------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| 01    | 01-getting-started.md      | 01-getting-started.md         | Install and first run (the entry point becomes step 1)                            |
| 02    | 02-product-architecture.md | 02-product-architecture.md | What it is and how it works                                                       |
| 03    | 03-agent-instructions.md   | 03-agent-instructions.md   | How an agent uses it every day                                                    |
| 04    | 04-operations.md           | 04-operations.md     | Operate it: plugins, release, troubleshooting (tool reference deleted, see DOC-2) |
| 05    | 05-env-variables.md        | unchanged                  | Configure it                                                                      |
| 06    | 06-06-privacy.md              | unchanged                  | Trust it                                                                          |
| 07-12 | generated census docs      | unchanged                  | Reference: skills, tools, prompts, commands, CLI, personas                        |
| 13    | 13-engineering-guides.md   | 07-engineering-guides.md   | Contribute to it (advanced tail)                                                  |

Blast radius, measured in the audit: `package.json` prebuild prettier list,
`scripts/reports/census/_marker-targets.mjs` (writes into 01 by name),
`tests/tools/auto-adr-flag.test.mjs`, `tests/docs/docs-accuracy.test.mjs`
(`DOC_NUMBERS` gains "13"), 19 relative cross-links in docs/, 2 GETTING_STARTED
links in the repo README, and the docs/README index table.

## Steps

- [ ] **Step 1 - DOC-2 (high)**: Gut 04-operations.md (1508 lines, four legacy docs pasted whole): the hand-written tool reference duplicates the generated 08-tools.md/09-prompts.md and has already drifted (101 vs 96 tool mentions). ~750 lines die, zero information lost.
  - [ ] **1.1**: Delete the `## Preserved source: TOOLS.md` half: Quick Reference table, per-tool sections 0-10, `## MCP Resources (rule://*)`, `## MCP Prompts`, `## Best Practices`, `## Appendix: Framework -> Skill -> Tool` (lines ~9-755).
  - [ ] **1.2**: In their place write one short section "Tool and prompt reference" with three pointer lines: full tool list -> `./08-tools.md`, prompts -> `./09-prompts.md`, resources -> the `rule://` section of 08; note both are census-generated and never hand-edited.
  - [ ] **1.3**: Promote the three survivors to real sections: strip the `## Preserved source: PLUGINS.md / RELEASE.md / TROUBLESHOOTING.md` wrappers, renumber their internal headings to one consistent level (## Plugins, ## Release, ## Troubleshooting with ### children), remove duplicated intro paragraphs.
  - [ ] **1.4**: Sweep the survivors for stale facts against the fourth-pass tree (`scripts/fix/post-process/index.mjs` paths, `scripts/reports/census/` names, `src/server/index.js`) and fix what moved.
  - [ ] **1.5**: Gate: `pnpm exec prettier --check docs/04-operations.md`, `node --test tests/docs/docs-accuracy.test.mjs tests/docs/docs-scan.mjs`, and `grep -c "pix_tool" docs/04-operations.md` drops from 101 to under 10.
- [ ] **Step 2 - DOC-3 (medium)**: Merge the two concatenated documents inside 02-product-architecture.md (analysis sections 1-7, then a full second `## 1.`-`## 12.` sequence under "Preserved source: ARCHITECTURE.md").
  - [ ] **2.1**: Inventory both halves (`grep -n "^## " docs/02-product-architecture.md`) and map each preserved section to keep / merge-into-analysis / drop-as-stale.
  - [ ] **2.2**: Fold the keepers into one outline with unique numbers: overview, architecture, data flow, transports, skill loading, resource scheme, security model; the gap-analysis and recommendations sections merge into a single "History and rationale" tail or move to the ADRs they produced.
  - [ ] **2.3**: Drop what the fourth-pass refactor falsified: the "Module Tree (Target)" (superseded by the real tree), "Dependencies (Target)", and any "current vs target" table whose target shipped - link ADR 057/061 instead of restating them.
  - [ ] **2.4**: Verify every remaining path/count claim against the tree (`ls src/core`, `wc -l`, census counts) - the doc must say what IS, with `<!-- census:begin:family-counts -->` staying the one generated block.
  - [ ] **2.5**: Gate: exactly one `# Title`, one `## N.` sequence (`grep -c "^## 1\." == 1`), `pnpm census` leaves the file unchanged, docs-accuracy green.
- [ ] **Step 3 - DOC-4 (medium)**: Renumber to the target order in one commit, so the sequence reads basics-to-advanced. Depends on steps 1-2 (move clean content, not the duplicates).
  - [ ] **3.1**: `git mv docs/01-getting-started.md docs/01-getting-started.md && git mv docs/02-product-architecture.md docs/02-product-architecture.md && git mv docs/03-agent-instructions.md docs/03-agent-instructions.md && git mv docs/04-operations.md docs/04-operations.md && git mv docs/07-engineering-guides.md docs/13-engineering-guides.md` (order matters: stage the swaps through the free numbers or a temp name).
  - [ ] **3.2**: Update the 19 relative cross-links inside docs/ (`grep -rn "](\./0[1-9]-\|](\./1[0-3]-" docs/*.md`) and the 2 GETTING_STARTED links in the repo README.
  - [ ] **3.3**: Update the writers and tests that name files: `scripts/reports/census/_marker-targets.mjs` (family-counts target -> 02-product-architecture.md), `package.json` prebuild prettier list, `tests/tools/auto-adr-flag.test.mjs` paths, `tests/docs/docs-accuracy.test.mjs` (`DOC_NUMBERS` gains "13").
  - [ ] **3.4**: Rebuild the docs/README handbook table in the new order with the journey one-liners from the target-order table above.
  - [ ] **3.5**: Gate: `pnpm census && pnpm exec prettier --write docs/*.md && git diff --stat docs` shows only the intended renames, then `pnpm test:foundations` green.
- [ ] **Step 4 - DOC-5 (medium)**: Converge 05-env-variables.md on one variable list (today: 34 distinct `RULE_MCP_*` names in the manual half vs 15 rows in the generated registry - drift built in).
  - [ ] **4.1**: Diff the two lists (`grep -o "RULE_MCP_[A-Z_]*" | sort -u` on each half) and classify each of the ~19 missing vars: real and undocumented in the registry, or dead in code.
  - [ ] **4.2**: Extend `scripts/reports/census/_env-vars.data.mjs` to every live variable, one-line effect each; delete entries for vars no longer read (`grep -rn "RULE_MCP_<NAME>" src bin scripts` as the liveness check).
  - [ ] **4.3**: Rewrite the manual half of 05 as behavior prose only (how config persists, precedence, examples), pointing into the generated registry instead of re-listing names.
  - [ ] **4.4**: Gate: `pnpm census` regenerates the block, both halves grep to the same variable set, docs-accuracy and census-generated suites green.
- [ ] **Step 5 - DOC-1 (low)**: Fix the docs/README handbook table: one header row, one separator (today the header repeats three times, broken markdown).
  - [ ] **5.1**: Delete the two duplicated `| File | Purpose |` + separator pairs.
  - [ ] **5.2**: Gate: `pnpm exec prettier --check docs/README.md` and a rendered-preview eyeball; folds into step 3.4 if executed together.
- [ ] **Step 6 - DOC-6 (low)**: Fix the getting-started TOC (mixed numbering: items `2. [A. ...]` vs headings `## 2. A. ...`, off-by-one anchors).
  - [ ] **6.1**: Renumber sections to one scheme: `## 1. Prerequisites`, `## 2. Install` with `### 2a` .. `### 2d` per mode, `## 3. Agent integration`, `## 4. Verify`, `## 5. Next steps`.
  - [ ] **6.2**: Regenerate the TOC to match the headings exactly (anchor check: every TOC link resolves in a markdown preview).
  - [ ] **6.3**: Rides along with step 3's rename commit.
- [ ] **Step 7 - DOC-7 (low)**: Re-align every docs/README purpose line with its file (today 02's row promises "setup, agent installation, daemon, transports" that the file does not contain).
  - [ ] **7.1**: Rewrite the 04-operations.md row: "Operate it: plugins, release pipeline, troubleshooting".
  - [ ] **7.2**: Re-check the other twelve rows against `grep "^## "` of each file and fix any other says-vs-does drift found. Depends on steps 1 and 3.

## Dependencies

- Steps 1 and 2 first (dedupe before moving), independently of each other.
- Step 3 is the rename commit; steps 5, 6 and 7 ride along with it.
- Step 4 is independent (census data change + 05 edit).

## Verification once all steps are done

- `pnpm census && pnpm exec prettier --check docs/*.md` - no drift.
- `pnpm test:foundations` and `node --test tests/docs/*.test.mjs tests/tools/auto-adr-flag.test.mjs` - green.
- Read docs/README top to bottom: the order tells the install -> understand -> use -> operate -> configure -> trust -> reference -> contribute story with no duplicated content left.

# docs plan

- **Role**: docs v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/docs.md) on every run, worst
first. This file is deleted by the run that finds nothing open.

## Target order

The numbered sequence becomes a developer journey - install, understand, use, operate,
configure, trust, reference, contribute. Generated docs keep their numbers (07-12) so the
census pipeline is untouched; three manual docs move, one is absorbed, one is appended.

| New | File | Was | Role in the journey |
| --- | --- | --- | --- |
| 01 | 01-getting-started.md | GETTING_STARTED.md | Install and first run (the entry point becomes step 1) |
| 02 | 02-product-architecture.md | 01-product-architecture.md | What it is and how it works |
| 03 | 03-agent-instructions.md | 04-agent-instructions.md | How an agent uses it every day |
| 04 | 04-operations.md | 02-tools-operations.md | Operate it: plugins, release, troubleshooting (tool reference deleted, see DOC-2) |
| 05 | 05-env-variables.md | unchanged | Configure it |
| 06 | 06-privacy.md | unchanged | Trust it |
| 07-12 | generated census docs | unchanged | Reference: skills, tools, prompts, commands, CLI, personas |
| 13 | 13-engineering-guides.md | 03-engineering-guides.md | Contribute to it (advanced tail) |

Blast radius, measured in the audit: `package.json` prebuild prettier list,
`scripts/reports/census/_marker-targets.mjs` (writes into 01 by name),
`tests/tools/auto-adr-flag.test.mjs`, `tests/docs/docs-accuracy.test.mjs`
(`DOC_NUMBERS` gains "13"), 19 relative cross-links in docs/, 2 GETTING_STARTED
links in the repo README, and the docs/README index table.

## Steps

| Step | Finding | Severity | What it takes |
| --- | --- | --- | --- |
| 1 | DOC-2 | high | Gut 02: delete the preserved TOOLS.md half (Quick Reference, per-tool sections 0-10, MCP Resources, MCP Prompts, Best Practices, the framework appendix) and replace it with three lines pointing at the generated 08-tools.md and 09-prompts.md; keep PLUGINS, RELEASE and TROUBLESHOOTING as real sections with one heading level, not "Preserved source" pastes. ~750 lines deleted, zero information lost - the generated docs are the source of truth and 02 had already drifted (101 vs 96 tool mentions). |
| 2 | DOC-3 | medium | Merge the two halves of 01: fold the preserved ARCHITECTURE.md sections (1-12) into the analysis sections (1-7) as one outline with unique numbers; drop the sections the fourth-pass refactor made stale (module tree, "target" dependencies) or mark them as history. One document, one `# Title`, one numbering. |
| 3 | DOC-4 | medium | Renumber per the target-order table above, in one commit: `git mv` GETTING_STARTED.md -> 01-getting-started.md, 01 -> 02, 04 -> 03, 02 -> 04, 03 -> 13; update the 19 docs cross-links, the docs/README index, the 2 repo-README links, `_marker-targets.mjs` (family-counts target file), the package.json prettier list, `auto-adr-flag.test.mjs` paths, and add "13" to `DOC_NUMBERS` in docs-accuracy. Run `pnpm census && pnpm test:foundations` to prove the pipeline still lands on the renamed files. Depends on steps 1-2 (move clean content, not the duplicates). |
| 4 | DOC-5 | medium | Converge 05 on one list: the generated registry block becomes the complete variable table (extend `scripts/reports/census/_env-vars.data.mjs` to the 34 documented vars, or generate it from a single registry module), and the manual half keeps only the prose that explains behavior, pointing into the table instead of re-listing names. |
| 5 | DOC-1 | low | Fix the docs/README handbook table: one header row, one separator; regenerate/lint with prettier so it cannot re-break silently. |
| 6 | DOC-6 | low | Rewrite the 01-getting-started TOC with one scheme (numbered sections, letters only inside the install-mode names) and anchors that match the headings; folds into step 3's rename commit. |
| 7 | DOC-7 | low | Rewrite the docs/README purpose line for the new 04-operations.md so it describes what the file actually contains (plugins, release, troubleshooting) - and re-check every other row against its file while editing. Depends on steps 1 and 3. |

## Dependencies

- Steps 1 and 2 first (dedupe before moving).
- Step 3 is the rename commit; steps 6 and 7 ride along with it.
- Step 4 is independent (census data change + 05 edit).
- Step 5 is independent, one-line fix.

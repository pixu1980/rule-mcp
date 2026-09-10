# docs review

- **Role**: docs v2
- **Date**: 2026-09-10

Findings distilled from [the audit](../audits/docs.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence | Summary |
| --- | --- | --- | --- | --- |
| DOC-2 | high | resolved | audit: heading map of 02; pix_tool mentions 101 (02) vs 96 (08) | 04-operations.md (1508 lines) is four legacy docs pasted whole; its hand-written tool reference duplicates generated 08-tools.md and 09-prompts.md and has drifted |
| DOC-3 | medium | resolved | audit: heading map of 01 shows two '## 1.' ... '## 7.' sequences | 02-product-architecture.md concatenates two documents with clashing section numbers (analysis 1-7, then preserved ARCHITECTURE.md 1-12) |
| DOC-4 | medium | resolved | audit: file list and titles; docs-accuracy DOC_NUMBERS contract | The numbered sequence does not read as a basics-to-advanced guide: the entry point 01-getting-started.md is unnumbered, agent workflow (04) sits after the operator doc, contributor guide (03) sits before anything it depends on |
| DOC-5 | medium | resolved | audit: RULE_MCP_ counts 34 (manual half) vs 15 (registry block) | 05-env-variables.md carries two lists of the same RULE_MCP_* variables: manual prose names 34 distinct vars, the generated registry block only 15 - drift is built in |
| DOC-1 | low | resolved | audit: grep -c '\| File' docs/README.md = 3 | docs/README.md handbook table repeats its header row three times, so the index table is broken markdown |
| DOC-6 | low | resolved | audit: 01-getting-started.md TOC lines 10-18 | 01-getting-started.md table of contents mixes two numbering schemes (items '2. A.', '3. B.') and its numbers do not match the section anchors |
| DOC-7 | low | resolved | audit: README row for 02 vs heading map of 02 | docs/README.md describes 02 as 'Operator handbook: setup, agent installation, daemon, transports' but the file contains a tool reference, plugins, release and troubleshooting - no setup or daemon sections |

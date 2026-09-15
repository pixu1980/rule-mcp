# Backlog

The queue of work not owned by a persona trio. Each item names the symptom, not
the fix, so the run that picks it up can choose the fix. The queue is empty right
now; the Done section is the record.

## Done

- **B-1** `handoff doctor` regenerates a stale `ADR.md` (a missing, extra or changed row, not only an
  unordered one) and refreshes a `HANDOFF.md` that a project keeps (commit `db33d01`).
- **B-2** Every install plan ends with a `cli` task that runs `rule-mcp --version`,
  `tools list` and `doctor` through the shim on PATH; a missing or broken shim fails the install
  (commit `9b053c3`).
- **B-3** A close-session handoff plans and applies the ADR/handoff renumbering before it reads the
  ADR log; a plain handoff stays read-only and the doctor remains the explicit dry run. Commit
  messages are reported, never rewritten automatically (commit `4863126`).
- **B-4** The wizard forces Ink `interactive: true` (overriding the CI detection that disables
  synchronized output) and turns on `incrementalRendering`, so the VS Code terminal stops
  flickering (commit `1d4eba8`).
- **B-5** `rule_tool_audit` and `rule_tool_review` are tools for IDEs that list tools, and a full
  skills install generates one `rule-<operation>-<role>` skill per active role with
  `exposeTool: false` (commit `f2f4c25`).

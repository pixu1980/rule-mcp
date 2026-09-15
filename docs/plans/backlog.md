# Backlog

Open work that is not owned by a persona trio. Newest first. Each item names the
symptom, not the fix, so the run that picks it up can choose the fix.

## B-4 - Installer flickering in the VS Code bash terminal

The installer renders with flicker in the VS Code integrated bash terminal. Find
the renderer setting that stops it (or the terminal capability it mis-detects).

## B-5 - Persona operations as tools, and generated skills in `~/.agents/skills`

`/rule-audit-*`, `/rule-review-*` and `/rule-plan-*` exist only as slash commands.
Custom IDEs that call tools rather than commands cannot reach them; a tool per
operation would. In the same move, installing the skills into `~/.agents/skills`
does not generate the persona skills there, so a home install has no
`rule-plan-<role>` skills to load.

## Done

- **B-1** `handoff doctor` regenerates a stale `ADR.md` (a missing, extra or changed row, not only an
  unordered one) and refreshes a `HANDOFF.md` that a project keeps (commit `db33d01`).
- **B-2** Every install plan ends with a `cli` task that runs `rule-mcp --version`,
  `tools list` and `doctor` through the shim on PATH; a missing or broken shim fails the install
  (commit `9b053c3`).
- **B-3** A close-session handoff plans and applies the ADR/handoff renumbering before it reads the
  ADR log; a plain handoff stays read-only and the doctor remains the explicit dry run. Commit
  messages are reported, never rewritten automatically (commit `4863126`).

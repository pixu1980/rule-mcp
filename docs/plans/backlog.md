# Backlog

Open work that is not owned by a persona trio. Newest first. Each item names the
symptom, not the fix, so the run that picks it up can choose the fix.

## B-1 - `handoff doctor` does not regenerate ADR.md and HANDOFF.md

`rule-mcp handoff doctor --fix` renumbers ADRs but does not refresh the
`docs/adr/ADR.md` index or the `docs/handoff/` documents that quote them. A run
that renumbers leaves both stale.

## B-2 - A from-zero install must prove the `rule-mcp` CLI works

Installing from an empty machine has to end with a `rule-mcp doctor` (and a
real `rule-mcp tools list`) that answers. Today the install can succeed
while the global CLI is missing or points at the wrong path.

## B-3 - Automatic ADR and handoff renumbering

Renumbering ADRs (and the handoff numbers that follow them) is still a manual
step. Find a way to detect, plan and apply the renumbering automatically, with a
dry run and a commit-message rewrite.

## B-4 - Installer flickering in the VS Code bash terminal

The installer renders with flicker in the VS Code integrated bash terminal. Find
the renderer setting that stops it (or the terminal capability it mis-detects).

## B-5 - Persona operations as tools, and generated skills in `~/.agents/skills`

`/rule-audit-*`, `/rule-review-*` and `/rule-plan-*` exist only as slash commands.
Custom IDEs that call tools rather than commands cannot reach them; a tool per
operation would. In the same move, installing the skills into `~/.agents/skills`
does not generate the persona skills there, so a home install has no
`rule-plan-<role>` skills to load.

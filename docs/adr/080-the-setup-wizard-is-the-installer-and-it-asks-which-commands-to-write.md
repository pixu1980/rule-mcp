# 080: The setup wizard is the installer, and it asks which commands to write

- **Date**: 2026-09-13
- **Status**: accepted
- **Tags**: installer, cli, wizard, commands, ux
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The installer was two implementations of the same thing. `scripts/install.sh` and `scripts/install.ps1` resolved the binary, wrote the shim, detected agents, appended the instruction block, asked about skills in a single y/N line and ran the health check - about 2000 lines of shell and PowerShell; `src/cli/` did the same work in node, and the two drifted. The shell asked its questions as a stream of prompts with no way back, and it decided the blast radius for the user: instruction files and slash commands were written by default, and what they wrote was everything.

That last part stopped being tenable when every skill got its own command (ADR: one area command per skill). A full write is 152 command files in every agent directory. The selection that narrows it - presets, or families plus areas plus skills - already existed as data in `src/cli/install/_selection.js`, with `--preset/--families/--areas/--skills` on `agent-commands` and a `@clack/prompts` picker nothing called. So the question was asked by flags, answered by a picker no code path reached, and ignored by every install.

## Decision

The wizard is the installer. `src/cli/setup/` holds the whole flow - preflight, agents, mode, optional steps, commands, review, apply - and the shell and PowerShell scripts become bootstraps: check node, resolve the binary, forward every argument to `rule-mcp setup`. A terminal gets the full-screen Ink wizard; a pipe, a CI job, `--json`, `--no-wizard` or a node older than the renderer gets the plain runner with the same plan, printed rather than drawn.

The commands step is the fifth screen. It offers the three presets with the count each one writes, and Custom, which drills into families, then areas, then the skills of those areas. It is skipped entirely when the optional steps say no command files are being written. What it answers becomes `--preset` or `--families/--areas/--skills` on the `agent-commands --sync` run the plan spawns, which is the same argv a flagged install produces: `selectionOf` reads flags into a selection, `selectionArgs` writes a selection back into flags, and `src/cli/install/_selection.js` stays the only place that decides what a selection means.

The four flags that narrow the surface are spelled `--commands-preset`, `--commands-families`, `--commands-areas`, `--commands-skills`. `--skills` was already the optional step that copies the skill catalog to `~/.agents/skills`, and one flag with two meanings is a flag nobody can document.

No selection is not an empty selection. A run that answers nothing writes every command, which is what an install did before the surface grew one per skill.

## The rules the shell owned

The instruction files got two blocks, and only one of them was in node. The
short routing line lived in `cli/installers/_writers-text.js`; the enforced
workflow - evidence before implementation, failing tests before code,
guardrails before done - was a heredoc in `install.sh`, and it was the copy
that named the tools correctly. The node block advertised `pix_component`,
`pix_check`, `pix_search`, `pix_scaffold` and `pix_process_adr`, none of which
this server registers: every tool is `pix_tool*`.

Both blocks now live in `cli/installers/_instruction.data.js`, with the shell's
names, and both are written and swept by the same pair of functions. A
repository check that used to read the tool names out of `install.sh` reads
them out of that module instead - the bootstrap has no rules to carry.

## The runtime home is part of the install, not of one client's config

The first task of every plan creates `~/.rule-mcp/{state,data,projects,config}` and defaults `config/env.json`, the server's own home for the controls a user sets - the prompt-recording one above all. The alternative was writing a privacy decision into whichever client happened to be configured first and leaving the other hosts without it.

## Consequences

One implementation, in node, tested on every platform without a terminal: `_options`, `_plan-*`, `_preflight`, `_scan` and `_run-plan` are pure or read-only, and only `_app-*`, `_step-*` and `_widget-*` know Ink exists. Those are imported lazily, so `--help` and a piped install never load a renderer they will not draw with.

The costs are real and accepted. Ink 7 declares node >= 22 while the package floor is 20, so a node 20 install gets the plain runner and is told why. The renderer is two more runtime dependencies - `ink` and `react` - in a package that had four. And a review screen that lists the plan before touching a file is only honest if every screen above it is honored, which is why the selection is threaded to the argv rather than stopping at the step: a question whose answer the plan drops is worse than a question never asked.

`@clack/prompts` remains, for the skills picker and `config`; the selection picker built on it is removed rather than kept beside a wizard that asks the same thing.

`install` without a wizard stays the narrow command it always was - the
mcp.json entry and the router command file - so a flag naming a step of the
plan is named back at the user rather than dropped, with `setup` as the
command that honors it. The plain runner prints each task's detail as well as
its summary: the wizard shows it on the review screen before anything runs,
and a piped install that printed only the summary could not be audited for
what it was about to write.

The tests followed the code. The bash and PowerShell contracts - shim probing,
picker keystrokes, phase ordering - were assertions about an implementation
that no longer exists; they are now assertions about the node that replaced it,
plus one parity test that holds the four bootstraps to checking node, resolving
the binary and forwarding to `setup`.

## Alternatives Considered

1. Keeping the shell installer and adding the selection to it, rejected: it is the implementation that drifted, and a shell picker cannot go back a step
1. A rail entry per custom stage (families, areas, skills), rejected: three of the four are conditional, and a rail that grays out most of itself reads as a broken install
1. Asking for the commands before the optional steps, rejected: the answer is meaningless when no command files are written
1. Reusing `--skills` for the skill names of a selection, rejected: it already means the bundled-skills step
1. Defaulting to Full so nothing is lost, rejected: 152 files per agent directory is the outcome nobody chose and everybody got

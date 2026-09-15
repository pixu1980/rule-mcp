# 080: One installer, a Node wizard with shell bootstraps

- **Date**: 2026-09-10
- **Status**: superseded
- **Tags**: installer, cli, tui, ink, shell, powershell, testing
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

> Superseded by [ADR 090](090-the-setup-wizard-is-the-installer-and-it-asks-which-commands-to-write.md). The wizard this decision describes was superseded by the one develop shipped, which also asks which commands to write.

## Context

The install surface was three implementations of one contract. `scripts/install.sh` (1172 lines) and `scripts/uninstall.sh` (993 lines) carried their own agent matrix, their own hand-rolled ANSI picker with a differential renderer, their own rules-block text, and their own shim logic. `scripts/install.ps1` (777) and `scripts/uninstall.ps1` (661) carried a third copy for Windows. Underneath all three, `src/cli/install/`, `src/cli/installers/`, `src/cli/skills-install/` and `src/cli/daemon/` already implemented agent detection, per-agent config writes, skills installation and service registration in Node.

The copies drifted, as copies do. `install.sh` appended the instruction block to `~/.cursorrules` while `uninstall.sh` cleaned `~/.cursor/.cursorrules`, so Cursor kept the block forever. The bash and PowerShell agent matrices disagreed with the Node catalog. `uninstall.sh` ran `sed '/export OPENAI_API_KEY=".*"/d'` over every shell profile, deleting the user's own keys whether or not this installer had ever written them. The interactive picker could only be tested through a macOS PTY (`/usr/bin/script`), so the whole interactive path was unverified on Linux and Windows CI.

The request was a full-viewport, step-based, granular wizard. OpenTUI was evaluated first and rejected on evidence: `@opentui/core@0.5.11` declares `engines: {"bun": ">=1.3.0", "node": ">=26.4.0"}`, and on Node 24.19.0 `createCliRenderer()` throws `OpenTUI native FFI is not available for this runtime yet`. An installer that cannot start on the Node the user already has is worse than the shell it replaces. `ink@6.8.0` declares `engines: {"node": ">=20"}`, matching this package's own floor exactly, and renders in both TTY and non-TTY streams.

## Decision

One implementation, in Node, behind one command.

`src/cli/setup/` holds the wizard: an Ink 6.8.0 + React 19.2.8 full-viewport application on the alternate screen, seven steps for install (preflight, agents, mode, extras, review, install, done) and five for uninstall (select, purge, review, remove, done). The steps are pure views over wizard state; nothing is written until the review step is confirmed. A plan is data - `buildInstallPlan` and `buildUninstallPlan` return an ordered list of tasks whose construction performs no work - so the review screen shows exactly what will happen, and a dry run is the same list with a flag flipped rather than a second code path.

The logic the shell scripts owned alone moves into the same package: the runtime home, the global shim, the instruction block, the commit hook, the shell profiles, the Docker step. Everything else delegates to the modules that already existed. Steps that print (`skills install`, `agent-commands`, `doctor`) run out of process so their stdout cannot land inside the frame.

`rule-mcp setup` is the entry point, `--uninstall` the other direction. The four scripts shrink to bootstraps of about 60 lines each: check Node, resolve the binary, forward the arguments. Under `curl | bash` the bootstrap borrows `/dev/tty` so a piped install still gets the wizard - gated on stdout also being a terminal, so a scripted run stays non-interactive instead of blocking on a keystroke nobody will send.

Two behaviors change deliberately. The instruction block is written and removed through one target list, legacy Cursor path included, so install and uninstall can no longer disagree. Shell-profile cleaning is narrowed to `# rule-mcp:` comments and the single export each one annotates; an uninstall is not a license to delete lines it did not author.

## Consequences

Positive: 3603 lines of shell become 4 bootstraps totaling ~250 lines plus ~2000 lines of tested Node. The interactive path is tested headlessly on every platform - Ink renders into any stream, so the fake-terminal suite replaced the macOS-only PTY test. Every step is granular and reversible: agents are individually selectable, optional steps say which files they touch, the purge is its own screen and starts empty. The Cursor asymmetry, the profile over-deletion and the catalog drift are structurally impossible now, and the wizard surfaced a real pre-existing bug on the way (`agent-commands --remove --sync` threw ENOENT on a detected agent whose command directory did not exist yet).

Negative: `ink` and `react` join the production dependencies - 39 packages - on a server whose runtime does not otherwise need React. The wizard is pinned to `ink@6.8.0` because `ink@7` raises the Node floor to 22 while this package supports 20; that pin has to be revisited when the floor moves. Views are written with `React.createElement` rather than JSX, because this repository ships source to npm with no build step and a transpiler would mean the installer could not run from a checkout. The PowerShell bootstraps are unverified locally (no `pwsh` on this machine); their parse test skips itself when `pwsh` is absent and runs in CI where it is present.

## What would end this

If Ink's Node floor moves past this package's own `engines`, or the alternate-screen render proves unreliable on a terminal users actually have, the frame is the part to reconsider - not the plan/task split underneath it, which is renderer-independent.

## Alternatives Considered

1. OpenTUI (`@opentui/core`): rejected on evidence. It requires Node >= 26.4.0 and throws `OpenTUI native FFI is not available for this runtime yet` on Node 24, so the installer could not start on the machine it is meant to install onto.
1. A hand-rolled alternate-screen renderer with no new dependencies: rejected. It is roughly a thousand lines of widget and diff-renderer code to own and test, which is the cost the shell picker was already paying.
1. Keep the shell scripts full and add the wizard beside them: rejected. That is the drift this decision exists to end - every future agent would be added twice.
1. Delete the scripts and document `npx rule-mcp setup` only: rejected. The documented `curl | bash` install is the entry point people use, and a bootstrap that checks Node before anything else gives a better failure than a package manager error.

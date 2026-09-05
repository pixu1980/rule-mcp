# 038: The installer offers the whole agent catalog, not the detection result

- **Date**: 2026-08-06
- **Status**: accepted
- **Tags**: installer, agents, ux, devin, windsurf, deprecation
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

`./scripts/install.sh` probed ~20 known config paths and then built its
interactive picker **from the probe result**. On a machine where only
`~/.claude.json` and `~/.codex/config.toml` existed, the picker offered exactly
two entries, and there was no visible way to configure anything else.

The failure is that detection and eligibility were treated as the same thing.
They are not:

- an agent installed _after_ the script runs has no config file yet, and the
  user typically runs the installer precisely when setting a machine up;
- several agents only write their config on first use, so a freshly installed
  Cursor or Zed is invisible to a file probe;
- an agent that stores its config somewhere the matrix does not know about is
  unreachable, with no hint that `--agent <name>` exists.

Separately, two catalog entries were wrong. Devin (Cognition) was missing
entirely. And Windsurf was carried as a live target with a comment claiming
Antigravity superseded it - Antigravity is Google's; Windsurf was acquired by
Cognition, so Devin is its successor.

## Decision

**Detection marks an entry; it never filters the catalog.**

- The picker lists every supported target. Entries found on the machine are
  labeled `(detected)` and start checked, so the common path is still one
  Enter. Everything else is one Space away.
- An empty detection no longer aborts. Interactively it opens the picker with
  nothing checked; non-interactively it says so and points at `--agent`.
- The **non-interactive** path still configures only detected agents. Writing
  two dozen configs for agents the user does not have would be the opposite
  mistake.

**Devin is a first-class target.** Its config is
`~/.config/devin/mcp_config.json` (`%APPDATA%\devin\mcp_config.json` on
Windows) with the standard `mcpServers` shape, per docs.devin.ai. The file name
is `mcp_config.json`, not the `mcp.json` every other generic agent uses, so it
gets an explicit path rather than the default derivation. Devin documents no
global instructions file, so none is written - inventing one would put a file on
disk that nothing reads.

**Windsurf is deprecated, not removed.** It is skipped by `--agent all` and
unchecked by default in the picker; naming it explicitly still installs, with a
warning naming Devin as the successor; its uninstaller stays wired so existing
setups can be cleaned. Deleting the code path would strand anyone who installed
it.

## Consequences

**Positive**

- The reported machine now shows all 22 targets with Claude and Codex marked
  `(detected)`, instead of a two-item list.
- `test/install-agent-catalog.test.mjs` pins all three behaviors: the picker
  iterates the catalog, Devin resolves to its documented path, and Windsurf is
  skipped by a sweep but installable and removable by name.
- The PTY acceptance test now covers what the bug was about: it drives the
  cursor to an agent that is _not_ installed in the fake HOME and checks it.

**Negative**

- The picker is a 22-row list where it used to be a short one. Pre-selection
  keeps the common case to a single keystroke, but a first-time user sees more.
- The catalog and the detection matrix must stay index-aligned in two bash
  arrays. Inserting Devin before the OS-dependent VS Code and JetBrains entries
  meant shifting their indices in both `install.sh` and `uninstall.sh`; getting
  that wrong silently probes the wrong path.

**Neutral**

- `pix_apply`-style safety is unchanged: everything still writes under
  `$HOME` (ADR 035).

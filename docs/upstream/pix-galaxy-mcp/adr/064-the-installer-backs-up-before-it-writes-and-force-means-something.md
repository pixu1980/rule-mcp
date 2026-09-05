# 064: The installer backs up before it writes, and --force means something

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: installer, cli, safety, lint, defects
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two defects found while clearing eslint warnings, both hiding as `no-unused-vars`.

`installAgent` destructured `force` and never read it. `installCommand` threads it in from a CLI flag that `help` documented as "Override existing config", and `scripts/install.sh` accepts `--force` and passes it down to the shell command installer, so two layers were forwarding a flag the third ignored. Meanwhile `agentCommandsCommand` in `src/cli/commands.js` honored `--force` with clear semantics: skip a command file that already exists, overwrite it when forced. The same files were written by both paths, with different answers to the same question.

And the file writing itself had a split that had gone the wrong way. `atomicWrite` took a backup and had no callers. `writeText` took none and had all thirty-two, while carrying a `@deprecated Use atomicWrite for safety` note nobody had acted on. Every config write in that file is an upsert, reading a user's existing file and merging our server into it, so the writes most in need of a backup were the ones not taking one.

## Decision

One writer. `writeText` keeps the name every call site uses and gains the backup, so `<file>.bak` holds what was there before any upsert. The temp-file dance the unused function performed is not carried over: it bought nothing on top of the backup, since a crash mid-write leaves the `.bak` either way.

`--force` gates the command files, which is where it has meaning. An existing `/rule-*` file is left alone unless forced, matching what `agent-commands` has always done. The MCP configuration is not gated, because those writes are upserts that add our server to whatever is already there and destroy nothing; a flag guarding them would be guarding an operation that does not need it.

The help text says that now rather than "Override existing config", which described neither behavior.

`env` is removed from the signature. It had no caller anywhere.

## Alternatives considered

- **Make `--force` gate the MCP config write too.** Rejected: the write is an upsert, so refusing it without a flag would block idempotent reinstalls to protect against a loss that cannot happen.
- **Delete `atomicWrite` as dead code.** That is what the lint warning asked for, and it would have settled the question in favor of writing user configuration without a backup.
- **Rename `force` to `_force` and move on.** Rejected: an underscore says deliberately unused, and this was a documented flag that did nothing.

## Consequences

`test/install-force-and-backup.test.mjs` pins both, and it was checked against the previous implementation: three of its eight assertions fail there and all eight pass now. Wired into `test:installer`.

A reinstall no longer overwrites a command file somebody edited. That is the intended behavior and it is also a change: anyone relying on reinstall to restore the shipped command set needs `--force`, which is what `pnpm mcp:install` already passes.

Backups accumulate as `<file>.bak`, one per written config, overwritten on each subsequent write. That is one file per agent config rather than a growing set, and it is the price of being able to undo a merge into a file we did not author.

Both defects were found by reading warnings rather than by a test failing. The lint threshold moved to zero in the same session, which is what makes the next one visible.

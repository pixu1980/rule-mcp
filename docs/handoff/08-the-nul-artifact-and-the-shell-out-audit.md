# Session handoff 08 - The `nul` artifact, and the audit of the surface that produced it

- Branch: `main`
- Covers: `38e5e904..e50f011c`
- Date: 2026-09-15
- Documents: `docs/audits/security.md` (security v2), `docs/reviews/security.md`, `docs/plans/security.md`

## What happened

**The artifact.** A 31-byte file named `nul` appeared in the repository root after every full
test run, containing `/bin/sh: sc: command not found`. Root cause: `tryExec('sc query "..." 2>nul
|| echo NOT_FOUND')` in `src/cli/daemon/_windows-service.js` is cmd syntax, so on a host whose
shell is not cmd the redirect opens a real file. It had been deleted once already, in `bb00a3b0`,
and came back on the next run.

Two measurements narrowed the culprit. First, the redirect is redundant: `tryExec` runs with
`stdio: "pipe"`, which discards stderr already (measured: `echo OUT; echo ERR 1>&2` under that
option captures `OUT` only). Dropping it from all five `sc` probes keeps the Windows behavior
identical and stops the artifact, without adding a branch only one platform can take - an earlier
attempt using a per-platform null sink pushed branch coverage to 90.97 percent against the floor
of 91, so that approach was replaced. Second, the file was not written by the platform fixture:
when `_platform-arms.fixture.mjs` fakes `process.platform = "win32"`, node picks `ComSpec` as the
shell, which does not exist here, so no shell runs and no file appears. `_windows-service-arms.test.mjs`,
which calls the same arms with the real platform, is the one that wrote it.

The regression test runs the arms in a child process whose working directory is a scratch
directory and asserts that directory stays empty. It failed on the old code with `['nul']`.

**The audit.** The `nul` finding was a symptom of a surface nobody had looked at as a whole, so
the security persona audited it: 55 `tryExec` call sites, the single `shell: true` site, the
command strings the three platform adapters build, the two files they generate and later execute,
and the shim that runs whatever PATH resolves. Eight findings are open in
`docs/reviews/security.md`, with steps in `docs/plans/security.md`, worst first. The headline
measurements, all reproduced in `docs/audits/security.md`:

- a value holding `$(...)` executes through the `chmod` template (`_launchd.js`), and through the
  generated macOS wrapper, where the escaper is an XML escaper;
- every value in the surface is a module constant, a `homedir()` path or the install path, so no
  request, repository file or agent argument reaches a command string - the prerequisite is
  control of HOME or of the install tree;
- the PowerShell fallback is the only shell that parses an interpolated string;
- a failing command returns `error.message`, which carries the command line and stderr into the
  tool result;
- `shimWorks()` ran a planted binary from PATH and reported success;
- `tryExec` maps every failure, including the 1 MiB output cap, to an empty string;
- two measured quoting defects: the Windows `binPath` double-quotes an already quoted line, and the
  systemd `ExecStart` leaves unbalanced quotes for an argument holding a quote.

## Measured, and not fixed here

`pnpm test:coverage` reports 90.97, 90.97, 91.03 and 90.99 percent branches against a floor of 91
on an unchanged tree, with the covered and total counts both moving between runs (for example
7713/8475 passing, 7714/8479 failing). The floor sits inside the run-to-run noise band, so the
gate can flip without a code change. It is not caused by the `nul` fix: the same measurements were
taken with those edits stashed. Recorded in the audit as an out-of-scope observation and in commit
`38e5e904`; raising the floor or stabilizing the measurement is its own change.

## Gates

| Gate                                                       | Result                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm test:all`                                            | 1735 pass, 0 fail, 3 skipped (one more than before: the regression test) |
| `pnpm lint`                                                | 0 errors, 36 warnings                                                    |
| `pnpm format`                                              | clean                                                                    |
| `pnpm census:check`                                        | census is current                                                        |
| `tests/docs/*`                                             | 58 pass                                                                  |
| `pnpm test:coverage`                                       | red at 90.99 percent branches, floor 91 (see above)                      |
| `nul` after a full run                                     | no such file                                                             |
| `rule_tool_check rule-styleguide-english` on the audit prose | 59 of 59 pass                                                            |

## Open items

- The eight findings in `docs/plans/security.md`, worst first: SEC-1 shell interpolation, SEC-2 XML
  escaping in a shell context, SEC-3 the `shell: true` fallback, SEC-4 the error message, SEC-5 the
  shim check, SEC-8 the two quoting defects, SEC-6 the empty-string failure, SEC-7 the duplicated
  surface.
- The coverage gate above.
- `docs/plans/oss.md` still carries unmarked steps whose code has landed (handoff 07 lists which).

## Commits

| Commit     | Subject                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `38e5e904` | fix(daemon): stop the Windows service probe writing a file named nul    |
| `e50f011c` | docs(security): audit the shell-out surface of the daemon service layer |

## Convention reminder

Every commit is `type(scope): subject` plus a DCO `Signed-off-by` trailer. The `commit-msg` hook
rejects a scope-less message.

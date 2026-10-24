# Handoff: the corepack guardrails, a completed roadmap, and the shell-out surface

**Branch:** main
**Commits covered:** `613b4d0e..f03ff4e9` (6 commits)
**Date:** 2026-09-20

## Session Summary

Three threads, in this order. First, a mandatory guardrail: a generated
`package.json` must carry neither the corepack activation fields nor `engines`,
and the write path strips them before checking. Second, the roadmap, which
named three horizons and none of the queues that carry them, was completed and
linked to `docs/plans/` and `docs/reviews/`. Third, the security plan was
worked from the top: six of its eight steps are done.

## Work Completed

### 1. No corepack, no engines (ADR 109)

- `skills/rule-mcp-toolchain-pnpm/guardrails/_no-engines.js` (new): `pkg-no-engines`
  forbids `engines` in a `package.json`, next to `pkg-no-corepack`. Both are in
  the baseline, so every skill applies them. The front matter of
  `rule-mcp-toolchain-pnpm/SKILL.md` declares the new rule.
- `src/core/guardrails/_manifest-strip.js` (new): the write path removes
  `packageManager`, `engines` and `devEngines.packageManager` from a manifest
  before the gateway checks it, so the receipt binds the cleaned content and the
  reply carries it back. The path decides, not the content.
- `package.json` drops `engines`; the Node floor lives in `.nvmrc`, the
  installers (`NODE_MIN=20`) and CI.
- Documentation: the policy section in `rule-mcp-toolchain-pnpm`, `rule-mcp-styleguide-json`
  and `rule-mcp-toolchain-project` says rule-mcp does not support corepack.

### 2. The roadmap

`ROADMAP.md` now links `docs/plans/` and `docs/reviews/`, adds the security
surface and the architecture debt, names the v0.1.0-beta release target, lists
the six owner-only actions that block three phases, and corrects two stale
claims: the PowerShell bootstraps are read by a test, never executed in CI, and
the documentation site is built, only undeployed.

### 3. Security, SEC-1 through SEC-6 (docs/plans/security.md)

- SEC-1 (high): `tryExecFile(file, args)` runs an argv array, so no shell parses
  a path. The launchd, systemd and Windows adapters use it. A test drives all
  three against a HOME whose name carries `$(touch INJECTED)`, a quote, a
  semicolon and a space, and asserts the path arrives whole and the payload
  never runs.
- SEC-2: the launchd wrapper single-quotes its paths instead of XML-escaping
  them.
- SEC-3: the PowerShell fallback launches with an argv array, not `shell: true`.
- SEC-4: a failed install reports the exit code, never the command line or
  stderr.
- SEC-5: `shimWorks()` resolves the shim to this checkout's entrypoint before
  running it. A symlink or a launcher that names the entrypoint is trusted;
  anything else is refused without being executed.
- SEC-6: the Windows `binPath` and the systemd `ExecStart` are built from the
  argv array, each element escaped by its own tool's rules.

## Verification

| Gate                                 | Result                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `scripts/ci/run-tests/index.mjs all` | 1829 tests, 1824 pass, 3 skipped, 2 fail (both pre-existing, see below) |
| `eslint bin/ src/ tests/`            | 0 errors, 36 warnings (cap 50)                                          |
| `prettier --check '**/*'`            | all files match                                                         |
| `tests/docs/*.test.mjs`              | 58/58                                                                   |
| daemon suite                         | 51/51                                                                   |
| setup + install + installers         | 264/265                                                                 |
| `handoff doctor` at the tip          | clean: 109 ADRs, 15 handoffs, both indexes current                      |

Two tests fail, neither from this work:
`src/cli/install/__tests__/_installer-stdio-path.test.mjs` hardcodes the checkout
at `~/Projects/rule-mcp` and the global shim at
`~/Library/pnpm/bin/rule-mcp`, while this machine has them elsewhere; and
`src/cli/commands/__tests__/_daemon.test.mjs` binds a fixed port, so it loses a
race when the whole suite runs in parallel. It passes alone and in the
`installer` suite.

## Next Session

Resume the security plan from **SEC-7** in `docs/plans/security.md`.

- SEC-7 (low): `tryExec` collapses every failure, including the output cap, into
  `""`, so "died" and "printed nothing" are one value. Return a discriminated
  result and update the callers that compare against `""`. Roughly 20 callers.
- SEC-8 (low): the daemon shell-out surface exists twice, in `src/cli/daemon/`
  and `src/cli/commands/daemon/`. Point one at the other and assert one owner
  per platform command in the repository-contract test.

After the security plan closes, the next block is **ARCH-1** in
`docs/plans/architect.md`: break the eight-module cycle that ties tool
invocation to skill loading, self-update and the gateway.

Owner-only and network work cannot be done from a session: the six GitHub
clicks in `docs/plans/github.md`, the signed tag and release, the MCP registry
publish, and the Pages deploy.

### Resume Prompt

next session opens with this block. Add path of this document and first step of next session before saving it.

```prompt
Resume work on rule-mcp. Run `rule_tool_process_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The handoff document is `docs/handoff/15-security-argv-and-shim-trust.md`.
First step: SEC-7 in docs/plans/security.md - replace the string-returning tryExec with a discriminated result (ok, stdout, exit code, capped) and update the callers that compare against "", then SEC-8 (one owner for the daemon command strings) to close the security plan.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
```

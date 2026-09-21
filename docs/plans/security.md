# security plan

- **Role**: security v2
- **Date**: 2026-09-15
- **Scope**: The shell-out surface of the daemon service layer: every execSync/tryExec call built by string interpolation (src/cli/daemon/_windows-service.js, _launchd.js, _systemd.js, src/cli/setup/_shim.js and src/shared/_process.js), whether any interpolated value is attacker- or user-controllable, every `shell: true` site, and the recent finding that a cmd-only redirect (`2>nul`) in a cross-platform-callable function created a real file in the working directory. Injection risk, cross-platform shell escapes, and what the pipe/redirect semantics actually guarantee.

Steps re-derived from the open findings in [the review](../reviews/security.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Steps

- [x] **Step 1 - SEC-1 (high)**: tryExec hands every interpolated string to a shell: a value containing `$(...)` executes, measured with the template this surface uses. Reachable values are HOME-derived paths and the install-path-derived command line, so the prerequisite is control of HOME or of the install directory.
  - [x] **1.1**: Replace the interpolated command strings in the daemon service layer with an argv-array (execFile) helper so no shell parses a path
  - [x] **1.2**: Add a test per adapter asserting that a path containing `$(`, a double quote, `;` and a space is passed as one argument and executes nothing
  - [x] **1.3**: Re-run the daemon arm tests under the darwin, linux and win32-forced fixtures
- [x] **Step 2 - SEC-2 (medium)**: XML escaping is used as shell escaping: generateWrapperScript writes escapePlist(ep.node) into a bash script that launchd executes.
  - [x] **2.1**: Quote the wrapper's exec arguments for the shell, or generate the wrapper from the argv array
  - [x] **2.2**: Cover wrapper generation with a test asserting a path containing shell metacharacters is quoted
- [x] **Step 3 - SEC-3 (medium)**: The PowerShell fallback passes an interpolated string to a shell (the only `shell: true` site in src).
  - [x] **3.1**: Launch PowerShell with an argv array passing the script as one argument, or drop the shell and quote both values
  - [x] **3.2**: Add a test asserting the fallback builds its arguments without a shell
- [x] **Step 4 - SEC-4 (medium)**: A failing service command returns error.message, which carries the full command line and the tool's stderr, to the caller.
  - [x] **4.1**: Return a fixed reason plus an exit code instead of the raw message and keep the command line out of the tool result
  - [x] **4.2**: Cover the failure shape of each adapter with a test that asserts what the error string contains
- [x] **Step 5 - SEC-5 (medium)**: shimWorks() verifies the shim by executing whatever the PATH resolves for rule-mcp.
  - [x] **5.1**: Resolve the shim target and compare it with the checkout's own entry point before running it
  - [x] **5.2**: Test that a shim resolving outside the checkout is reported as not ours
- [x] **Step 6 - SEC-8 (medium)**: Argument quoting in the generated command lines is broken in two measured ways, one on Windows and one in the systemd unit.
  - [x] **6.1**: Build the Windows binPath from the argv array instead of interpolating an already-quoted string
  - [x] **6.2**: Quote systemd ExecStart arguments with one escaper that also escapes an embedded quote, and test both cases
  - [ ] **6.3**: Verify both generated lines on a real Windows and a real Linux host (not verifiable on this machine; the escaper is covered by unit tests instead)
- [x] **Step 7 - SEC-6 (low)**: tryExec collapses every failure into an empty string, including the output cap, so 'died' and 'printed nothing' are the same value to callers.
  - [x] **7.1**: Return a discriminated result (ok, stdout, exit code, capped) or an explicit sentinel instead of ""
  - [x] **7.2**: Update the callers that compare against "" to check the new result
- [x] **Step 8 - SEC-7 (low)**: The daemon shell-out surface exists twice in the live tree, so the same command strings are maintained in two places.
  - [x] **8.1**: Point the serve command at the daemon modules and delete the duplicate command strings
  - [x] **8.2**: Assert one owner per platform command in the repository contract test

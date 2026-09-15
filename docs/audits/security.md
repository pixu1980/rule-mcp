# security audit

- **Role**: security v2
- **Date**: 2026-09-15
- **Scope**: The shell-out surface of the daemon service layer: every execSync/tryExec call built by string interpolation (src/cli/daemon/_windows-service.js, _launchd.js, _systemd.js, src/cli/setup/_shim.js and src/shared/_process.js), whether any interpolated value is attacker- or user-controllable, every `shell: true` site, and the recent finding that a cmd-only redirect (`2>nul`) in a cross-platform-callable function created a real file in the working directory. Injection risk, cross-platform shell escapes, and what the pipe/redirect semantics actually guarantee.

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Surface resolved

| File                                                   | In scope because                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `src/shared/_process.js`                               | `tryExec` is the one shell sink every other site calls: `execSync(command, { stdio: "pipe" })`                     |
| `src/cli/daemon/_windows-service.js`                   | 9 `sc` command strings, the only `shell: true` site, the `2>nul` redirect this run started from                    |
| `src/cli/daemon/_launchd.js`                           | 5 `launchctl`/`chmod` command strings built from HOME-derived paths                                                |
| `src/cli/daemon/_systemd.js`                           | 8 `systemctl` command strings                                                                                      |
| `src/cli/daemon/_service-shared.js`                    | `HOME`, `resolveEntrypoint`, `escapePlist`, `generateWrapperScript` - the values the commands above interpolate    |
| `src/cli/daemon/_launchd-plist.js`, `_systemd-unit.js` | the plist, unit and wrapper text the service layer writes and later has executed                                   |
| `src/cli/setup/_shim.js`                               | 3 command strings, one of them executing the PATH-resolved `rule-mcp`                                        |
| `src/cli/commands/daemon/_service.js`, `_process.js`   | the second, reachable copy of the same `launchctl`/`systemctl`/`sc` strings (see `src/cli/_register-server.js:58`) |
| `src/cli/setup/_service-status.js`                     | a third `sc query` probe (`sc query ${WINDOWS_SERVICE_NAME}`, unquoted, constant value)                            |

`grep -rn "shell: *true" src/ scripts/ bin/ --include=*.js --include=*.mjs | grep -v __tests__` returns exactly one
line: `src/cli/daemon/_windows-service.js:68`. `grep -rn "tryExec(" src/ --include=*.js | grep -v __tests__` returns
55 call sites, 40 of them inside the files above.

## Evidence

| What was measured                                        | How                                                                                                                             | Result                                                                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2>nul` on a host whose shell is not cmd                 | `execSync('echo OUT 2>nul', { stdio: "pipe" })` in a scratch dir                                                                | directory contains `["nul"]`                                                                                                                                                      |
| `2>/dev/null` on the same host                           | `execSync('echo OUT 2>/dev/null', { stdio: "pipe" })` in a scratch dir                                                          | directory contains `[]`                                                                                                                                                           |
| what `stdio: "pipe"` does with stderr                    | `execSync('echo STDOUT-ONLY; echo STDERR-TEXT 1>&2', { stdio: "pipe" })`                                                        | captured = `"STDOUT-ONLY"`; stderr is discarded by the pipe, which is why the redirect was redundant                                                                              |
| the launchd `chmod` template, fed a command substitution | `tryExec('chmod +x "/tmp/rule-audit-home/$(touch /tmp/rule-audit-marker-2)/.local/bin/rule-mcpd"')`                         | marker created = `true`                                                                                                                                                           |
| the windows `binPath` template as written                | `sc config "rule-mcp" binPath= "${command}" start= auto` with `command` already quoted                                    | `binPath= ""/opt/homebrew/.../node" "/tmp/install path/bin/x.js" serve --transport sse"` - nested double quotes                                                                   |
| the generated macOS wrapper, fed a command substitution  | `generateWrapperScript({ node: "/tmp/rule-audit-node/$(touch /tmp/rule-audit-marker-3)/node", ... })` then run that shape in bash | substitution survives `escapePlist` = `true`; marker created = `true`                                                                                                             |
| the systemd `ExecStart` line as generated                | `generateSystemdUnit({ command: ["/usr/bin/node", '/tmp/a b"/x.js', "serve"] })`                                                | `ExecStart=/usr/bin/node "/tmp/a b"/x.js" serve` - unbalanced quotes for an argument holding a quote; systemd is absent on this host, so systemd's own parse is not measured here |
| what `shell: true` does with one string                  | `execSync('echo one; touch /tmp/rule-audit-shelltrue; echo two', { shell: true })`                                               | both commands ran: marker = `true`                                                                                                                                                |
| what a failing `execSync` puts in `error.message`        | `execSync('sc create "rule-mcp" binPath= "C:/Program Files/x/y.js"')`                                                     | `Command failed: sc create "rule-mcp" binPath= "C:/Program Files/x/y.js" \| /bin/sh: sc: command not found \| `                                                             |
| whether `shimWorks()` executes what PATH resolves        | planted `#!/bin/sh` script at `/tmp/rule-audit-shim/rule-mcp` prepended to PATH, then `shimPath()` and `shimWorks()`       | resolved that path, returned `true`, marker created = `true`                                                                                                                      |
| what the output cap does                                 | `execSync('yes \| head -c 2000000', { stdio: "pipe" })`, then `tryExec` on the same command                                     | throws `ENOBUFS` (node default maxBuffer 1 MiB); `tryExec` returns `""`                                                                                                           |
| where the `nul` file came from and whether it is gone    | `node --test src/cli/daemon/__tests__/_windows-service-arms.test.mjs`, then `ls nul`                                            | before the fix: `-rw-r--r-- 31 nul` containing `/bin/sh: sc: command not found`; after commit `c05ad6e5`: no such file                                                            |

## Provenance of every interpolated value

| Interpolated value                                                                                                              | Built from                                                                     | Attacker- or user-controllable             |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| `WINDOWS_SERVICE_NAME`, `LAUNCH_AGENT_LABEL`, `SYSTEMD_UNIT_NAME`, `getServiceName()`                                           | module constants, `detectPlatform()` switch                                    | no                                         |
| `WRAPPER_SCRIPT_PATH`, `LAUNCH_AGENT_DIR`, `LAUNCH_AGENT_PATH`, `SYSTEMD_USER_DIR`, `SYSTEMD_UNIT_PATH`, `getServiceFilePath()` | `join(homedir(), ...)`                                                         | `$HOME`, so environment-controlled         |
| `command` (the binary line)                                                                                                     | `resolveEntrypoint()`: `process.execPath` and `fileURLToPath(import.meta.url)` | only by whoever can write the install tree |
| `name`, `command` in the PowerShell fallback                                                                                    | the two values above, inside single quotes inside a `-Command "..."` string    | same as above                              |
| the command name itself (`rule-mcp`, `sc`, `systemctl`, `launchctl`, `pnpm`, `docker`)                                    | PATH resolution, no path given                                                 | by whoever controls PATH                   |

No value in this surface comes from a request body, a repository file, an agent argument or an environment variable other
than `HOME` / `PNPM_HOME` (the latter reaches `globalBinDir()` and file writes, not a shell string).

## Files read

`src/shared/_process.js`, `src/cli/daemon/_windows-service.js`, `_launchd.js`, `_systemd.js`, `_launchd-plist.js`,
`_systemd-unit.js`, `_service-shared.js`, `_service.js`, `_service-status.js`, `src/cli/setup/_shim.js`,
`src/cli/setup/_service-status.js`, `src/cli/commands/daemon/_service.js`, `_process.js`,
`src/cli/daemon/__tests__/_windows-service-arms.test.mjs`, `_service-templates.test.mjs`, `_platform-arms.fixture.mjs`,
`src/cli/_register-server.js`.

## Sources consulted

- `https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html` (fetched 2026-09-15, systemd 261.2).
  The ExecStart= entry was located; the "Command lines" wording that states whether a shell is invoked was not inside the
  two windows read (0-6000 and 14000-21000 of 78255 chars), so nothing about systemd's own parsing is asserted in this
  document. The quoting defect the audit reports is in the string this repository generates, measured above.

## Lenses

### Input validation, size caps and ReDoS

- Size cap: `execSync` defaults to a 1 MiB `maxBuffer`; exceeding it throws `ENOBUFS`, which `tryExec` turns into `""`
  (measured above). No call site passes `maxBuffer`.
- Input validation: no value entering a command string is validated against a pattern before interpolation; the only
  shape check anywhere in the surface is `isExists` / `check.includes(...)` on command _output_.
- ReDoS: the only regular expressions applied to command output in scope are `/"PID"\s*=\s*(\d+)/`,
  `/^(\d+)\t/m`, `/MainPID=(\d+)/` and `/PID\s+:\s*(\d+)/i` (`_launchd.js:102,112`, `_systemd.js:100`,
  `_windows-service.js:119`). Each has one bounded or anchored quantifier and no nested repetition; output length is
  already capped by `maxBuffer`. No ReDoS case was constructed.

### Secrets handling and where they land on disk

- `grep -rn "token\|secret\|password\|bearer" src/cli/daemon/*.js src/cli/setup/_shim.js src/shared/_process.js` returns
  no match: no credential is interpolated into any command in this surface.
- The daemon's bearer token is written elsewhere, by `src/transport/_sse-auth.js`: `writeFileSync(temporaryFile, `${token}\n`, { mode: 0o600 })`
  with `chmodSync(..., 0o600)` and a `0o700` state directory (`_sse-auth.js:58,68,70,77`). That file is outside this scope.

### Trust boundary between repo content and agent instructions

- Repository-authored text becomes executed code at install time: `generateWrapperScript` writes a bash script (`exec`
  lines, measured above), `generateLaunchAgentPlist` writes the plist that runs it, `generateSystemdUnit` writes a unit
  with `ExecStart=`. The escape applied to those values is `escapePlist`, which handles `&`, `<` and `>` only.
- The service description strings (`sc description`, the unit `Description=`) are agent-visible copy with no instruction
  semantics; no command in this surface reads an instruction from repository content.

### What the server fetches at runtime, and what verifies it before it runs

- Every in-scope command runs a local binary: `launchctl`, `systemctl`, `sc`, `chmod`, `command -v`, `where`,
  `rule-mcp --version`. No in-scope command fetches a remote artifact, and none verifies a signature or a digest
  before running. The only verification of the `rule-mcp` name is executing it (measured above).
- Out of scope: `src/cli/setup/_docker.js:33` runs `docker compose up -d`, which pulls images named by the compose file.

### Error path that leaks more than it reports

- Measured above: `error.message` from a failing `execSync` carries the full command line and the child's stderr, and
  `installWindowsService` returns it as `error`. `_launchd.js:52` and `_systemd.js:45` return captured stdout in `error`
  as well. These strings reach the tool result the agent reads.

## Graph health (TokenSave)

`tokensave status` on branch `main` after `tokensave sync`: files 1,397, nodes 11,629, edges 7,404, DB 32.5 MB.
The numbers below come from `tokensave tool <name>` after that sync.

| Tool                            | Measured                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health`                        | quality_signal 8516; acyclicity 0.9769 (21 edges in cyclic components); depth 1 (max chain 8, ideal 11); equality 0.4701 (gini 0.5299); redundancy 0.9757 (81 dead of 3339 functions); modularity 0.9992 (1219 components); coverage_discipline 1 |
| `dsm`                           | files 1709, edges 911, density 0.0003, clusters 375, largest cluster 101                                                                                                                                                                          |
| `dependency_depth`              | max_depth 8, ideal_depth 11, depth_score 1; longest chain `src/cli/setup/_entry.js -> ... -> src/core/skills/_lru.js`                                                                                                                             |
| `gini` (complexity, file scope) | 0.6602, "extreme inequality (god files likely)" over 1698 items; outliers `skills/rule-frontend-template-engine/assets/template-engine/_filters.js` 146, `_renderer.js` 145                                                                        |
| `coupling` (fan_in)             | `src/core/skills/_lru.js` 166 dependents, `src/transport/session-registry/_registry.js` 22, `src/core/tokensave/_client.js` 18                                                                                                                    |
| `hotspots`                      | `has` in `src/core/skills/_lru.js` incoming 217; `print` in `src/cli/commands/_shared.js` 68; `callTool` in `src/core/tokensave/_client.js` 62                                                                                                    |
| `circular`                      | 6 cycles, none inside this scope (`session-registry`, `core/session/resume`, four under `skills/rule-frontend-vanilla-reactive/examples`, `cli/commands/_targets*`)                                                                                |
| `imports` (depth 1)             | 0 module cycles                                                                                                                                                                                                                                   |

## Out of scope observations

- `src/cli/setup/_docker.js:33` runs `docker compose up -d` from the setup flow; it pulls images selected by the compose file, which this run did not read.
- `src/cli/setup/_preflight.js` and `src/tools/handoff/_git.js` interpolate nothing into their commands (the git calls pass `cwd`), so they add no case to the provenance table; they were not audited further.
- `pnpm test:coverage` measured 90.97%, 90.97%, 91.03% and 90.99% branches against a floor of 91 on an unchanged tree, so the gate can flip without a code change; recorded in `docs/handoff/07` and in commit `c05ad6e5`. A test-gate matter, not a security one.

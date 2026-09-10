# Environment Variables Reference

| Variable                                      | Description                                                                                                                                                                                                                                                                                                                                                            | Default                             | Values                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `RULE_MCP_MINIMAL_TOOLS`                | Expose only the 13 dispatcher/action tools (fits client tool caps, cheaper context). Safe for untrusted code.                                                                                                                                                                                                                                                          | unset                               | `1` = enable                            |
| `RULE_MCP_NO_PROMPTS`                   | Return an empty `prompts/list` (hide the `/<server>:<prompt> (MCP)` slash commands). Set automatically in the Claude Code config, which ships clean `/rule-*` user commands instead.                                                                                                                                                                                    | `0`                                 | `1` = suppress prompts                  |
| `RULE_MCP_AUTO_ADR`                     | Write an ADR automatically after a routing, scaffold, detect or fix call. Off unless asked for: it writes files into the project as a side effect of ordinary tool use.                                                                                                                                                                                                | unset                               | `1` = enable                            |
| `RULE_MCP_DAEMON`                       | Run as daemon process (used by LaunchAgent/systemd units).                                                                                                                                                                                                                                                                                                             | unset                               | `1` = daemon mode                       |
| `RULE_MCP_SSE_TOKEN`                    | Bearer token for SSE transport authentication. Auto-generated if unset.                                                                                                                                                                                                                                                                                                | auto-generated                      | any string                              |
| `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` | Throttle between self-update checks (git fetch at most once per interval, on tool invocations).                                                                                                                                                                                                                                                                        | `60`                                | seconds; `0` = check on every tool call |
| `RULE_MCP_UPDATE_REMOTE`                | Git remote(s) this install may take code from, replacing the repository declared in `server.json`. Required for forks and sandboxes: an unrecognized remote is refused before any fetch.                                                                                                                                                                               | `server.json` `repository.url`      | comma-separated URLs or paths           |
| `RULE_MCP_UPDATE_REQUIRE_SIGNATURE`     | Require a valid signature on the upstream commit (`git verify-commit`) before merging. Off by default because most repositories do not sign.                                                                                                                                                                                                                           | unset                               | `1` = require signature                 |
| `RULE_MCP_NO_PROMPT_DIRECTIVE`          | Silence the SessionStart/UserPromptSubmit directive (rule-first, no subagents, caveman, mantra) injected by the harness hooks.                                                                                                                                                                                                                                          | unset                               | `1` = disable                           |
| `RULE_MCP_NO_RESUME_HANDON`             | Stop the verified handoff from being injected when a session is resumed: the SessionStart hook (`source: "resume"`) and the first tool call whose prompt is a bare resume request. Nothing is injected when `docs/handoff/` holds no handoff.                                                                                                                          | unset                               | `1` = disable                           |
| `RULE_MCP_NO_CAVEMAN`                   | Disable caveman compression of tool results (filler and leading articles are stripped from prose; code, JSON, URLs and headings are never touched).                                                                                                                                                                                                                    | unset                               | `1` = disable                           |
| `RULE_MCP_CAVEMAN_LEVEL`                | Compression intensity. `off` is the alias of `RULE_MCP_NO_CAVEMAN=1`; `lite` drops filler, hedging and pleasantries and keeps whole sentences; `full` adds leading articles, phrase rewrites and short synonyms; `ultra` adds the abbreviation map, conjunction stripping and arrow causality. An unknown value falls back to `full` with one warning on stderr. | `full`                              | `off`, `lite`, `full`, `ultra`          |
| `RULE_MCP_LOOSE_DEPS`                   | Drop the exact-latest dependencies policy line from the workflow reminder (projects that manage versions elsewhere).                                                                                                                                                                                                                                                   | unset                               | `1` = disable                           |
| `RULE_MCP_NO_REMINDER`                  | Suppress the workflow reminder appended to tool results.                                                                                                                                                                                                                                                                                                               | unset                               | `1` = disable                           |
| `RULE_MCP_REMINDER_EVERY`               | How often the workflow reminder is re-anchored after the opening contract: the full contract goes out on the session's first result, a one-liner every Nth result after it, and nothing in between. `1` reminds on every call (the pre-4.2 behavior), `0` sends the contract only once.                                                                                | `5`                                 | integer >= 0                            |
| `RULE_MCP_GUARDED_CHECKS`               | Run guardrail checks in a killable worker thread instead of inline. The server sets this for itself; a CLI one-shot stays inline, where spawning a thread that reloads every skill would cost more than it protects.                                                                                                                                                   | unset                               | `1` = enable                            |
| `RULE_MCP_CHECK_TIMEOUT_MS`             | Per-check budget for a guarded check before the worker is killed and the call reported as failed.                                                                                                                                                                                                                                                                      | `5000`                              | milliseconds                            |
| `RULE_MCP_TEST_SLOW_CHECK_MS`           | Test-only: busy-wait this long inside the worker before checking, so the kill path can be exercised. Never set it in a real install.                                                                                                                                                                                                                                   | unset                               | milliseconds                            |
| `RULE_MCP_NO_FINGERPRINT`               | Disable AI-fingerprint removal on tool results (em dashes and typographic characters become ASCII, British spelling becomes American; code, inline spans, URLs and JSON are never touched).                                                                                                                                                                            | unset                               | `1` = disable                           |
| `RULE_MCP_NO_TELEMETRY`                 | Disable local telemetry entirely: no events recorded, no files written. Telemetry is local-only and never sent anywhere.                                                                                                                                                                                                                                               | unset                               | `1` = disable                           |
| `RULE_MCP_NO_PROMPTS`                   | Record only the prompt length, never its text. Prompt text is recorded by default, into the home recording (`~/.rule-mcp/`), and is never sent anywhere.                                                                                                                                                                                                         | unset                               | `1` = lengths only                      |
| `RULE_MCP_NO_TOKENSAVE`                 | Disable tokensave awareness: no code-graph directive, no context suppression, no branch-staleness warning.                                                                                                                                                                                                                                                             | unset                               | `1` = disable                           |
| `RULE_MCP_NO_CACHE`                     | Disable the deterministic result cache at every tier, including a committed catalog. Every call recomputes.                                                                                                                                                                                                                                                            | unset                               | `1` = disable                           |
| `RULE_MCP_CACHE_EXACT_ONLY`             | Answer only from the exact key, never the normalized one. Reported by `cache stats`, so a low hit rate stays explainable.                                                                                                                                                                                                                                              | unset                               | `1` = exact only                        |
| `RULE_MCP_STATE_DIR`                    | Where mutable state lives: the result cache, the bm25 index, the SSE token, the daemon pid/log.                                                                                                                                                                                                                                                                        | `~/.rule-mcp/state`           | an absolute path                        |
| `RULE_MCP_HOME`                         | The whole rule-mcp home root (state, data, projects, config under it). `RULE_MCP_STATE_DIR` overrides just the state subdirectory.                                                                                                                                                                                                                         | `~/.rule-mcp`                 | an absolute path                        |
| `RULE_MCP_REPO_ROOT`                    | The repository the server reads its own skills and version from.                                                                                                                                                                                                                                                                                                       | the installed package               | an absolute path                        |
| `RULE_MCP_PORT`                         | Port for the HTTP and SSE transports.                                                                                                                                                                                                                                                                                                                                  | `37999`                             | a port number                           |
| `RULE_MCP_HOST`                         | Interface the HTTP and SSE transports bind to.                                                                                                                                                                                                                                                                                                                         | `127.0.0.1`                         | a hostname or address                   |
| `RULE_MCP_NO_AUTOUPDATE`                | Stop the throttled self-update check that runs on tool invocations.                                                                                                                                                                                                                                                                                                    | unset                               | `1` = disable                           |
| `RULE_MCP_NO_AUTORESTART`               | After a self-update changes server code, print an instruction instead of exiting for the client to respawn.                                                                                                                                                                                                                                                            | unset                               | `1` = disable                           |
| `RULE_MCP_DAEMON_AUTORESTART`           | Let a daemon exit after a self-update so its service manager restarts it. Off by default: a shared daemon dropping every client is worse than running one commit behind.                                                                                                                                                                                               | unset                               | `1` = enable                            |
| `RULE_MCP_DOCKER`                       | Marks the process as running inside the container image, which changes the paths the installer writes.                                                                                                                                                                                                                                                                 | unset                               | `1` = container                         |
| `RULE_MCP_DISABLE_AUTO_ADR`             | Never write an ADR automatically, whatever `RULE_MCP_AUTO_ADR` says. Set by `tools call` for the duration of a one-shot, so a CLI invocation does not leave a decision record behind.                                                                                                                                                                            | unset                               | `1` = never                             |
| `RULE_MCP_PROJECT_DIR`                  | An extra directory to search when resolving the project an agent integration belongs to, tried before the working directory.                                                                                                                                                                                                                                           | unset                               | an absolute path                        |
| `RULE_MCP_ROLES_DIR`                    | Where the persona catalog is read from, replacing the embedded `src/roles/`.                                                                                                                                                                                                                                                                                           | the embedded `src/roles/`           | an absolute path                        |
| `RULE_MCP_ROLES_OVERLAY_DIR`            | Where a user's own role overlays are read from. Overlays are user configuration, so they default under the config home; this moves them for a container or a test.                                                                                                                                                                                                     | `<home>/config/roles`               | an absolute path                        |
| `RULE_MCP_SUPPRESS_MIN_LINES`           | How many lines a tool result must reach before the token pipeline suppresses or truncates it.                                                                                                                                                                                                                                                                          | `40` to suppress, `120` to truncate | integer                                 |

## Configuration

Set these variables via:

```bash
# CLI (persisted to ~/.config/rule-mcp/env.json)
rule config env --set RULE_MCP_MINIMAL_TOOLS=1

# Interactive mode
rule config env

# Environment (overrides persisted config)
export RULE_MCP_MINIMAL_TOOLS=1
```

## Persistence

Variables set via `rule config env` are saved to `~/.config/rule-mcp/env.json`
and automatically injected into the MCP stdio configuration on install/update.

Environment variables set in your shell profile override the persisted config.

## Minimal tool surface

Set `RULE_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 13 dispatcher/action tools:
`rule`, `rule_tool_update`, `rule_tool_gateway`, `rule_tool_apply`, `rule_tool_search`, `rule_tool_compress`, `rule_tool_check`, `rule_tool_a11y_report`, `rule_tool_stats`, `rule_tool_scaffold`, `rule_tool_detect`, `rule_tool_process_handoff`, `rule_tool_component`.

## Telemetry

Local, on by default, and never sent anywhere. Disable with
`RULE_MCP_NO_TELEMETRY=1`.

Telemetry belongs to a project, not to a machine: a cache hit rate averaged
over every repository on a disk answers nothing.

| What                               | Where                                                        |
| ---------------------------------- | ------------------------------------------------------------ |
| Raw events, 7-day retention        | `~/.rule-mcp/projects/<project>/telemetry.jsonl`       |
| Daily aggregates                   | `~/.rule-mcp/projects/<project>/telemetry-rollup.json` |
| Usage an agent declared for itself | `~/.rule-mcp/projects/<project>/usage.json`            |
| Id of the current recording window | `~/.rule-mcp/projects/<project>/project-id`            |
| Exported flights                   | `~/.rule-mcp/projects/<project>/exports/*.flight`      |
| Random installation id             | `<stateDir>/installation-id`                                 |

`rule-mcp telemetry export` writes one `.flight` holding the timeline,
the KPI block, the model's own usage and a snapshot of the project, then empties
the log: the file is the archive, not a copy of it. `--keep` leaves the log in
place. `rule-mcp telemetry show <file>` reports an export as tables, and
`rule_tool_stats` does the same with a `flight` argument.

The model's tokens and cost are read from the coding agent's own transcript -
pi, Claude Code, Codex and opencode are supported. An agent whose usage is not
on disk in a parseable form can declare it with `rule_tool_usage`; a transcript
always wins over a declaration, and a declaration is labeled as one.

Nothing is written into the project: a recording is filed per project under the
home directory, so a checkout has nothing to ignore (ADR 082).
`rule-mcp init` sets that up, and installs git hooks so a clone or a
checkout re-asserts the rule.

Recorded per tool call: tool name, duration, outcome, cache hit, routed skill,
guardrail failure count, and tokens saved per source.

**Never recorded:** prompt text. Only its length. Remote sending is implemented
behind an interface and switched off in code, not by an environment variable,
because enabling it is a decision with a legal basis attached.

Read it with `rule-mcp stats` or the `rule_tool_stats` tool. Export a
session for the AI Flight Recorder DevTools timeline with
`rule-mcp telemetry export`. Roll up and prune with
`rule-mcp telemetry prune`.

## Target-only additions

- `RULE_MCP_SKILL_UNIVERSE=base`: route on the source-commensurate skill set for the routing-corpus measurement (see src/tools/router.js TARGET_ONLY_SKILLS).

## Node variables this server sets or honors

stdio starts the server as a subprocess per client, so module compilation is
paid on every connect. `bin/rule-mcp.js` calls
`module.enableCompileCache()` before it loads the application graph, and the
installer writes a cache directory into the generated agent config.

| Variable                     | Description                                                                                                                              | Default                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `NODE_COMPILE_CACHE`         | Directory for the compiled code cache. The installer sets it for every agent spawn; unset, Node picks its own location.                  | `~/.cache/rule-mcp/compile-cache` |
| `NODE_DISABLE_COMPILE_CACHE` | `1` turns the cache off, including the one the bin enables. The test runner sets it so no suite result depends on a cache another wrote. | unset                                   |

Measured with `pnpm report:startup`: the cache takes 2-6% off a warm start.
The larger win came from what the entry point no longer loads - `--help` went
from 216 ms to 48 ms once the command handlers moved behind their actions.

<!-- census:begin:env-registry -->

## Where each variable is read

Generated from `src/` and `bin/`: the modules that name the variable, so a
knob documented above can be traced to the code that answers it.

| Variable                                      | Read in                                                                                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RULE_MCP_AUTO_ADR`                     | `src/cli/commands/_configure.js`, `src/tools/adr/_auto-log.js`                                                                                                                                                                    |
| `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` | `src/core/self-update/_config.js`                                                                                                                                                                                                 |
| `RULE_MCP_CACHE_EXACT_ONLY`             | `src/cli/cache/_stats.js`, `src/core/cache/tool-cache/_config.js`                                                                                                                                                                 |
| `RULE_MCP_CAVEMAN_LEVEL`                | `src/core/text/_caveman.js`, `src/core/text/_level.js`, `src/core/text/_surfaces.js`                                                                                                                                              |
| `RULE_MCP_CHECK_TIMEOUT_MS`             | `src/core/guardrails/guarded/_policy.js`                                                                                                                                                                                          |
| `RULE_MCP_DAEMON`                       | `src/cli/commands/_configure.js`, `src/cli/daemon/_launchd-plist.js`, `src/cli/daemon/_process.js`, `src/cli/daemon/_service-shared.js`, `src/cli/daemon/_systemd-unit.js`, `src/core/self-update/_schedule.js`                   |
| `RULE_MCP_DAEMON_AUTORESTART`           | `src/core/self-update/_schedule.js`                                                                                                                                                                                               |
| `RULE_MCP_DISABLE_AUTO_ADR`             | `src/cli/commands/_configure.js`, `src/cli/commands/_tools.js`, `src/tools/adr/_auto-log.js`                                                                                                                                      |
| `RULE_MCP_DOCKER`                       | `src/cli/paths/_repo.js`                                                                                                                                                                                                          |
| `RULE_MCP_GUARDED_CHECKS`               | `src/core/guardrails/guarded/_policy.js`                                                                                                                                                                                          |
| `RULE_MCP_HOME`                         | `src/cli/paths/_runtime.js`                                                                                                                                                                                                       |
| `RULE_MCP_HOST`                         | `src/cli/paths/_runtime.js`, `src/transport/http/index.js`                                                                                                                                                                        |
| `RULE_MCP_LOOSE_DEPS`                   | `src/core/_directive.js`                                                                                                                                                                                                          |
| `RULE_MCP_MINIMAL_TOOLS`                | `src/cli/commands/_configure.js`, `src/core/skills/_minimal.js`                                                                                                                                                                   |
| `RULE_MCP_NO_AUTORESTART`               | `src/cli/installers/_env.js`, `src/core/self-update/_schedule.js`                                                                                                                                                                 |
| `RULE_MCP_NO_AUTOUPDATE`                | `src/cli/installers/_env.js`, `src/core/self-update/_config.js`, `src/tools/_update.js`                                                                                                                                           |
| `RULE_MCP_NO_CACHE`                     | `src/cli/cache/_helpers.js`, `src/cli/cache/_stats.js`, `src/cli/installers/_env.js`, `src/core/bm25/_cache-signature.js`, `src/core/cache/tool-cache/_config.js`                                                                 |
| `RULE_MCP_NO_CAVEMAN`                   | `src/cli/installers/_env.js`, `src/core/text/_caveman.js`, `src/core/text/_level.js`, `src/core/text/_surfaces.js`                                                                                                                |
| `RULE_MCP_NO_FINGERPRINT`               | `src/core/text/fingerprint/_scan.js`                                                                                                                                                                                              |
| `RULE_MCP_NO_PROMPT_DIRECTIVE`          | `src/core/_directive.js`                                                                                                                                                                                                          |
| `RULE_MCP_NO_PROMPTS`                   | `src/cli/installers/_agents-cli.js`, `src/core/agents/command-targets/index.js`, `src/core/agents/commands/index.js`, `src/core/telemetry/recorder/_flags.js`, `src/core/telemetry/recorder/index.js`, `src/prompts/_registry.js` |
| `RULE_MCP_NO_REMINDER`                  | `src/cli/installers/_env.js`, `src/core/enforcement/_reminder.js`, `src/core/text/_surfaces.js`                                                                                                                                   |
| `RULE_MCP_NO_RESUME_HANDON`             | `src/core/session/resume/_context.js`, `src/core/session/resume/index.js`, `src/core/text/_surfaces.js`                                                                                                                           |
| `RULE_MCP_NO_TELEMETRY`                 | `src/cli/_register-info.js`, `src/core/telemetry/recorder/_flags.js`, `src/core/telemetry/recorder/index.js`, `src/tools/_stats.js`, `src/tools/_usage.js`                                                                        |
| `RULE_MCP_NO_TOKENSAVE`                 | `src/cli/installers/_env.js`, `src/core/agents/_integrations.js`, `src/core/agents/_token-pipeline.js`                                                                                                                            |
| `RULE_MCP_PORT`                         | `src/cli/commands/_help.js`, `src/cli/paths/_runtime.js`, `src/transport/http/_start.js`, `src/transport/sse/_start.js`                                                                                                           |
| `RULE_MCP_PROJECT_DIR`                  | `src/core/agents/_integrations.js`                                                                                                                                                                                                |
| `RULE_MCP_REMINDER_EVERY`               | `src/core/enforcement/_reminder.js`                                                                                                                                                                                               |
| `RULE_MCP_REPO_ROOT`                    | `src/cli/paths/_repo.js`                                                                                                                                                                                                          |
| `RULE_MCP_ROLES_DIR`                    | `src/core/review/roles/_catalog.js`                                                                                                                                                                                               |
| `RULE_MCP_ROLES_OVERLAY_DIR`            | `src/core/review/_overlays.js`                                                                                                                                                                                                    |
| `RULE_MCP_SKILL_UNIVERSE`               | `src/tools/router/_skills.js`                                                                                                                                                                                                     |
| `RULE_MCP_SKIP_GLOBAL_LINK`             | `src/cli/setup/_shim-apply.js`, `src/cli/setup/_shim.js`                                                                                                                                                                          |
| `RULE_MCP_SSE_TOKEN`                    | `src/cli/setup/_docker.js`, `src/transport/_sse-auth.js`                                                                                                                                                                          |
| `RULE_MCP_STATE_DIR`                    | `src/cli/paths/_project.js`, `src/cli/paths/_runtime.js`                                                                                                                                                                          |
| `RULE_MCP_SUPPRESS_MIN_LINES`           | `src/core/agents/_token-pipeline.js`                                                                                                                                                                                              |
| `RULE_MCP_TEST_SLOW_CHECK_MS`           | `src/core/guardrails/guarded/_thread.js`                                                                                                                                                                                          |
| `RULE_MCP_UPDATE_REMOTE`                | `src/core/self-update/_banner.js`, `src/core/self-update/_config.js`, `src/tools/_update.js`                                                                                                                                      |
| `RULE_MCP_UPDATE_REQUIRE_SIGNATURE`     | `src/core/self-update/_banner.js`, `src/core/self-update/_run.js`, `src/tools/_update.js`                                                                                                                                         |

39 read by the code, 38 documented in the table above.

Read but undocumented: `RULE_MCP_SKIP_GLOBAL_LINK`.

Nothing documented goes unread.

Regenerate with `pnpm census`.

<!-- census:end:env-registry -->

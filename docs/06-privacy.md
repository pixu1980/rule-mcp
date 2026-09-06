# Privacy: what is recorded, where it lives, and how to erase it

- **Applies to**: rule-mcp, every transport (stdio, SSE, HTTP, daemon, Docker)
- **Last reviewed**: 2026-09-06
- **Related**: ADR 020 (persistent local bearer token), ADR 035 (SSE bearer auth),
  ADR 041 (per-invocation self-update with throttle, fire-and-forget), ADR 052
  (token-efficiency pipeline), `docs/01-product-architecture.md`,
  `docs/03-engineering-guides.md`
- **Enforced by**: `test/self-guardrails.test.mjs`, `test/flight-redact.test.mjs`,
  `test/flight-exports-retention.test.mjs`, `test/uninstall-purge-home.test.mjs`

## The short version

Everything this server records stays on the machine that runs it. There is no
remote telemetry channel: the transport module exists but is **off by a code
constant** (`REMOTE_ENABLED = false` in `src/core/telemetry-transport.js`), not
by a setting — turning it on is a reviewed code change, not an environment
variable somebody exports. Nothing is sent anywhere unless you export a file
and send it yourself, and the redacted export exists so that sharing one does
not mean sharing your prompts.

## What is recorded

All paths resolve under the runtime home `~/.rule-mcp/`
(`RULE_MCP_HOME` relocates the whole root; `RULE_MCP_STATE_DIR`
relocates mutable state). One per-project directory is recorded for the current
project (`<slug>` below).

| Data category                                                                       | Where                                                     | Retention                                      | Kill switch                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Tool call metadata (tool name, timestamps, latency, byte/token counts, error flags) | `~/.rule-mcp/projects/<slug>/telemetry.jsonl`       | 7 days raw, then rolled up to daily aggregates | `RULE_MCP_NO_TELEMETRY=1`             |
| Prompt text, verbatim (only while `prompts` are enabled)                            | same file, `prompt` field                                 | same 7 days                                    | `RULE_MCP_NO_PROMPTS=1`               |
| File paths passed to tools                                                          | same file, `path` field (clear text locally)              | same 7 days                                    | `RULE_MCP_NO_TELEMETRY=1`             |
| Daily rollups (counts only)                                                         | `~/.rule-mcp/projects/<slug>/telemetry-rollup.json` | kept until deleted                             | `RULE_MCP_NO_TELEMETRY=1`             |
| Per-project id                                                                      | `~/.rule-mcp/projects/<slug>/project-id`            | kept until deleted                             | `RULE_MCP_NO_TELEMETRY=1`             |
| Agent-declared usage (sidecar)                                                      | `~/.rule-mcp/projects/<slug>/usage.json`            | kept until deleted                             | don't write it (sidecar opt-in)             |
| Exported recordings                                                                 | `~/.rule-mcp/projects/<slug>/exports/*.flight`      | newest 10, or everything within 90 days        | do not export                               |
| Bearer token for SSE/HTTP                                                           | `~/.rule-mcp/state/sse-token` (mode 0600, dir 0700) | until deleted                                  | n/a - required for authenticated transports |
| Failed-auth audit lines                                                             | stderr of the server process                              | wherever your process manager keeps stderr     | n/a - security logging                      |

A recording never enters a repository: it is written under the runtime home,
filed per project (ADR 082), so there is nothing in a checkout to ignore and
nothing to commit by accident. The raw log also has a hard size cap
(`MAX_EVENTS_BYTES`, 8 MiB) beneath the retention window, so a machine that
never rolls up does not fill up.

## Sharing a recording

The flight recorder exports a complete `.flight` (the AI Flight Recorder
timeline plus `kpi`, `usage`, `project` and `prompts` blocks): it is your
recording of your machine, and completeness is what makes it useful.

The redacted variant (`redactFlight` in `src/core/telemetry-flight.js`) is the
share-safe one:

- `prompts[].text` removed (lengths and repeat flags stay - they are the
  metric)
- `project.dir` reduced to its basename
- every `path` field replaced by a truncated SHA-256 hash
- the file is named `*.redacted.flight` and any renderer shows a banner

The KPI block is byte-identical between the two, so a redacted flight is still
comparable with a full one.

## GDPR notes

A prompt can be personal data - it may name people, and in a work context it is
frequently the employer's problem statement rather than the user's own words.
File paths carry a username and the layout of a disk. Both are therefore
treated as personal data here even though this server never transmits them:

- **Lawful basis**: not applicable to a remote controller - processing is local
  to the user's machine and under the user's control.
- **Minimization**: raw events expire after 7 days; the raw log is size-capped;
  exports have a retention cap; the redacted variant exists so the useful part
  can be shared without the identifying part.
- **Erasure**: delete `~/.rule-mcp/projects/<slug>/` for one project and
  `~/.rule-mcp/state` for machine-level state. `rule-mcp uninstall`
  (and `scripts/uninstall.sh`) removes the whole runtime home; `--keep-config`
  preserves the configuration directories.
- **Access/portability**: the format is JSON on your disk. `rule-mcp
stats` renders the local aggregate; any text editor reads the raw files.

## EU AI Act positioning

This server is a developer tool: it routes prompts to documentation, runs
deterministic guardrail checks, and records how much that cost. It performs no
profiling and no automated decision-making about people, and no biometric or
emotion inference. Its logs describe tool calls, not users. The remote
telemetry path is disabled in code, so no data leaves the machine for any
provider to process.

## Turning it all off

```sh
RULE_MCP_NO_TELEMETRY=1   # record nothing at all
RULE_MCP_NO_PROMPTS=1     # record metrics, never prompt text
```

Both are read at call time, so setting either in the MCP client configuration
takes effect on the next session with no reinstall.

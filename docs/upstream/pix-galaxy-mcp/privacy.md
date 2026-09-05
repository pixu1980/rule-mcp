# Privacy: what is recorded, where it lives, and how to erase it

- **Applies to**: rule-mcp, every transport (stdio, SSE, HTTP, daemon, Docker)
- **Last reviewed**: 2026-09-04
- **Related**: ADR 046 (local telemetry), ADR 069 (flight recorder v2), ADR 071 (notify-only updates), `docs/security/threat-model.md`

## The short version

Everything this server records stays on the machine that runs it. There is no
remote telemetry channel: the transport module exists but is disabled by a code
constant, not a setting. Nothing is sent anywhere unless you export a file and
send it yourself, and `--redact` exists so that sharing one does not mean
sharing your prompts.

## What is recorded

| Data category                                                                           | Where                                                | Retention                                      | Kill switch                                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Tool call metadata (tool name, timestamps, latency, byte and token counts, error flags) | `~/.rule-mcp/projects/<project>/events.jsonl` in the project      | 7 days raw, then rolled up to daily aggregates | `RULE_MCP_NO_TELEMETRY=1`             |
| Prompt text, verbatim                                                                   | same file, `prompt` field                            | same 7 days                                    | `RULE_MCP_NO_PROMPTS=1`               |
| File paths passed to tools                                                              | same file, `path` field (clear text locally)         | same 7 days                                    | `RULE_MCP_NO_TELEMETRY=1`             |
| Daily rollups (counts only)                                                             | `~/.rule-mcp/projects/<project>/rollups.json`                     | kept until deleted                             | `RULE_MCP_NO_TELEMETRY=1`             |
| Exported recordings                                                                     | `~/.rule-mcp/projects/<project>/exports/*.flight`                 | newest 10 or 90 days, whichever is larger      | do not run `telemetry export`               |
| Agent token usage                                                                       | read at export time from the agent's own transcripts | not copied - read, summarized, discarded       | `RULE_MCP_NO_TELEMETRY=1`             |
| Bearer token for SSE/HTTP                                                               | `~/.rule-mcp/state/sse-token` (mode 0600)      | until deleted                                  | n/a - required for authenticated transports |
| Failed-auth audit lines                                                                 | stderr of the server process                         | wherever your process manager keeps stderr     | n/a - security logging                      |

A recording never enters a repository: it is written under the home directory, filed per
project, so there is nothing in a checkout to ignore and nothing to commit by accident (ADR 082).
committed by accident.

## Sharing a recording

`rule-mcp telemetry export` writes a complete `.flight`: it is your
recording of your machine, and completeness is what makes it useful.

`rule-mcp telemetry export --redact` writes the share-safe variant:

- `prompts[].text` removed (lengths and repeat flags stay - they are the metric)
- `project.dir` reduced to its basename
- every `path` field replaced by a truncated SHA-256 hash
- the file is named `*.redacted.flight` and the renderer prints a banner

The KPI block is byte-identical between the two, so a redacted flight is still
comparable with a full one.

## GDPR notes

A prompt can be personal data - it may name people, and in a work context it is
frequently the employer's problem statement rather than the user's own words.
File paths carry a username and the layout of a disk. Both are therefore
treated as personal data here even though this server never transmits them:

- **Lawful basis**: not applicable to a remote controller - processing is local
  to the user's machine and under the user's control.
- **Minimization**: raw events expire after 7 days; exports have a cap; the
  redacted variant exists so that the useful part can be shared without the
  identifying part.
- **Erasure**: delete `~/.rule-mcp/projects/<project>/` for one project and
  `~/.rule-mcp/state` for machine-level state. `rule-mcp uninstall`
  removes both, along with the installed rules blocks and git hooks.
- **Access/portability**: the format is JSON on your disk. `telemetry show
<file>` renders it; any text editor reads it.

## EU AI Act positioning

This server is a developer tool: it routes prompts to documentation, runs
deterministic guardrail checks, and records how much that cost. It performs no
profiling, no automated decision-making about people, and no biometric or
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

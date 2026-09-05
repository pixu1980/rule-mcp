# Threat model

- **Last reviewed**: 2026-09-04
- **Method**: STRIDE-lite per trust boundary, evidence-first (every mitigation below points at code or a test that exists)
- **Related**: `docs/privacy.md`, `SECURITY.md`, ADR 032 (allowed update remotes), ADR 071 (notify-only updates)

## What this server is

A local MCP server that serves skill documentation, routes prompts to the right
skill, runs deterministic guardrail checks on code, and records what that cost.
It runs as the user, on the user's machine, with the user's filesystem access.
It is not a multi-tenant service and is not designed to be one.

## Trust boundaries

```
client (agent) ──1──> server ──2──> project repository
                        │
                        ├──3──> agent transcripts (read)
                        ├──4──> upstream git remote
                        └──5──> npm registry (install time)
```

### 1. Client to server

**Trusted?** Partially. On stdio the client is the process that spawned the
server, so it is the user. On SSE/HTTP anything that can reach the port and
present the bearer token is a client.

| Threat                                                  | Mitigation                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing (unauthenticated client)                       | Bearer token on every endpoint except `/health`, compared with `timingSafeEqual`; token is 32 random bytes stored 0600                      |
| Elevation via brute force                               | Failed auth is rate-limited per remote address with a 429 after the budget (`src/transport/auth-rate-limit.js`)                             |
| Information disclosure to a browser page                | Loopback binding by default, allowlisted origins, cross-origin denial on protected endpoints (DNS-rebinding defense)                        |
| Denial of service via a hostile `pix_check` payload | 256 KiB input cap, linear-verified guardrail patterns (corpus test with a time budget), and checks run in a killable worker on server paths |
| Repudiation                                             | Every auth failure emits one structured stderr line with transport, remote and path                                                         |

**Accepted risk**: a local process running as the same user can read the token
file. Defending against code already running as you is out of scope for a
developer tool.

### 2. Server to project repository

**Trusted?** No. Repository content is data written by whoever wrote the repo,
which is not necessarily the user (a cloned or forked project is untrusted
input).

| Threat                                                                                                                               | Mitigation                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tampering with generated output                                                                                                      | Guardrail checks are deterministic and run on the content, never eval it                                                                               |
| Goal hijack via directive-shaped repo content (tokensave directives, handoff files, branch names reaching the agent as instructions) | **Open** - hardening step 4.4 fences repo-sourced text as data-not-instructions. Until then this is a known gap, listed here rather than left implicit |
| Information disclosure via committed recordings                                                                                      | `./.rule-mcp/` is kept gitignored by `init` and by the installed git hooks                                                                       |
| Command injection through paths in generated hooks                                                                                   | Hook paths are single-quote escaped for POSIX sh (`shQuote`), never JSON-quoted                                                                        |

### 3. Server to agent transcripts

**Trusted?** Read-only, and only for numbers.

| Threat                                                     | Mitigation                                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Information disclosure (transcripts contain conversations) | Transcripts are parsed for token counts and model names only; no transcript text is copied into a flight |
| Tampering (a forged transcript inflates savings)           | Only affects the user's own metrics on the user's own machine; no decision depends on it                 |

### 4. Server to upstream git remote

**Trusted?** Only the allowlisted remote, and only when the user asks.

| Threat                                                      | Mitigation                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Remote code execution via a compromised upstream (rug pull) | Updates are notify-only by default (ADR 071): the merge happens on explicit `pix_update` / CLI, not on a timer |
| Redirected upstream (`.git/config` rewritten)               | The remote must match the allowlist before any fetch; a refusal is announced, never silent (ADR 032)               |
| Tampering with history                                      | `git merge --ff-only`, never a rebase or reset; dirty trees are skipped                                            |
| Unsigned code                                               | `RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1` requires a valid signature on the upstream commit                      |

### 5. Server to npm registry

**Trusted?** No - this is the boundary the 2025-26 worms crossed.

| Threat                                             | Mitigation                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Malicious `postinstall` in a transitive dependency | pnpm lifecycle scripts are blocked; the `allowBuilds` allowlist is explicitly empty                   |
| Vulnerable transitive dependency                   | `pnpm audit --prod` is a blocking step in `pnpm run ci`; overrides pin patched versions exactly       |
| Install-time tampering with the bootstrap script   | **Partial** - hardening step 3.3 adds a published checksum for `install.sh`                           |
| Version drift                                      | Exact pins at the latest release, enforced by policy and the `pkg-exact-versions` guardrail (ADR 070) |

## Accepted risks

- **A local process running as the user** can read the state directory, the
  token and the recordings. Out of scope.
- **`pix_usage`** is a client-declared number and is trusted as such; the
  transcript reading is what the KPIs actually rely on, and it wins whenever
  both exist.
- **Loopback SSE without TLS**: traffic never leaves the machine. TLS is
  available (`serve --transport sse` with certs) for anyone who binds wider.
- **OAuth2/PKCE on HTTP**: only relevant for a multi-user deployment, which
  this is not. Revisit if one is requested.

## Open items

| Item                                         | Owner         | Where                                                   |
| -------------------------------------------- | ------------- | ------------------------------------------------------- |
| Repo content fenced as data-not-instructions | hardening 4.4 | `src/core/agent-integrations.js`, `src/tools/handon.js` |
| Published checksum for `install.sh`          | hardening 3.3 | `scripts/install.sh`, README                            |
| npm provenance and signed release tags       | hardening 3.2 | `package.json`, release pipeline                        |

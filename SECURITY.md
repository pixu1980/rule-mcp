# Security

This server is deterministic: it never calls an LLM, never opens outbound
connections during a normal call, and every tool output is a pure function of
its inputs. That is the security posture the whole design leans on.

## Hardening (implemented, test-enforced)

- **No-network answers** - every tool result is cached and replayable; a tool
  that needs the network to answer is run deliberately by an operator.
- **Untrusted input** - prompts and generated code are fenced
  (`src/core/untrusted.js`), with a 256 KiB input cap before any pattern
  matching runs (`MAX_CHECK_INPUT_BYTES`).
- **ReDoS resistance** - guardrail regexes are run on the only thread, so an
  adversarial input is refused by the size gate before it can backtrack
  (`test/guardrails-redos-corpus.test.mjs`).
- **Guardrails in a worker** - check runs with a timeout fence
  (`guardrails-guarded`), so a pathological rule cannot hang the server.
- **Auth-gated transports** - HTTP/SSE entry points require a bearer token
  (`transport/sse-auth.js`), with rate limiting on auth failures and a
  loopback exemption for local clients.
- **Supply chain** - the lockfile is linted (every resolution carries an
  integrity hash), `save-exact=true`, `pkg-exact-versions` and
  `pkg-no-corepack` are enforced, and the installers publish checksums
  (`scripts/SHA256SUMS`) that CI verifies before release.
- **Filesystem discipline** - daemon, installer and cache writes go through
  atomic-write helpers with backups; the server never writes outside its state
  dir without an explicit tool call.

## Upstream threat model

The current security posture is documented in this file and enforced by the
hardening suites (`test/guardrails-*`, `test/apply-containment.test.mjs`,
`test/gateway-receipt-paths.test.mjs`, `test/auth-rate-limit.test.mjs`,
`test/self-update-remote-pin.test.mjs`, `test/docker-hardening.test.mjs`).
Decisions about the trust boundaries (write containment, receipts, SSE auth,
self-update remote pinning, container non-root) are recorded in the
[ADR index](docs/adr/ADR.md).

## Reporting

Open an issue with the reproducer. The parity fixture and the hardening suites
(`test/guardrails-*`, `test/stdin-guard*`, `test/stdio-guard.test.mjs`) are the
first place a regression shows up.

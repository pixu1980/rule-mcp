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
  (`src/core/guardrails/__tests__/_guardrails-redos-corpus.test.mjs`).
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
hardening suites (`src/core/guardrails/__tests__/_guardrails-*.test.mjs`,
`src/tools/apply/__tests__/_containment.test.mjs`,
`src/tools/gateway/__tests__/_receipt-paths.test.mjs`,
`src/transport/__tests__/_auth-rate-limit.test.mjs`,
`src/core/self-update/__tests__/_unit.test.mjs` (remote-pin coverage),
`src/transport/__tests__/_docker-hardening.test.mjs`).
Decisions about the trust boundaries (write containment, receipts, SSE auth,
self-update remote pinning, container non-root) are recorded in the
[ADR index](docs/adr/ADR.md).

## Reporting

**Do not open a public issue for a suspected vulnerability.** A public
report publishes the vulnerability before a fix exists.

Report privately through the GitHub advisory form:

https://github.com/pixu1980/rule-mcp/security/advisories/new

What happens next:

- **Acknowledgment** within 3 business days.
- **Triage** within 7 days: confirmed, needs-more-info, or declined
  with reasons.
- **Coordinated disclosure** with a 90-day default embargo: we ship the
  fix, you hold publication until the fix is released or 90 days pass,
  whichever comes first. A shorter or longer window can be agreed for
  severe issues.
- **CVE**: if the issue qualifies, we request a CVE ID through the
  GitHub advisory flow and credit the reporter, or keep them anonymous
  on request.

Public issues are for non-sensitive reports only: false positives in the
hardening suites, hardening ideas, or questions about this policy. The
parity fixture and the hardening suites (`src/core/guardrails/__tests__/_guardrails-*.test.mjs`,
`src/transport/__tests__/_stdio-guard.test.mjs`) are the first place a
regression shows up.

### Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

Only the latest minor line receives security fixes. If you are pinned
older, upgrade first and say which version you reproduced on.

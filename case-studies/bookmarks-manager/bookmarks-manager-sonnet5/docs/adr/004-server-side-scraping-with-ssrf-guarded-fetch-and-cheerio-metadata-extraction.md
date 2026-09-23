# 004: Server-side scraping with SSRF-guarded fetch and cheerio metadata extraction

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: security, backend, ssrf, scraping
- **Author**: rule-architect

## Context

Pasting an arbitrary URL and fetching its Open Graph metadata, favicon and a text preview requires the backend to make outbound HTTP requests to attacker-influenced destinations. This is a classic SSRF vector: without guarding, a user could point the server at `http://169.254.169.254/`, internal services, or `localhost` ports.

## Decision

Every scrape request passes through `assertSafeUrl()` before the fetch: only `http`/`https` schemes are accepted, `localhost`/`*.localhost` is rejected outright, and the hostname is resolved via `dns.lookup` with `ipaddr.js` used to reject any resolved address whose `range()` is not `"unicast"` (blocks private, loopback, link-local, multicast, CGNAT, etc.). Resolution happens immediately before the fetch (not only at input-validation time) to reduce the DNS-rebinding window. The fetch itself is bounded by an `AbortController` timeout, a `content-length`/streamed byte cap, and a `content-type` allowlist (HTML only). HTML parsing uses `cheerio` reading Open Graph tags first, falling back to `<title>`/meta description/favicon link discovery.

## Consequences

Positive: blocks the most common SSRF payloads and unbounded/slow responses without an allowlist of domains (keeps the feature general-purpose). Negative: DNS-rebinding between the `assertSafeUrl` check and the actual `fetch()` call is only narrowed, not eliminated (would require pinning the resolved IP into the fetch's socket options, not exposed by the global `fetch` API) — flagged as a follow-up if this moves past POC. IPv6 and exotic address encodings are covered by `ipaddr.js`'s range classification but should be re-audited if the allowed protocol surface grows.

## Alternatives Considered

1. No SSRF guard, backend fetch as-is (rejected: unacceptable security risk per rule-backend-security)
1. Public-domain allowlist (rejected: defeats the 'paste any link' product requirement)
1. Outsource scraping to a third-party API (rejected: adds an external dependency/cost not needed for a POC and loses control over the SSRF story)

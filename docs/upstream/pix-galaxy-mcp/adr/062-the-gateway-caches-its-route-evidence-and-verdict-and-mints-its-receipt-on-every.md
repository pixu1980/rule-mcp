# 062: The gateway caches its route, evidence and verdict, and mints its receipt on every call

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: cache, gateway, security, measurement, tokens
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

R5's remaining half, after ADR 056 rejected the similarity tier. The deterministic cache plan describes `pix_gateway` as four things in one answer: routing, skill evidence, a guardrail verdict and a receipt. The first three are a pure function of the arguments. The fourth is time-bound, content-bound authorization, and it is why the whole tool sits on the never-cache list.

The plan's premise was that the split reuses "the expensive part". That was measured before anything was built, because P7 is the standing reminder of what happens otherwise, and the premise turned out to be mostly wrong. The gateway is composed of two `callTool` invocations, and `callTool` already consults the cache: on a warm repeat the route call reports tier `exact` and the evidence call reports tier `exact`, so the expensive work was already being reused. A warm gateway call cost 1.58 ms in total, against 33 ms cold, of which the once-per-process BM25 index build is most.

So the honest size of the prize was the two cached round trips with their decoration and telemetry, plus the markdown assembly: roughly a millisecond. The measurement was put to the user with the recommendation to close R5 unbuilt, as ADR 056 closed L2. The user chose to build it.

## Decision

`pix_gateway` stays on `NON_CACHEABLE` and always runs. Underneath it, the deterministic half is computed once and stored under its own name, `pix_gateway_core`.

`computeGatewayCore` returns the route, the domain override, the truncated evidence, the guardrail verdict and the next-tools list, and it reads no clock and holds no token. `gatewayCoreArguments` builds its key material: prompt, code, files, path, framework, all of which change one of those outputs. Dependencies come from `dependenciesOf("rule", …)`, so a skill edit invalidates the cores that routed to it, per ADR 054.

`renderGateway` assembles the answer from a core plus the things that are true only now: the tokensave directive, because whether a code graph is stale is a fact about this moment, and the receipt, which is minted from the arguments of this call and the clock as it reads on this call. The mint runs on hits and misses alike, on the same branch of the same function.

The receipt test came first and was the gate. `test/gateway-cache-receipt.test.mjs` asserts, over a mocked clock: a replayed core still issues a receipt; the second receipt is still valid past the point where the first has expired, which is only possible if its expiry was measured from the call that minted it; a receipt from a replayed core refuses tampered content and refuses another destination; the stored core contains no receipt field, nothing shaped like a token and no receipt line; a poisoned core reaches the output, which is how the test proves the cache is consulted at all; and a hit renders the same prose and the same JSON as a miss once the token is masked.

Measured on the same fixture, same process shape: a warm gateway call goes from 1.58 ms to 0.84 ms, a 47% cut. Cold is unchanged at roughly 33 ms, as expected, since nothing about the split touches the index build.

## Alternatives considered

- **Close R5 unbuilt, as ADR 056 closed L2.** The measured ceiling was about a millisecond per warm call, against the one change in the plan that carries a security surface. Put to the user as the recommendation; they chose to build it.
- **Cache the whole gateway result and rewrite the token in the stored text on replay.** Rejected: the receipt is embedded in prose, and a regular expression over an authorization string is the wrong place to be clever.
- **Move the receipt out of the prose into `_meta` so the text became cacheable.** Rejected as a larger, caller-visible change than the one the plan called for.

## Consequences

The split's saving is real but small, and its shape is now on record: the routing and the evidence were never the cost, because they were already cached one level down. Anyone reading the plan's "the expensive part gets reused" should read this alongside it.

A core entry records `path` when one was passed, which is an absolute local path. That is fine for local state and is exactly what R7's catalog must not export: invariant 4 of the cache plan says the catalog carries no absolute paths. R7 has to filter the core entries or omit them.

`test/gateway-cache-receipt.test.mjs` runs in both `ci` and `test:all`. It is the file that decides whether a future change to the gateway may keep the split: if a receipt ever survives a replay, it fails.

The handler is now three named pieces rather than one 150-line closure, which is the incidental benefit. `renderGateway` is the only place that formats the answer, so a hit and a miss cannot drift apart by someone editing one of them.

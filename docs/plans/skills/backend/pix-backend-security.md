# rule-backend-security - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#72`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf and the area's security owner. **425 lines**, one file, no
`guardrails/`. It inherits the router's six rules through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Shape: `# Security Basics`, then eight numbered hardening steps - environment
files, container hardening, dependency hygiene, HTTP security headers, rate
limiting, CORS, pipeline secrets, input validation - then "where each item
applies", then five named attacker assumptions with the correction for each.

That last part is the best writing in the backend area:

```
- A correct password proves the right person is present
- Rate limiting one IP address stops credential attacks
- A JWT is trustworthy because it decoded: verify, do not just parse
- Logout ends the session everywhere
- An authenticated session is strong enough for every action
```

Five beliefs, stated as the attacker sees them, then corrected. Each one is a
candidate for a rule and none has one.

### The boundary with `rule-platform-auth`, already decided and not applied

The `rule-platform-auth` plan (ADR line in that plan) decided: **strategy and
protocols there, the authentication lifecycle here**. This leaf's description
still claims the whole of authentication ("the authentication lifecycle: JWT
verification, session revocation, logout, password reset, remembered devices,
step-up auth, and CSRF"), and `rule-platform-auth` covers sessions, JWT and CSRF
too. Neither has been edited yet, so both still claim it. This plan applies the
decision on this side.

### Overlap with the router

The router owns `helmet-headers`, `cors-explicit`, `rate-limiting`,
`input-validation`, `error-exposure` and `sql-injection`. This leaf has sections
on headers, rate limiting, CORS and input validation: the same subjects, one
level down. The rules exist; the prose should point at them.

## The five rules

| id                          | Rejects                                                                             | Tier | Today   |
| --------------------------- | ----------------------------------------------------------------------------------- | ---- | ------- |
| `security-verify-not-parse` | A token decoded and trusted with no signature check                                 | B    | n/a     |
| `security-authz-per-route`  | A route with authentication but no authorization decision                           | B    | n/a     |
| `security-session-revoked`  | A logout that clears the cookie and leaves the session record                       | B    | n/a     |
| `security-rate-limit-auth`  | An authentication endpoint with no limiter (inherited rule covers the generic case) | B    | n/a     |
| `security-owner-named`      | A section that keeps the auth strategy instead of pointing at `rule-platform-auth`   | B    | **red** |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-platform-auth` (HARD)

Feeds: `rule-backend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape, and the auth boundary applied: this
      leaf keeps the lifecycle, `rule-platform-auth` keeps the strategy.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-security/`: `clean/`, `parse-without-verify/`,
      `authn-without-authz/`, `logout-cookie-only/`, each with a one-line
      `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-backend-security`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-security/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Apply the boundary

- [ ] The description stops claiming the whole of auth; it names the lifecycle
      and links `rule-platform-auth` for the choice.
- [ ] The header, rate-limit, CORS and validation sections point at the
      inherited rule ids instead of restating the principles.
- [ ] The five attacker assumptions gain their rule ids, so a reader can run
      them.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-security/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Apply the boundary   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- The attacker-assumptions section is the model for how a security skill should
  read: the wrong belief first, the correction second, the rule third. Today the
  third step is missing on all five.
- Two skills claiming the same subject is not a routing bug yet, because
  `rule-platform-auth` has no door (its own plan fixes that). Applying the
  boundary here removes the collision before the door opens.
- `security-verify-not-parse` is the highest-value rule in the area: a decoded
  JWT is the most common false sense of security in Node services.

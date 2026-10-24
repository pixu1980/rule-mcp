# rule-backend guardrails execution plan

Status: `superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the eight rule-backend leaves.
Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the eight rule-backend leaves. Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the eight rule-backend leaves, one rule set per plan. Graph: not a node; see the absorbed table in `skills-plan.md`.

Scope: extend the deterministic guardrails of the nine `rule-backend*` skills,
fix the false positives inside the six rules that already exist, and record
every rule against a citable public source. Implementation happens in a
dedicated session: this document is the plan only.

Companion plan: `docs/plans/devops-guardrails.md` (same method, other area).

## Evidence base

Audited in this session (read-only):

- `skills/rule-backend/SKILL.md` and `guardrails/` (six rules)
- `skills/rule-backend-security/SKILL.md` (425 lines, no guardrails)
- `skills/rule-backend-node/SKILL.md` (395 lines, no guardrails)
- `skills/rule-backend-workers/SKILL.md` (424 lines, no guardrails)
- `skills/rule-backend-graphql/SKILL.md` (no guardrails)
- `skills/rule-backend-{express,fastify,hono,nestjs}/SKILL.md` (no guardrails)
- `src/core/layers/_inherit.js` (`resolveInherited`, nearest definition wins)
- `tests/fixtures/guardrail-corpus.mjs` (12 backend snippets cover the six rules)

Current state: 6 rules, all owned by `rule-backend` and inherited by every child
through `inherits: [rule-backend]`.

| Rule               | Trigger heuristic                             |
| ------------------ | --------------------------------------------- |
| `cors-explicit`    | `cors(` / `@fastify/cors` / `app.enableCors`  |
| `error-exposure`   | response chain containing `.stack`/`.message` |
| `helmet-headers`   | server file without helmet                    |
| `input-validation` | request input without a known validator       |
| `rate-limiting`    | server file without rate limiting             |
| `sql-injection`    | string-built query to `.query(`/`.execute(`   |

Known false positives in the six, from the frameworks this repo serves:

| Rule               | Misses                                                  |
| ------------------ | ------------------------------------------------------- |
| `helmet-headers`   | Hono `secureHeaders()`                                  |
| `rate-limiting`    | Hono `hono-rate-limiter`                                |
| `input-validation` | Hono `@hono/zod-validator`, valibot, standard-validator |

Sources fetched and used (each accepted rule cites one or more):

- OWASP API Security Top 10 2023, https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP ASVS, https://owasp.org/www-project-application-security-verification-standard/
- OWASP Node.js Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- OWASP GraphQL Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP SSRF Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Prototype Pollution Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html
- RFC 8725, JWT Best Current Practices, https://datatracker.ietf.org/doc/html/rfc8725
- Node.js security best practices, https://nodejs.org/en/learn/getting-started/security-best-practices
- Node.js, do not block the event loop, https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
- Express production security best practices, https://expressjs.com/en/advanced/best-practice-security.html
- Fastify recommendations, https://fastify.dev/docs/latest/Guides/Recommendations/
- Hono secure headers middleware, https://hono.dev/docs/middleware/builtin/secure-headers
- NestJS security, helmet, https://docs.nestjs.com/security/helmet

## Decisions from the interview

| Question         | Decision                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| Target skills    | All nine. Shared rules in `rule-backend`, the rest in their topic skill |
| Scope            | High-signal selection (6-10)                                            |
| Fixes to the six | Extend the patterns to the framework equivalents                        |
| Auth rules       | All five candidates                                                     |
| Input rules      | All six candidates                                                      |
| Runtime rules    | All five candidates                                                     |
| GraphQL rules    | All five candidates                                                     |
| Framework rules  | All four candidates                                                     |
| Trigger policy   | Content heuristic on server/API files plus framework-scoped patterns    |
| Severity         | Advisory until corpus precision is proven, then blocking                |
| Corpus and tests | Fixtures, framework fixtures, unit tests, inheritance test              |
| Artifacts        | Frontmatter, census, ADR, changelog, per-rule source                    |
| Phasing          | Plan only now; implementation in a dedicated session                    |
| Sources          | Every new rule cites its source                                         |

### Open item 1: 25 rules against a 6-10 budget

The interview selected 25 rules while the scope answer asked for 6-10. The
tiering below resolves the tension without dropping a decision:

- **Tier A (10, promotion path to blocking)**: mechanically checkable, low
  false-positive, security or resource-bounded.
- **Tier B (15, advisory, no promotion yet)**: needs a real repository and the
  corpus before it can block.

Tier A: `jwt-verify-not-decode`, `jwt-alg-none-banned`,
`cookie-security-flags`, `no-dynamic-code-execution`, `body-size-limit`,
`outbound-timeout`, `gql-depth-limit`, `express-error-handler`,
`hono-secure-headers`, `nestjs-validation-pipe`.

Tier B: `csrf-state-change`, `auth-log-redaction`, `prototype-pollution-guard`,
`ssrf-allowlist`, `pagination-max-limit`, `env-validation-at-boot`,
`bounded-concurrency`, `no-sync-blocking`, `graceful-shutdown`,
`worker-pool-per-request`, `gql-introspection-prod`, `gql-batching-limit`,
`gql-pagination`, `gql-authz-edges-nodes`, `fastify-route-schema`.

Owner confirmation requested before Phase 1.

### Open item 2: where the runtime rules live

The five runtime rules are about the Node runtime, not about one framework, and
they must reach the framework skills. Two ways:

1. **Recommended**: owner `rule-backend-node`, and the server-bearing children
   (`express`, `fastify`, `hono`, `nestjs`, `graphql`, `security`, `workers`)
   add `rule-backend-node` to `inherits`, so the runtime layer is explicit.
2. Owner `rule-backend`, like the other shared rules, at the cost of a flatter
   but less honest graph.

`graceful-shutdown` and `worker-pool-per-request` are runtime-specific: on
Cloudflare Workers there is no `SIGTERM`, so rule 1 in option 1 is also the one
that can gate them on the detected runtime.

## Reorganization of the six existing rules

Fixes only, no id changes:

- `helmet-headers`: accept `secureHeaders(` from Hono and the NestJS
  registration, not only `helmet`/`@fastify/helmet`.
- `rate-limiting`: accept the Hono rate limiter alongside `express-rate-limit`
  and `@fastify/rate-limit`.
- `input-validation`: accept the Hono validator, valibot and standard-validator
  alongside Zod, Joi and class-validator.
- `cors-explicit`: already matches all frameworks; no change.
- `error-exposure`, `sql-injection`: no change.

Each extension needs a framework fixture, because the rule has to stay silent on
the idiomatic form of every framework in the family.

## Accepted rules

### Shared, owned by rule-backend

| Rule id                     | Rejects                                                          | Tier | Source                       |
| --------------------------- | ---------------------------------------------------------------- | ---- | ---------------------------- |
| `jwt-verify-not-decode`     | `jwt.decode(` used for an auth decision                          | A    | RFC 8725; OWASP auth         |
| `jwt-alg-none-banned`       | `algorithms: ['none']`, alg read from the token header           | A    | RFC 8725                     |
| `cookie-security-flags`     | session cookie without `httpOnly`, `secure`, `sameSite`          | A    | OWASP auth; Express security |
| `csrf-state-change`         | state-changing route without token or origin check               | B    | OWASP CSRF                   |
| `auth-log-redaction`        | log call carrying token, password, authorization, session cookie | B    | OWASP auth; API2 and API8    |
| `no-dynamic-code-execution` | `eval(`, `new Function(`, `exec(` with interpolated input        | A    | OWASP Node.js                |
| `prototype-pollution-guard` | recursive merge of user input, `__proto__` access                | B    | OWASP prototype pollution    |
| `ssrf-allowlist`            | `fetch(url)` on user input without an allowlist                  | B    | OWASP SSRF; API7             |
| `body-size-limit`           | body parser without a size limit                                 | A    | API4 resource consumption    |
| `pagination-max-limit`      | list endpoint without a capped `limit`/`pageSize`                | B    | API4 resource consumption    |
| `env-validation-at-boot`    | `process.env.` spread across the code, no boot validation        | B    | OWASP Node.js; 12-factor     |
| `outbound-timeout`          | outbound `fetch`/HTTP client without a timeout                   | A    | Node.js docs; API10          |
| `bounded-concurrency`       | `Promise.all` over a user-sized array                            | B    | Node.js docs                 |
| `no-sync-blocking`          | `readFileSync`, `execSync`, `pbkdf2Sync` inside a request path   | B    | Do not block the event loop  |
| `graceful-shutdown`         | server without a `SIGTERM` handler and connection drain          | B    | Node.js docs                 |

`auth-log-redaction` and `ssrf-allowlist` overlap with the observability area of
the devops plan; the backend copy is the authoritative one for request handling,
and the devops plan stays about telemetry stores.

### GraphQL, owned by rule-backend-graphql

| Rule id                  | Rejects                                             | Tier | Source        |
| ------------------------ | --------------------------------------------------- | ---- | ------------- |
| `gql-depth-limit`        | server with no depth or complexity limit            | A    | OWASP GraphQL |
| `gql-introspection-prod` | introspection or GraphiQL on in production          | B    | OWASP GraphQL |
| `gql-batching-limit`     | unlimited operation batching or aliases             | B    | OWASP GraphQL |
| `gql-pagination`         | list field without `first`/`last`/cursor            | B    | OWASP GraphQL |
| `gql-authz-edges-nodes`  | resolver without an authorization check on the node | B    | OWASP GraphQL |

### Runtime, owned by rule-backend-node (see open item 2)

| Rule id                   | Rejects                                        | Tier | Source               |
| ------------------------- | ---------------------------------------------- | ---- | -------------------- |
| `worker-pool-per-request` | `new Worker(` created inside a request handler | B    | rule-backend-workers |

### Framework skills

| Rule id                  | Skill                | Rejects                                                | Tier | Source                  |
| ------------------------ | -------------------- | ------------------------------------------------------ | ---- | ----------------------- |
| `express-error-handler`  | rule-backend-express | app with no four-argument error middleware             | A    | Express security        |
| `fastify-route-schema`   | rule-backend-fastify | route without a validation/serialization schema        | B    | Fastify recommendations |
| `hono-secure-headers`    | rule-backend-hono    | app with no `secureHeaders()`                          | A    | Hono secure headers     |
| `nestjs-validation-pipe` | rule-backend-nestjs  | global pipe without `whitelist`/`forbidNonWhitelisted` | A    | NestJS security         |

## Enforcement model

1. **Two triggers, both declared.** Content heuristics stay, narrowed to files
   under `src/` that look like server or route code; framework rules activate
   only when the file imports that framework. A rule that is not about the file
   returns `pass: true` with a note, the way the six do today.
2. **Advisory first.** Each rule carries `severity: "advisory"` and does not
   block until Phase 6 promotes it after 100% precision and recall.
3. **Registry wiring.** `rule-backend` keeps its `guardrails/index.js` and gains
   the shared ids; `rule-backend-graphql`, `rule-backend-node` and the four
   framework skills gain their own `guardrails/index.js` and their `inherits`
   lines as decided in open item 2.
4. **Tests.** Every rule gets a `good` and a `bad` entry in
   `tests/fixtures/guardrail-corpus.mjs`, a framework fixture for each family
   form, a unit test under `guardrails/__tests__/`, and an inheritance test
   asserting the rule reaches all nine skills.
5. **Measured, then promoted.** The corpus gate is the promotion gate, exactly
   as in the devops plan.

## Phases

## Dependency graph

Absorbed or outside the graph: listed for completeness, not executed as a node.

Depends on: -

Feeds: -

Shared files: none: absorbed into the leaf plans named above

### Phase 0 - Decisions and scaffolding

- [x] Audit the nine skills and their guardrails.
- [x] Fetch and record the public sources in this document.
- [x] Interview the owner and record the decisions above.
- [ ] Confirm the Tier A / Tier B split (open item 1).
- [ ] Confirm the runtime ownership and the `inherits` change (open item 2).
- [ ] Create the ADR for the backend guardrail family.
- [ ] Extend the guardrail engine with the optional `severity` field shared
      with the devops plan.

### Phase 1 - Fix the six existing rules

- [ ] Extend `helmet-headers`, `rate-limiting` and `input-validation` to the
      framework forms, with a fixture per framework.
- [ ] Rerun the corpus gate and confirm no regression on the six.

### Phase 2 - Shared security rules in rule-backend

- [ ] Implement the five auth rules (`jwt-*`, `cookie-security-flags`,
      `csrf-state-change`, `auth-log-redaction`).
- [ ] Implement the static-analysis rules (`no-dynamic-code-execution`,
      `prototype-pollution-guard`, `ssrf-allowlist`).
- [ ] Implement the resource rules (`body-size-limit`, `pagination-max-limit`,
      `env-validation-at-boot`).
- [ ] Add corpus fixtures, unit tests and the inheritance test.

### Phase 3 - Runtime rules

- [ ] Apply the open-item-2 decision to the `inherits` graph.
- [ ] Implement `outbound-timeout`, `bounded-concurrency`, `no-sync-blocking`,
      `graceful-shutdown`, `worker-pool-per-request`.
- [ ] Add corpus fixtures and unit tests.

### Phase 4 - GraphQL rules in rule-backend-graphql

- [ ] Create `guardrails/` with the five rules.
- [ ] Add corpus fixtures for a schema and a resolver file.
- [ ] Update `rule-backend-graphql/SKILL.md` frontmatter.

### Phase 5 - Framework rules

- [ ] Create `guardrails/` in each of the four framework skills.
- [ ] Add a fixture per framework and a false-positive fixture for the others.
- [ ] Update each framework `SKILL.md` frontmatter and rule section.

### Phase 6 - Promotion and documentation

- [ ] Promote Tier A rules to blocking once the corpus reports 100% precision
      and recall per rule.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census` and commit.
- [ ] Run the full project gates listed below.
- [ ] Add the changelog entry and a scoped conventional commit.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                            | Class      | Model                   | Why                            |
| ----------------------------------------------- | ---------- | ----------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding             | `T1-plan`  | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fix the six existing rules            | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 2 - Shared security rules in rule-backend | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 3 - Runtime rules                         | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 4 - GraphQL rules in rule-backend-graphql | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 5 - Framework rules                       | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 6 - Promotion and documentation           | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm test tests/core/self-guardrails.test.mjs
pnpm lint
pnpm census
pnpm test
```

Any rule that cannot reach 100% precision and recall stays advisory and out of
the promotion list.

## See also

- `docs/plans/devops-guardrails.md` - the sibling plan for the devops area
- `docs/15-guardrails.md` - the generated guardrail census
- `docs/08-engineering-guides.md` - the guardrail workflow and quality gates

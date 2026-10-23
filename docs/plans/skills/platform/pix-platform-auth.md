# rule-platform-auth - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#39`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: platform. Sibling plans: `rule-platform-desktop` (which introduces the
served-references surface this plan needs), `rule-platform-web`,
`rule-platform-library`, `rule-process` (which regenerates the dispatcher),
`rule-process-adr` (the guardrail shape).

## Scope decisions (owner, 2026-10-21)

| Question           | Decision                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                   |
| Identity           | Thin body plus `references/`: the body keeps the choice and the matrix, the flows and patterns move out         |
| Boundary           | This skill owns **strategy and protocols**; `rule-backend-security` owns the **lifecycle**                       |
| Reach              | All three fixes land here: the router row, the dispatcher row, and the router description that never names auth |
| Dated claims       | Both: a year-stamped claim needs a named source, and the skill records when it was last reviewed                |
| Rule set           | Six rules, all Tier B (advisory)                                                                                |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                       |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                    |
| Flow               | Failing test first                                                                                              |
| Gates              | Skill suite, corpora, catalog clean, router coverage, census, lint and typecheck                                |
| Commits            | One per phase                                                                                                   |
| ADR                | Two: the auth/security boundary, the rule design                                                                |
| Done               | The doors are open and the rules pass                                                                           |

## Cross-plan dependencies

- **Served references.** Splitting the body only works if `references/` is
  reachable. `rule-platform-desktop` plans that resource; this plan consumes it.
  If the resource is dropped there, this plan's Phase 3 falls back to declaring
  the files in the body.
- **Router and dispatcher.** The rows for this skill belong to tables owned by
  `rule-process` (dispatcher) and by the `rule-platform` router plan. This plan
  makes the edits anyway, because the owner asked for the doors to open here;
  the other two plans must not undo them.
- **`ROUTER_GAPS`.** The entry `"rule-platform": ["rule-platform-auth"]` is
  deleted in Phase 5, and the coverage test fails if it outlives the row.

## Evidence base (measured 2026-10-21)

`skills/rule-platform-auth/SKILL.md` is **675 lines**, 30 sections, no
`guardrails/`, no `references/`, no `guardrails:` frontmatter key.

### It has no doors at all

| Door                           | State                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `rule-platform` router table    | missing: recorded in `scripts/data/router-gaps.data.mjs`                                       |
| `rule` dispatcher table         | missing: one of the 22 unlisted skills                                                         |
| `rule-platform` description     | does not mention auth: "Covers desktop, mobile (Expo), library authoring, and web conventions" |
| `rule-platform` Quick Selection | no line reaches auth                                                                           |
| Inbound links                  | one skill mentions it in passing; the only other hits are generated docs                       |

A 675-line skill that no reader can reach from either index is the strongest
single finding in this plan series. It was written well and never wired.

### The boundary with `rule-backend-security` is undecided

`rule-backend-security` describes itself as owning "the authentication
lifecycle: JWT verification, session revocation, logout, password reset,
remembered devices, step-up auth, and CSRF", and carries the
`authentication` tag. This skill covers sessions, JWT, token storage, CSRF and
cookie flags too. Measured overlap:

| Topic                   | In `rule-platform-auth`          | In `rule-backend-security`                 |
| ----------------------- | ------------------------------- | ----------------------------------------- |
| JWT                     | comparison, revocation, hygiene | "a JWT is trustworthy because it decoded" |
| CSRF                    | double-submit pattern           | named in the description                  |
| `HttpOnly` / `SameSite` | session and token storage rules | session assumptions                       |
| OAuth                   | full flows                      | mentioned, not owned                      |
| Argon2, passkeys        | only here                       | absent                                    |

The owner's split: strategy and protocols here, lifecycle and infrastructure
there. Both skills lose a paragraph and gain a link.

### The sourcing is good, and two claims are not

The skill cites RFC 9700 (January 2025), OAuth 2.1 draft-15 (March 2026), the
NCSC position (April 2026) and three OWASP cheat sheets. Two year-stamped
claims carry no source: "Choose the right authentication strategy for a web app
in 2026" in the description, and "the most defensible 2026 default is a managed
provider" in the managed-provider section. Both are the kind of claim that
rots silently.

### A frontmatter review date costs more than it looks

`src/core/skills/_frontmatter.js` parses a fixed key set: `name`,
`description`, `tags`, `guardrails`, `inherits`, `exposeTool`, `frameworks`.
An unknown key is ignored, not rejected, so a `reviewed:` field would be
silently dropped until three things change: the parser, whatever exposes
metadata to a rule, and the census if the date is reported. The plan does it,
because the owner asked, and the phase names all three files.

## Target shape

The body keeps: the two-axis framing, the sessions-vs-JWT comparison, the
decision matrix by archetype, the guards, the pointers. Roughly 200 lines.

`references/` receives the implementation material:

| Reference        | From today's body                                            |
| ---------------- | ------------------------------------------------------------ |
| `sessions.md`    | implementation pattern, session ID rules, trade-offs, Argon2 |
| `jwt.md`         | revocation, implementation pattern, token storage rules      |
| `oauth-oidc.md`  | the standard, when it is overkill, authorization code + PKCE |
| `passkeys.md`    | why, state of support, enrollment, authentication, recovery  |
| `providers.md`   | build vs buy, the common hybrid architecture                 |
| `csrf.md`        | the double-submit pattern for SPAs                           |
| `ux-failures.md` | the failure modes backend logs miss                          |

## The six rules

| id                                 | Rejects                                                                  | Reads                       | Tier | Today                                        |
| ---------------------------------- | ------------------------------------------------------------------------ | --------------------------- | ---- | -------------------------------------------- |
| `auth-reachable`                   | A skill that no area router table lists                                  | `code` + `context.fileList` | B    | red: this skill                              |
| `auth-no-duplicate-security-rules` | JWT, CSRF or cookie-flag rules restated outside the owner decided in ADR | `code`                      | B    | red: both skills                             |
| `auth-owner-named`                 | A delegated section naming no owner                                      | `code`                      | B    | red: no link to `rule-backend-security` today |
| `auth-no-stale-skill-id`           | A `rule-...` id with no skill directory                                   | `code` + `context.fileList` | B    | clean                                        |
| `auth-dated-claims`                | A year in the text with no source named nearby                           | `code`                      | B    | red: two claims                              |
| `auth-matrix-single-source`        | The archetype matrix restated in a reference or a second table           | `code` (tables)             | B    | clean; the split creates the risk            |

## Phase 0 - Decisions

- [ ] ADR: the auth boundary. Strategy and protocols here, lifecycle in
      `rule-backend-security`, with the sentence that decides a disputed case.
- [ ] ADR: the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-auth/`: `clean/`, `unlisted-skill/`,
      `duplicate-jwt-rules/`, `unsourced-year/`, `matrix-restated/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-platform-auth`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-platform-auth/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] `reviewed:` frontmatter support: the parser key, the metadata exposure,
      the census field if reported. Three files, one test each.
- [ ] Green the Phase 1 suites.

## Phase 3 - Split the body

- [ ] Seven reference files in the table above, moved not rewritten.
- [ ] Body trimmed to the framing, the comparison, the matrix, the guards and
      the pointers.
- [ ] `auth-dated-claims` and the review date in place; the two unsourced years
      either gain a source or lose the year.

## Phase 4 - Resolve the boundary

- [ ] This skill keeps strategy, protocols and passkeys; it links
      `rule-backend-security` for verification, revocation, logout, reset and
      step-up.
- [ ] `rule-backend-security` keeps the lifecycle and links here for the choice
      and the protocols; its description stops claiming the whole of auth.
- [ ] Neither skill restates the other's rules; the rule enforces it.

## Phase 5 - Open the doors

- [ ] `rule-platform` router: a table row and a Quick Selection line.
- [ ] `rule-platform` description: name auth among the platforms.
- [ ] Dispatcher row (regenerated if the `rule-process` plan lands first).
- [ ] Delete `"rule-platform": ["rule-platform-auth"]` from
      `scripts/data/router-gaps.data.mjs`.

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-platform-auth/guardrails/`
- [ ] `_corpus`, `_routing-corpus` and `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules: only the documented cases remain.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Split the body       | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Resolve the boundary | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 5 - Open the doors       | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 6 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T5-bulk` - `minimax-m3.1-flash`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-platform-auth/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-platform-desktop#3` (CONTRACT), `rule-platform-desktop#3` (CONTRACT)

Feeds: `rule-platform` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- `auth-reachable` is a catalog-wide rule wearing a skill-local id. It runs
  from this skill, but it can only be satisfied by a router table somewhere
  else, and the same rule belongs to every router plan. If it ships here first,
  the other plans inherit it rather than reimplement it.
- The `reviewed:` field is the only frontmatter change in this plan series.
  It is worth it only if something reads it: a date nobody checks is a comment
  with a colon in it. The rule is the reader.
- Splitting 675 lines into ~200 plus seven references is a real edit, and the
  material moved is the material that makes the skill valuable. The move must
  preserve code blocks byte for byte; a rewrite disguised as a move is how
  depth gets lost.
- Passkeys are the newest and fastest-moving part of the skill, and the part
  with a dated, sourced claim. That is the section the review date protects.

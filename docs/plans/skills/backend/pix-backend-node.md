# rule-backend-node - plan

Status: plan only, 2026-10-21. Index row `#73`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf and the area's scaffolding runbook. **395 lines**, three
files: the body plus `assets/templates/scripts/create-tool.ts` and
`create-agent.ts`. It inherits the router's six rules through
`inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Shape: `# Scaffolding Backend Node`, then project profile, dependency baseline,
required layout, build order in numbered steps (baseline files, bootstrap the
Express app, fill in the domain modules, ...), and a closing section.

It is the second runbook in the catalog after `rule-frontend-template-engine`, and
the only one whose scaffold produces a **server**.

### The two shipped scripts are unserved and unrun

`assets/templates/scripts/create-tool.ts` and `create-agent.ts` are referenced by
the body, read by no surface (`serveResource` serves `SKILL.md` only), linted by
no scope (`pnpm lint` covers `bin/ src/ tests/`), and run by no test. Same blind
spot as the frontend workers examples and the template-engine assets, in a third
place.

### It bootstraps Express while sitting above Express

Step 2 is "Bootstrap the Express app". The catalog has a dedicated Express leaf
with its own middleware, error-handling and shutdown rules. So the runbook
generates an app that the framework leaf would then tell you to rewrite - unless
the generated bootstrap already follows those rules, which nothing checks.

That is the single most actionable finding here: **the scaffold and the framework
leaf must agree**, and today the only thing connecting them is prose.

### Reach

| Door | State |
| ---- | ----- |
| `rule-backend` area router | listed |
| `rule` dispatcher | listed |
| Inbound links | the area router, `rule-platform`, the GraphQL leaf |

## The five rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `node-scaffold-matches-framework-rules` | A generated Express bootstrap that breaks `express-*` rules | B | n/a |
| `node-assets-served` | A shipped template script no surface reaches and the body does not declare | B | **red**: two files |
| `node-assets-run` | A template script with no test or dry run | B | **red** |
| `node-env-validated-at-boot` | `process.env.X` read at use site instead of validated once at startup | B | n/a |
| `node-owner-named` | A section delegating tests, containers or observability without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape, including the rule that a scaffolding
      runbook must produce code the framework leaf accepts.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-node/`: `clean/`, `scaffold-breaks-framework-rule/`,
      `unserved-assets/`, `env-at-use-site/`, each with a one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-backend-node`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-node/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Make the scaffold checkable

- [ ] A dry run generates the app into a temp directory and runs the
      `rule-backend-express` rules over the result.
- [ ] The two template scripts are served (the references surface planned in
      `rule-platform-desktop`) or declared in the body.
- [ ] Trim the prose that restates the router's layout section.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-node/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Scaffold dry run green against the Express rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- This is the leaf where a scaffolding runbook and a framework leaf can silently
  disagree. A generated app is the one artifact a reader runs unseen, so the
  agreement has to be a test, not a paragraph.
- The two `create-*.ts` scripts are the only TypeScript in the catalog outside
  `src/`. They are also the only scaffold helpers that generate agents, which
  makes them the closest thing to the retired `rule-platform-agent` content that
  survived (ADR 151).

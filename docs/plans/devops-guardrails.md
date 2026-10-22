# rule-devops guardrails execution plan

Status: `superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the four rule-devops leaves.
Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the four rule-devops leaves. Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: the four rule-devops leaves, one rule set per plan. Graph: not a node; see the absorbed table in `skills-plan.md`.

Scope: extend the deterministic guardrails of the five `rule-devops*` skills,
reorganize the four rules that already exist, and record every rule against a
citable, de facto public source. Implementation happens in a dedicated session:
this document is the plan only.

## Evidence base

Audited in this session (read-only):

- `skills/rule-devops/SKILL.md` and `guardrails/{index,_env-gitignore,_secret-detection}.js`
- `skills/rule-devops-docker/SKILL.md` and `guardrails/{index,_docker-healthcheck,_docker-non-root}.js`
- `skills/rule-devops-testing/SKILL.md` (no guardrails directory)
- `skills/rule-devops-observability/SKILL.md` (no guardrails directory)
- `skills/rule-devops-deploy-preview/SKILL.md` (no guardrails directory)
- `src/core/guardrails/engine/_registry.js` (`getGuardrails`, baseline skills, inheritance)
- `src/core/guardrails/_scaffold.js` (file-presence scaffold checks)
- `tests/fixtures/guardrail-corpus.mjs` and `docs/07-engineering-guides.md` (100% precision/recall gate)

Current state: 4 rules only.

| Rule                 | Skill             | Trigger                |
| -------------------- | ----------------- | ---------------------- |
| `env-gitignore`      | rule-devops        | file name `.gitignore` |
| `secret-detection`   | rule-devops        | any code               |
| `docker-healthcheck` | rule-devops-docker | Dockerfile or compose  |
| `docker-non-root`    | rule-devops-docker | Dockerfile or compose  |

Sources fetched and used (each accepted rule cites one or more):

- Docker build best practices, https://docs.docker.com/build/building/best-practices/
- Dockerfile reference, https://docs.docker.com/reference/dockerfile/
- Running containers, privilege and capabilities, https://docs.docker.com/engine/containers/run/
- OWASP Docker Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- OWASP Logging Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Kubernetes probes, https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- GitLab CI/CD YAML reference, https://docs.gitlab.com/ci/yaml/
- GitLab environments, https://docs.gitlab.com/ci/environments/
- GitLab protected environments, https://docs.gitlab.com/ci/environments/protected_environments/
- GitLab review apps, https://docs.gitlab.com/ci/review_apps/
- DigitalOcean App Platform, https://docs.digitalocean.com/products/app-platform/
- SLSA levels, https://slsa.dev/spec/v1.0/levels
- Google SRE, defining SLOs, https://sre.google/sre-book/service-level-objectives/
- DORA four keys, https://dora.dev/guides/dora-metrics-four-keys/
- OpenTelemetry GenAI semantic conventions, https://github.com/open-telemetry/semantic-conventions-genai
- Vitest config reference, https://vitest.dev/config/
- eslint-plugin-vitest, https://github.com/vitest-dev/eslint-plugin-vitest
- Testing Library, appearance and disappearance, https://testing-library.com/docs/guide-disappearance/
- The Twelve-Factor App, logs, https://12factor.net/logs

## Decisions from the interview

| Question            | Decision                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| Target skills       | Only topics with de facto public documentation. All five qualify.         |
| Scope               | High-signal selection (6-10) plus reorganization.                         |
| Runtime vs static   | Mix: static checks on target files plus human checklist, plus CI scripts. |
| Docker rules        | `.dockerignore`, no secrets in build args/copies, compose hardening.      |
| CI/CD rules         | All five candidates.                                                      |
| Testing rules       | All four candidates.                                                      |
| Observability rules | All four candidates.                                                      |
| Preview rules       | All four candidates.                                                      |
| Trigger policy      | Target file name only.                                                    |
| Severity            | Advisory until corpus precision is proven, then blocking.                 |
| Corpus and tests    | Fixtures, unit tests, inheritance test, self-guardrails.                  |
| Artifacts           | Frontmatter, census, ADR, changelog, per-rule source note.                |
| Phasing             | Plan only now; implementation in a dedicated session.                     |
| Sources             | Every new rule cites its source.                                          |

### Open item: 20 rules against a 6-10 budget

The interview selected 20 rules while the scope answer asked for 6-10. The
tiering below resolves the tension without dropping a decision:

- **Tier A (14, promotion path to blocking)**: low false-positive, mechanically
  checkable, target file narrow.
- **Tier B (6, advisory, no promotion yet)**: needs a stronger source or a
  weaker claim; stays `pass: true` with a note until the corpus and a real
  repository prove precision.

Owner confirmation requested before Phase 1: keep the tiering as written, or
demote any Tier A rule to Tier B.

## Where each rule lives

| Rule family   | Owning skill              | Why                                                              |
| ------------- | ------------------------- | ---------------------------------------------------------------- |
| CI/CD         | rule-devops                | No `rule-devops-ci` skill exists, and all devops children inherit |
| Docker        | rule-devops-docker         | Topic owner                                                      |
| Testing       | rule-devops-testing        | Topic owner, gains its first `guardrails/` directory             |
| Observability | rule-devops-observability  | Topic owner, gains its first `guardrails/` directory             |
| Preview       | rule-devops-deploy-preview | Topic owner, gains its first `guardrails/` directory             |

Reorganization: `env-gitignore` and `secret-detection` stay in `rule-devops`;
they are already shared. `docker-healthcheck` and `docker-non-root` stay in
`rule-devops-docker`. No rule moves, and every skill's frontmatter `guardrails:`
list is kept in sync with the registry after the change.

## Accepted rules

### Docker (skill: rule-devops-docker, Tier A)

| Rule id                   | Rejects                                                                  | Target file        | Source                               |
| ------------------------- | ------------------------------------------------------------------------ | ------------------ | ------------------------------------ |
| `dockerignore-hardening`  | `.dockerignore` missing `.env*`, `node_modules/`, `dist/`                | `.dockerignore`    | Docker build best practices          |
| `docker-no-build-secrets` | `COPY .env*`, `ARG`/`ENV` with credential-looking names, secret in layer | `Dockerfile`       | OWASP Docker RULE 12; Dockerfile ref |
| `compose-hardening`       | `privileged: true`, `/var/run/docker.sock`, missing `read_only`/`user`   | autodeploy compose | OWASP Docker RULE 3 and 8            |

Notes: `compose-hardening` targets `docker-compose.autodeploy.yml`, not the
development compose file, because the dev stack mounts source by design.
Presence of `.dockerignore` itself is a scaffold concern; the content rule
above runs only when the file is checked.

### CI/CD (skill: rule-devops, shared, Tier A except as noted)

| Rule id                  | Rejects                                                   | Target file      | Tier | Source                           |
| ------------------------ | --------------------------------------------------------- | ---------------- | ---- | -------------------------------- |
| `ci-image-digest-pinned` | `image:`/`services:` without `@sha256:`                   | `.gitlab-ci.yml` | A    | GitLab CI/CD YAML; SLSA levels   |
| `ci-no-secret-echo`      | `echo`/`printf` of `CI_*` or credential-looking variables | `.gitlab-ci.yml` | A    | GitLab CI/CD YAML; OWASP logging |
| `ci-no-allow-failure`    | `allow_failure: true` on test and deploy jobs             | `.gitlab-ci.yml` | A    | GitLab CI/CD YAML; DORA          |
| `ci-protected-deploy`    | deploy job without a protected-branch rule or environment | `.gitlab-ci.yml` | B    | GitLab protected environments    |
| `ci-provenance`          | build job without provenance or SBOM artifact             | `.gitlab-ci.yml` | B    | SLSA levels                      |

`ci-no-allow-failure` accepts one escape hatch: an inline comment
`# allow-failure-ok: <reason>` on the same or previous line.

### Testing (skill: rule-devops-testing, Tier A)

| Rule id                    | Rejects                                                          | Target file       | Source                  |
| -------------------------- | ---------------------------------------------------------------- | ----------------- | ----------------------- |
| `test-coverage-thresholds` | `coverage.thresholds` missing or incomplete in vitest config     | `vitest.config.*` | Vitest config reference |
| `test-no-focused`          | `.only(` and `.skip(` committed, plus the pending modifier       | `*.test.*`        | eslint-plugin-vitest    |
| `test-no-fixed-sleep`      | `setTimeout` with a positive literal delay, or `sleep(` in tests | `*.test.*`        | Testing Library; DORA   |
| `test-setup-required`      | frontend config with `jsdom` and no `setupFiles`                 | `vitest.config.*` | Vitest config reference |

`test-no-focused` also rejects `fdescribe`, `xdescribe`, `fit` and `xit`.
The pending modifier is named in the corpus fixture only: writing the literal
marker in prose trips the existing `no-placeholder-implementation` rule, which
matches it case-insensitively. The corpus convention judges a snippet on its
target rule alone, so the fixture is the right place for the literal.

### Observability (skill: rule-devops-observability)

| Rule id               | Rejects                                                            | Target file                | Tier | Source                      |
| --------------------- | ------------------------------------------------------------------ | -------------------------- | ---- | --------------------------- |
| `obs-health-endpoint` | server entry with no `/health`, `/healthz` or `/ready` route       | server entry files         | A    | Kubernetes probes           |
| `obs-structured-logs` | `console.log(` in `src/` where a logger exists or is expected      | `src/**`                   | B    | Twelve-Factor logs          |
| `obs-no-pii-in-logs`  | log call carrying `password`, `token`, `authorization`, `req.body` | `src/**`                   | B    | OWASP logging               |
| `obs-span-versioning` | generation span without a prompt or model version attribute        | files creating GenAI spans | B    | OpenTelemetry GenAI semconv |

### Preview (skill: rule-devops-deploy-preview, Tier A)

| Rule id                      | Rejects                                                  | Target file           | Source                    |
| ---------------------------- | -------------------------------------------------------- | --------------------- | ------------------------- |
| `preview-on-stop`            | deploy job with no `environment.on_stop` and no stop job | `.gitlab-ci.yml`      | GitLab review apps        |
| `preview-auto-stop`          | review environment with no `auto_stop_in`                | `.gitlab-ci.yml`      | GitLab review apps        |
| `preview-no-secrets-spec`    | literal credential values in the App Spec                | `.do/review-app.yaml` | DigitalOcean App Platform |
| `preview-envsubst-whitelist` | `${VAR}` in App Spec absent from the envsubst whitelist  | both files            | DigitalOcean App Platform |

## Enforcement model

1. **File-scoped triggers only.** Each rule returns `pass: true` with a note
   when the file name is not its target, the way `docker-healthcheck` already
   does.
2. **Advisory first.** A new rule ships with a `severity: "advisory"` field and
   does not block. Promotion to blocking happens in Phase 6 after the corpus
   gate reports 100% precision and recall for that rule id.
3. **Registry wiring.** Each owning skill gets `guardrails/index.js` exporting
   `GUARDRAILS`; `rule-devops` keeps its own and gains the CI ids, which all
   children then inherit through the existing `inherits: [rule-devops]` edges.
4. **Tests.** Every rule gets at least one `good` and one `bad` entry in
   `tests/fixtures/guardrail-corpus.mjs`, a unit test under
   `guardrails/__tests__/`, and an inheritance test asserting the rule reaches
   each child skill.
5. **Runtime verification, separate from guardrails.** Observability and
   preview behavior that no static check can prove (SLO window, real teardown)
   becomes a CI script under `scripts/` that queries the deployed environment;
   it never runs inside `rule_tool_check`.

## Phases

## Dependency graph

Absorbed or outside the graph: listed for completeness, not executed as a node.

Depends on: -

Feeds: -

Shared files: none: absorbed into the leaf plans named above

### Phase 0 - Decisions and scaffolding

- [x] Audit the five skills and their guardrails.
- [x] Fetch and record the public sources in this document.
- [x] Interview the owner and record the decisions above.
- [ ] Confirm the Tier A / Tier B split (open item above).
- [x] Create the ADR for the devops guardrail family and enforcement policy
      (ADR 135, status proposed).
- [ ] Extend the guardrail engine with an optional `severity` field and keep
      `pass` semantics unchanged when the field is absent.

### Phase 1 - CI/CD rules in rule-devops

- [ ] Implement `ci-image-digest-pinned` and `ci-no-secret-echo`.
- [ ] Implement `ci-no-allow-failure` with the `# allow-failure-ok:` escape.
- [ ] Implement `ci-protected-deploy` and `ci-provenance` as Tier B.
- [ ] Add corpus fixtures, unit tests and the inheritance test.
- [ ] Update `rule-devops/SKILL.md` frontmatter and rule section; cite sources.

### Phase 2 - Docker rules in rule-devops-docker

- [ ] Implement the three Docker rules.
- [ ] Add corpus fixtures and unit tests; extend the inheritance test.
- [ ] Update `rule-devops-docker/SKILL.md` rule section and sources.

### Phase 3 - Testing rules in rule-devops-testing

- [ ] Create `guardrails/` with the four rules.
- [ ] Add corpus fixtures and unit tests.
- [ ] Update `rule-devops-testing/SKILL.md` frontmatter with `guardrails:`.

### Phase 4 - Observability rules in rule-devops-observability

- [ ] Create `guardrails/` with the four rules, Tier B where marked.
- [ ] Confirm each rule's target file against a real project before shipping.
- [ ] Update `rule-devops-observability/SKILL.md`.

### Phase 5 - Preview rules in rule-devops-deploy-preview

- [ ] Create `guardrails/` with the four rules.
- [ ] Add corpus fixtures against both template files.
- [ ] Update `rule-devops-deploy-preview/SKILL.md`.

### Phase 6 - Runtime scripts, promotion and documentation

- [ ] Add the CI scripts for the runtime claims (health probe, teardown check).
- [ ] Promote Tier A rules to blocking once the corpus reports 100% precision
      and recall per rule.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census` and commit.
- [ ] Run the full project gates listed below.
- [ ] Add the changelog entry and a scoped conventional commit.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - CI/CD rules in rule-devops | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 2 - Docker rules in rule-devops-docker | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Testing rules in rule-devops-testing | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 4 - Observability rules in rule-devops-observability | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 5 - Preview rules in rule-devops-deploy-preview | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 6 - Runtime scripts, promotion and documentation | `T7-author` | `qwen3.8-max` | skill bodies and references |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

Commands to run in the implementation session, in this order:

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

- `docs/14-guardrails.md` - the generated guardrail census
- `docs/07-engineering-guides.md` - the guardrail workflow and quality gates
- `docs/plans/execution-plan.md` - the unrelated OSS stewardship plan

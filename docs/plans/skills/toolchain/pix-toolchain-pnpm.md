# rule-toolchain-pnpm - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, sixth skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-pnpm/SKILL.md` (200 lines): exact versions, the
  no packageManager/engines/corepack policy, workspace, store, CI and
  migration sections.
- `skills/rule-toolchain-pnpm/guardrails/` (`pkg-exact-versions`,
  `pkg-no-corepack`, `pkg-no-engines`, `verified-dependencies-only`).

Public sources verified in this session:

- pnpm settings, https://pnpm.io/settings
- Build settings, https://pnpm.io/settings/build
- Supply-chain security, https://pnpm.io/supply-chain-security
- Workspaces, https://pnpm.io/workspaces
- Catalogs, https://pnpm.io/catalogs
- `pnpm fetch`, https://pnpm.io/cli/fetch
- `pnpm deploy`, https://pnpm.io/cli/deploy
- Releases, https://github.com/pnpm/pnpm/releases
- Corepack, https://github.com/nodejs/corepack

Facts that make the current text out of date:

| Current text                          | pnpm 12 reality                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| version examples 11.25.0 / 11.8.0     | the current line is v12                                                                                                                                            |
| no build-script approval              | v11 removed `onlyBuiltDependencies`, `ignoredBuiltDependencies`, `neverBuiltDependencies` and `ignoreDepScripts`; `allowBuilds` and `strictDepBuilds` replace them |
| no supply-chain settings              | `minimumReleaseAge`, `trustPolicy` and `verifyDepsBeforeRun` exist                                                                                                 |
| settings shown only in `.npmrc`       | `pnpm-workspace.yaml` carries settings from v10 on                                                                                                                 |
| `auto-install-peers=true` in `.npmrc` | the default since pnpm 8                                                                                                                                           |

Local articles: no dedicated pnpm piece exists in
the local article corpus. The NestJS 12 article mentions pnpm commands
and unified Node runtimes; it stays context only and is not cited.

## Decisions

| Question        | Decision                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope           | Version, supply chain, settings home, catalogs, Docker, audit, CI                                                                            |
| Version         | pnpm 12.x with an 11 to 12 migration note                                                                                                    |
| Corepack policy | Confirmed unchanged: no `packageManager`, no `engines`, no corepack                                                                          |
| Supply chain    | `strictDepBuilds` with explicit `allowBuilds`, `minimumReleaseAge`, `trustPolicy`, `verifyDepsBeforeRun`; `dangerouslyAllowAllBuilds` banned |
| Settings home   | `pnpm-workspace.yaml` primary, `.npmrc` only for `save-exact`                                                                                |
| Exact versions  | Extended to `overrides` and catalog entries                                                                                                  |
| Catalogs        | Optional, documented, not prescribed                                                                                                         |
| Docker          | `pnpm fetch` with offline install, `pnpm deploy --prod`, explicit `node-linker` when a tool needs it; no Dockerfile here                     |
| Install policy  | `--frozen-lockfile` always, locally and in CI                                                                                                |
| Delivery        | Plan only now                                                                                                                                |
| ADR             | Only when a decision is structural                                                                                                           |

## Workstream A - Version and policy

1. Version examples move to the 12.x line.
2. A migration note covers the 11 to 12 changes: `onlyBuiltDependencies` and
   friends become `allowBuilds`, and the removed settings are named so an
   upgrade finds them.
3. The no-corepack policy stays, with `.nvmrc` plus the lockfile as the source
   of truth and the README as the place a human reads the package manager.

## Workstream B - Supply chain

1. **Build scripts.** `strictDepBuilds` makes an unreviewed postinstall script
   fail the install, and every package that legitimately needs one is named in
   `allowBuilds`.
2. **Freshness.** `minimumReleaseAge` holds a new release back until it has
   survived a few days in the registry, which blunts a compromised publish.
3. **Trust.** `trustPolicy` decides which packages are acceptable.
4. **Pre-run check.** `verifyDepsBeforeRun` refuses to run a script against a
   dependency tree that no longer matches the lockfile.
5. `dangerouslyAllowAllBuilds` is never used in a rule project.

## Workstream C - Settings and exact versions

1. `pnpm-workspace.yaml` is the settings file; `.npmrc` keeps only
   `save-exact=true`.
2. Exact versions stay mandatory for `dependencies`, `devDependencies` and
   `optionalDependencies`; `peerDependencies` stay ranges.
3. `overrides` and catalog entries follow the same exact-version rule.
4. The `RULE_MCP_LOOSE_DEPS=1` escape hatch is documented as the only way
   out, for projects that manage versions elsewhere.

## Workstream D - Workspaces and catalogs

1. `pnpm-workspace.yaml` declares `packages` and, when used, `catalog` or
   `catalogs`.
2. Catalogs are optional: the plan documents them as the way to keep one
   version constant across packages, without prescribing them.
3. `workspace:` ranges stay the internal-dependency mechanism.

## Workstream E - Install, CI and Docker

1. `pnpm install --frozen-lockfile` everywhere; a lockfile drift fails instead
   of being silently regenerated.
2. CI caches the pnpm store and runs the frozen install; `pnpm fetch` is the
   Docker path because it needs only the lockfile and the workspace file.
3. `pnpm fetch --prod` followed by `pnpm install --offline --frozen-lockfile
--prod` gives a build layer that is reused until the lockfile changes.
4. `pnpm deploy --prod` produces the deployable tree without devDependencies.
5. `node-linker` is set explicitly only when a tool needs a hoisted layout.
6. The Dockerfile stays in `rule-devops-docker`; this skill owns only the pnpm
   steps.

## Workstream F - Dependency hygiene

`pnpm audit --prod` on a cadence and before a release, `pnpm dedupe` after an
upgrade burst, and `pnpm licenses list` when a license inventory is required.
Publishing and provenance stay with `rule-process-npm-release`.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                   | Rejects                                                                                                                                | Tier | Source                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------- |
| `pkg-allow-builds`        | a workspace that disables `strictDepBuilds`, omits `allowBuilds` for a package with build scripts, or uses `dangerouslyAllowAllBuilds` | A    | Build settings        |
| `pkg-minimum-release-age` | a new workspace with no `minimumReleaseAge`                                                                                            | B    | Supply-chain security |
| `pkg-catalog-range`       | a package that writes a range while the workspace has a catalog entry for it                                                           | B    | Catalogs              |

The four existing rules stay: `pkg-exact-versions`, `pkg-no-corepack`,
`pkg-no-engines`, `verified-dependencies-only`.

## Assets and templates to ship

- `assets/templates/pnpm-workspace.yaml` (packages, supply-chain settings).
- `assets/templates/npmrc` (`save-exact=true` only).
- `assets/templates/pnpm-ci.yml` and `assets/templates/pnpm-docker.md`.
- `assets/templates/upgrade-pnpm-11-to-12.md`.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the four guardrails.
- [x] Verify the pnpm 12 facts and the v11 removals.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Update the version references and add the 11 to 12 migration note.
- [ ] Add the supply-chain section with `allowBuilds` and `strictDepBuilds`.
- [ ] Move the settings into `pnpm-workspace.yaml` and reduce `.npmrc`.
- [ ] Extend the exact-version rule to `overrides` and catalogs.
- [ ] Add the catalogs section as optional.
- [ ] Rewrite the CI and Docker sections with `fetch`, `deploy` and
      `--frozen-lockfile`.
- [ ] Remove the `auto-install-peers=true` advice, which is the default.
- [ ] Add the audit, dedupe and licenses hygiene section.

### Phase 2 - Guardrails and assets

- [ ] Implement `pkg-allow-builds`, `pkg-minimum-release-age` and
      `pkg-catalog-range` with fixtures and a unit test each.
- [ ] Ship the workspace, npmrc, CI, Docker and upgrade templates.
- [ ] Promote the Tier A rule after the corpus gate reports 100%.
- [ ] Write the ADR for the supply-chain policy, since it changes what an
      install is allowed to do.

### Phase 3 - Verification

- [ ] Build the two-package fixture and run a frozen install.
- [ ] Run the Docker snippet with `pnpm fetch` and an offline install.
- [ ] Validate the reference settings against pnpm 12.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Guardrails and assets     | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The Docker question returned both the three integration options and "no
  Docker section". The plan resolves it as: the pnpm steps are documented here
  and the Dockerfile stays in `rule-devops-docker`, which is the reading that
  keeps the no-duplication rule.
- The `pkg-minimum-release-age` rule is prescriptive, so it stays Tier B and
  might never promote: a project can reasonably decide its own freshness window.
- No local article covers pnpm, so the plan anchors only to the official
  documentation.

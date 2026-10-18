# rule-toolchain-parcel - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.
Family contract: `docs/plans/skills/toolchain/bundler-family.md`. This plan
covers only what is Parcel-specific.

Area: toolchain. Order: reverse alphabetical, seventh skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-parcel/SKILL.md`: zero-config, entry point, scripts
  with `npx serve`, `.parcelrc`, features, an environment section, production
  notes, a migration table that includes webpack.
- `docs/plans/skills/toolchain/bundler-family.md` for the shared rules.

Public sources verified in this session:

- Development server, https://parceljs.org/features/development/
- Environment variable inlining, https://parceljs.org/features/node-emulation/
- Targets, https://parceljs.org/features/targets/
- Production, https://parceljs.org/features/production/
- CLI, https://parceljs.org/features/cli/
- Registry metadata for the current release, https://registry.npmjs.org/parcel/latest

Facts that make the current text wrong or out of date:

| Current text                               | Parcel reality                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| "Only `NODE_ENV` is available by default"  | every statically read `process.env.X` is inlined; `@parcel/transformer-js.inlineEnvironment` can whitelist or disable it |
| scripts use `npx serve dist`               | the repository rule is pnpm, so `pnpm dlx serve dist`                                                                    |
| migration table lists webpack              | webpack is removed from the family                                                                                       |
| no dev-server security note                | the server binds all interfaces and allows CORS by default                                                               |
| `package.json#engines` implied for targets | `browserslist` and `targets` are the fields to use                                                                       |
| "Parcel 2+"                                | the current line is 2.16.x                                                                                               |

Local articles: no dedicated Parcel piece exists in
the local article corpus; the single mention found is incidental. The
plan anchors only to the official documentation.

## Decisions

| Question         | Decision                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Scope            | Zero-config and entry, env inlining, dev server, targets, production, CLI, migration                     |
| Version          | Parcel 2.x with a short note on the differences that matter                                              |
| Boundaries       | Parcel-specific only; the family, pnpm and Docker rules are linked                                       |
| Dev server       | Restricted host and `--no-cors` in the default dev script; LAN and CORS are explicit opt-ins             |
| Env inlining     | No secret read in client code; `inlineEnvironment` as an allowlist; `.env` as build source once verified |
| Engines conflict | Targets through `browserslist` and `targets`, never `engines`                                            |
| Production       | Real flags, scope hoisting, `.parcel-cache` in CI, bundle report                                         |
| Assets           | Default transformations plus when to disable them                                                        |
| Scripts          | `pnpm dlx serve dist`, no `npx`                                                                          |
| Delivery         | Plan only now                                                                                            |
| ADR              | Only when a decision is structural                                                                       |

### The `engines` conflict, resolved

`rule-toolchain-pnpm` owns `pkg-no-engines`, which rejects the field in a
`package.json`. Parcel reads `package.json#engines` for Node targets. The
resolution: a Parcel project expresses its browser support with `browserslist`
and the `targets` field, and never adds `engines`. The existing rule stands and
this skill does not add a second copy of it.

## Workstream A - Zero config and entry point

1. `src/index.html` as the entry, with the module script it resolves.
2. A `.parcelrc` only when a custom transformer or optimizer is needed;
   otherwise no configuration file.
3. The entry convention is stated once and not repeated per feature.

## Workstream B - Environment and inlining

1. Parcel inlines every statically read `process.env.X`. A variable read in
   code that ships to the browser is public, whatever its name.
2. No credential is read from `process.env` in client code.
3. `@parcel/transformer-js.inlineEnvironment` is set as an allowlist so only
   the intended names enter the bundle; `false` disables inlining entirely.
4. Dynamic access (`process.env[name]`) is not supported by Parcel and does not
   work.
5. The `.env` loading behavior is verified against the current documentation
   during implementation; the page consulted in this session does not document
   it, so the plan does not assert it.

## Workstream C - Dev server security

1. The default `dev` script carries a restricted host and `--no-cors`.
2. Exposing the server on the LAN is an explicit choice, not the default.
3. The API proxy in `.proxyrc` is the development path that keeps the browser
   same-origin.
4. `--https` is documented for the cases that need it.
5. The family rule `bundler-dev-not-exposed` owns the policy; this section only
   shows the Parcel flags.

## Workstream D - Targets

1. `browserslist` is the browser target.
2. The `targets` field names named targets and their `distDir` or `engines`
   entries when a project needs more than one output.
3. `engines` is never used; see the conflict above.

## Workstream E - Production

1. `parcel build` enables minification, tree shaking, image optimization and
   content hashing by default.
2. `--no-optimize` and `--no-source-maps` are documented, with the source-map
   policy coming from the family contract.
3. `--dist-dir` for a non-default output.
4. Scope hoisting is named as the lever that makes tree shaking effective.
5. `.parcel-cache` is cached in CI so builds stay incremental.
6. `--reporter` produces the bundle report when size regresses.

## Workstream F - Assets

Default transformations are described: images, SVG, fonts, and how to exclude a
file from a transformation when it must ship as-is.

## Workstream G - CLI and scripts

`parcel serve`, `parcel watch` and `parcel build` as the three commands. The
preview script uses `pnpm dlx serve dist`; the repository rule forbids `npx`.

## Workstream H - Migration

The table loses the webpack column, because webpack is removed from the family.
A short Vite comparison stays only if it answers a real routing question.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                       | Rejects                                                                 | Tier | Source         |
| ----------------------------- | ----------------------------------------------------------------------- | ---- | -------------- |
| `parcel-env-allowlist`        | client code reading `process.env` with no `inlineEnvironment` allowlist | A    | Node emulation |
| `parcel-no-client-secret-env` | a secret-looking `process.env` name read in client code                 | A    | Node emulation |

Two selected candidates reuse existing rules instead of adding copies:
"Parcel version not pinned" is `pkg-exact-versions` in `rule-toolchain-pnpm`, and
"`engines` used as a Parcel target" is `pkg-no-engines` in the same skill. The
family rules own env exposure, dev host, target, IO, source maps and pinned
dependencies.

## Assets and templates to ship

- `assets/templates/parcel-package.json.md` (scripts, browserslist, targets).
- `assets/templates/parcelrc.md` (when a custom transformer earns it).
- `assets/templates/parcel-ci.md` (build with `.parcel-cache` restored).

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the family contract.
- [x] Verify the Parcel facts, the current release and the inlining behavior.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Correct the environment section: every static `process.env` is inlined,
      and the allowlist is the control.
- [ ] Add the dev-server security section with the Parcel flags.
- [ ] Replace the engines usage with `browserslist` and `targets`.
- [ ] Add the production flags, scope hoisting and CI cache.
- [ ] Describe the default asset transformations and their exclusion.
- [ ] Replace `npx` with `pnpm dlx` in the scripts.
- [ ] Remove the webpack column from the migration table.
- [ ] Correct the version reference to the 2.x line.

### Phase 2 - Guardrails and assets

- [ ] Implement `parcel-env-allowlist` and `parcel-no-client-secret-env` with
      fixtures and a unit test each.
- [ ] Index `pkg-exact-versions` and `pkg-no-engines` rather than duplicating
      them.
- [ ] Ship the package, parcelrc and CI templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Parcel inlining policy, since it changes what may
      reach the browser bundle.

### Phase 3 - Verification

- [ ] Build the fixture with `parcel build` and assert `dist/`.
- [ ] Test what `process.env` inlining actually puts in the bundle.
- [ ] Exercise the dev-server flags (`--host`, `--no-cors`).
- [ ] Verify the `.env` loading claim against the current documentation.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The `.env` support is asserted by the current skill but not documented on the
  page consulted; it is a verification task, not a fact the plan relies on.
- No local article covers Parcel, so the plan anchors only to the official
  documentation.

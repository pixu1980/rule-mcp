# Bundler family - shared contract (Vite, Rspack, Parcel)

Status: `planned`
Notes:`planned` Notes: plan only. Cross-skill plan, not tied to a single skill file. Owner when implemented: `rule-toolchain` (the router), inherited by every toolchain skill through `inherits`. Per-bundler plans: `rule-toolchain-vite` (this pass), `rule-toolchain-rspack`, `rule-toolchain-parcel`. Webpack is removed from the family entirely: no guidance, not even a migration section.

## Evidence base

Verified in this session:

- Vite 8.1 (Vite 8 shipped March 2026) is Rolldown-powered, needs Node
  20.19+ or 22.12+, ships lightningcss for CSS minification, and documents
  `build.rolldownOptions`; https://vite.dev/blog/announcing-vite8 and
  https://vite.dev/config/build-options
- Vite `server.host` defaults to `localhost` and `server.allowedHosts` exists
  after the dev-server host vulnerability;
  https://vite.dev/config/server-options
- Rspack `devServer.allowedHosts` mirrors Django `ALLOWED_HOSTS`, `'all'` is
  explicitly not recommended, and `target` defaults to `browserslist` when the
  project configures it, otherwise `web`; https://rspack.rs/config/dev-server
  and https://rspack.rs/config/target
- Rspack exposes selected `process.env` values through `EnvironmentPlugin`;
  https://rspack.rs/plugins/environment-plugin.md
- Parcel inlines `process.env` properties into bundles and its dev server
  accepts connections on all interfaces with cross-origin requests allowed by
  default; https://parceljs.org/features/node-emulation/ and
  https://parceljs.org/features/development/
- Parcel targets come from `package.json` targets, `browserslist` and engines;
  https://parceljs.org/features/targets/

## Decisions

| Question     | Decision                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Family owner | `rule-toolchain`; the bundler skills index the shared rules                                                                   |
| Shared rules | Public-variable secrets, dev-server exposure, pinned verified deps, declared target, declared entry/output, sourcemap policy |
| Webpack      | Removed entirely                                                                                                             |
| Plan shape   | This family document plus one specific plan per bundler                                                                      |
| Delivery     | Plan only now                                                                                                                |

## Shared contract

Each row is one family rule, with the mechanism in each bundler. The rule is
written once here; the bundler skills point at it.

| Rule                              | Vite                                                                                   | Rspack                                                          | Parcel                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| No secret in a public variable    | only `VITE_` reaches the client; never prefix a secret                                 | `EnvironmentPlugin` whitelists the names that reach the bundle  | any statically read `process.env.X` is inlined, so the name is a decision                          |
| Dev server not exposed by default | `server.host` localhost; `host: true` needs `server.allowedHosts`                      | `devServer.host` with `devServer.allowedHosts`; never `'all'`   | the server binds all interfaces and allows CORS by default: restrict with `--host` and `--no-cors` |
| Browser target declared           | `build.target` defaults to `baseline-widely-available`                                 | `target` defaults to `browserslist` when configured, else `web` | `browserslist` and `package.json#engines`                                                          |
| Entry and output declared         | `build.rolldownOptions.input`, `build.outDir`, `base`                                  | `entry`, `output.path`, `output.publicPath`                     | `package.json#targets.*.source` and `distDir`                                                      |
| Sourcemap policy                  | `build.sourcemap` defaults to false; enable where the project can store them           | `devtool` per mode, chosen deliberately                         | `--no-source-maps` / target source maps                                                            |
| Pinned, verified deps             | indexed from `rule-toolchain-pnpm` (`pkg-exact-versions`, `verified-dependencies-only`) | same                                                            | same                                                                                               |

## Proposed family guardrails

Owned by `rule-toolchain`, inherited by the bundler skills. Advisory first, then
blocking after 100% precision and recall.

| Rule id                    | Rejects                                                                                           | Tier | Source                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| `bundler-no-public-secret` | a public prefix on a secret-looking name (`VITE_*_SECRET`, `RSPACK_*_TOKEN`, `PARCEL_*_PASSWORD`) | A    | Vite env docs; Parcel env docs                            |
| `bundler-dev-not-exposed`  | a dev server on all interfaces with no allowlist                                                  | A    | Vite server options; Rspack dev-server; Parcel dev server |
| `bundler-target-declared`  | a build with no declared browser target                                                           | B    | Vite target; Rspack target; Parcel targets                |
| `bundler-io-declared`      | a build with no explicit entry or output                                                          | B    | Bundler docs                                              |
| `bundler-sourcemap-policy` | source maps on in production without an explicit decision                                         | B    | Vite build options                                        |

## Dependency graph

A cross-skill contract: the three bundler leaves inherit it and it depends on nothing but the prose rules.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-toolchain-vite`, `rule-toolchain-rspack`, `rule-toolchain-parcel` (HARD)

Shared files: tests/fixtures/census.json, docs/adr/ADR.md

## Phases

The family cannot be implemented before its owner exists in the plan order.

- [x] Verify the bundler facts and the shared mechanisms.
- [x] Interview the owner and record the decisions.
- [x] Write the family contract.
- [ ] When `rule-toolchain` (skill 14) is planned, move this contract into its
      plan and wire `inherits` for the toolchain skills.
- [ ] Implement the family guardrails in `rule-toolchain`.
- [ ] Confirm each bundler plan points here instead of restating a row.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step           | Class       | Model         | Why                                            |
| -------------- | ----------- | ------------- | ---------------------------------------------- |
| the whole plan | `T7-author` | `qwen3.8-max` | a shared contract three bundler leaves inherit |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- Parcel has no public variable prefix by default, which makes the secret rule
  the strictest there: the plan asks for an explicit allowlist of inlined names
  rather than a naming convention alone.
- Rspack `EnvironmentPlugin` and Parcel `process.env` inlining are the two
  places where a name that looks public can carry a secret, which is why the
  rule checks the name in all three bundlers.

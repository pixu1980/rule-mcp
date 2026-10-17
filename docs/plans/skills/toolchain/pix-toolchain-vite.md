# rule-toolchain-vite - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.
Family contract: `docs/plans/skills/toolchain/bundler-family.md` (Vite, Rspack,
Parcel; webpack removed). This plan covers only what is Vite-specific.

Area: toolchain. Order: reverse alphabetical, third skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-vite/SKILL.md` (75 lines): config example with
  `server.host: true` and `build.target: "es2022"`, a full `vitest.config.ts`
  block, env rules, build optimization bullets, test setup notes.
- `skills/rule-toolchain/SKILL.md` (router, describes the skill as "Vite 8 +
  Rolldown").
- `skills/rule-toolchain-pnpm/guardrails/` (`pkg-exact-versions`,
  `verified-dependencies-only`, `pkg-no-corepack`, `pkg-no-engines`).

Public sources verified in this session:

- Vite 8 announcement, https://vite.dev/blog/announcing-vite8
- Vite build options, https://vite.dev/config/build-options
- Vite server options, https://vite.dev/config/server-options
- Vite env and modes, https://vite.dev/guide/env-and-mode
- Vite blog index (Vite 8.1, June 2026), https://vite.dev/blog
- Rolldown advanced chunks, https://rolldown.rs/in-depth/advanced-chunks

Facts that make the current text out of date:

| Current text             | Vite 8 reality                                             |
| ------------------------ | ---------------------------------------------------------- |
| `build.target: "es2022"` | default is `baseline-widely-available` (chrome111, edge111, firefox114, safari16.4, ios16.4 for this major) |
| `build.minify: "esbuild"` | the build runs on Rolldown and Oxc; CSS minification is lightningcss by default |
| `manualChunks`           | Rolldown deprecates it in favor of `advancedChunks`        |
| `server.host: true`      | `server.host` defaults to `localhost`; exposure needs `server.allowedHosts` after the dev-server host vulnerability |
| full `vitest.config.ts`  | duplicated from `rule-devops-testing`                       |

Local articles: no dedicated Vite article exists in
`~/Downloads/articles to check/`. The tangential mentions are formatting tools
(Oxfmt, VoidZero) and a TypeScript-versus-JavaScript piece. The claim that
"oxlint is the default linter in Vite 8" does not appear in the official
release announcement and is not used.

## Decisions

| Question          | Decision                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| Scope             | Config baseline, env and secrets, build performance, dev security, library and SSR, plugin policy |
| Boundaries        | Vite keeps build and env only; the test config moves to `rule-devops-testing` |
| Version           | Pinned to Vite 8 plus Rolldown, with an upgrade section                  |
| `server.host`     | `localhost` by default; `host: true` only with an explicit `server.allowedHosts` |
| Env               | No secret with the `VITE_` prefix, `envPrefix` documented, `vite-env.d.ts` typing, mode precedence |
| `build.target`    | Keep the Baseline default; overrides documented                      |
| Chunking          | `advancedChunks` with a `manualChunks` compatibility note                |
| Dev security      | `server.allowedHosts`, restricted `server.fs.allow`, proxy instead of CORS |
| Plugins           | Official or verified and pinned; prefer native/Oxc plugins; check Rollup compatibility |
| Test config       | Removed, links to `rule-devops-testing`                                   |
| Pinned build deps | Reuses the pnpm rules, no new id                                         |
| Delivery          | Plan only now                                                            |
| ADR               | Only when a decision is structural                                       |

## Workstream A - Config baseline

The reference `vite.config.ts` becomes:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // localhost by default; expose only with server.allowedHosts
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // target defaults to baseline-widely-available
    rolldownOptions: {
      output: {
        // advancedChunks replaces manualChunks in Rolldown
      },
    },
  },
});
```

Rules:

1. Do not override `build.target` without a documented reason.
2. Do not set `build.minify` to a legacy minifier; the current major defaults
   are the intended ones.
3. `build.rolldownOptions` is the canonical build hook; `rollupOptions` stays
   as the compatibility alias and is not used in new configs.
4. `build.sourcemap` is false by default; enable it where the project can store
   and protect the maps.

## Workstream B - Environment and secrets

1. Only non-secret values carry the `VITE_` prefix; anything with that prefix
   is bundled into the client and publicly visible.
2. `envPrefix` is documented, including that changing it widens what reaches
   the client.
3. `vite-env.d.ts` types `import.meta.env`; runtime validation stays with Zod
   at the boundary.
4. Mode precedence: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`,
   with `.env.local` gitignored and `.env.example` tracked.

## Workstream C - Build performance and code splitting

1. `advancedChunks` for vendor splitting, with the deprecated `manualChunks`
   noted once and not shown in new examples.
2. `build.modulePreload` stays on its default; the polyfill is disabled only
   for a project that targets modern browsers and measures the change.
3. `assetsInlineLimit` and `cssCodeSplit` are described with their defaults,
   not restated as rules.

## Workstream D - Dev-server security

1. `server.host` is `localhost` unless the project needs LAN access.
2. Exposing the server requires an explicit `server.allowedHosts` list; `all`
   is never the answer.
3. `server.fs.allow` stays restricted to the project root.
4. The API proxy is the default for development so the browser stays
   same-origin; CORS in development is the exception.

## Workstream E - Library mode and SSR

`build.lib` and the SSR entry get their own short section with the
externalization rules, so a library build does not accidentally bundle its peer
dependencies.

## Workstream F - Plugin policy

1. Official or verified plugins, pinned by exact version.
2. Prefer native/Oxc-backed plugins where they exist.
3. Confirm Rollup API compatibility on every plugin before a major upgrade.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                 | Rejects                                                        | Tier | Source                       |
| ----------------------- | -------------------------------------------------------------- | ---- | ---------------------------- |
| `vite-no-public-secret` | a `VITE_*` name that is a secret (`_SECRET`, `_TOKEN`, `_PASSWORD`, `_KEY`) | A | Vite env docs          |
| `vite-host-local`       | `server.host: true` or `0.0.0.0` with no `server.allowedHosts`  | A    | Vite server options          |

Pinned build dependencies are covered by the existing
`pkg-exact-versions` and `verified-dependencies-only` rules in
`rule-toolchain-pnpm`; this plan indexes them instead of adding a third copy.
`build.target` overrides stay a guidance rule, not a guardrail, because a
justified override is legitimate.

## Assets and templates to ship

- `assets/templates/vite.config.ts` (Vite 8, safe defaults).
- `assets/templates/vite-env.d.ts` and `.env.example`.
- `assets/templates/upgrade-vite7-to-vite8.md` (Rolldown, `rollupOptions`,
  `@vitejs/plugin-react` v6, Node 20.19+/22.12+).

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the pnpm rules.
- [x] Verify the Vite 8 facts and the family mechanisms.
- [x] Interview the owner and record the decisions.
- [x] Create this plan, the family plan and the index entry.

### Phase 1 - Content

- [ ] Replace the config baseline with the Vite 8 reference.
- [ ] Rewrite the env section with the secret rule and the mode precedence.
- [ ] Rewrite the build section around `advancedChunks` and the defaults.
- [ ] Add the dev-security, library/SSR and plugin sections.
- [ ] Remove the `vitest.config.ts` block and link `rule-devops-testing`.
- [ ] Add the Vite 7 to 8 upgrade section.

### Phase 2 - Guardrails and assets

- [ ] Implement `vite-no-public-secret` and `vite-host-local`.
- [ ] Add good and bad fixtures and a unit test per rule.
- [ ] Ship the config, env and upgrade templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Vite 8 baseline and the bundler-family contract,
      since the family ownership is a structural decision.

### Phase 3 - Verification

- [ ] Build the fixture project with the reference config and confirm it
      produces `dist/`.
- [ ] Load the reference config in a test so a removed option fails the suite.
- [ ] Check every option named in the skill against the live Vite docs.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The family contract lives in `bundler-family.md`; this skill must point at it
  and not restate a row, per the no-duplication rule.
- The `advancedChunks` shape will be confirmed against rolldown.rs during
  implementation; the plan does not freeze an object literal it cannot verify.
- No local article covers Vite, so this plan anchors only to the official docs
  and the Rolldown documentation.

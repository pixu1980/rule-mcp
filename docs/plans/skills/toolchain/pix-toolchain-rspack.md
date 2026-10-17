# rule-toolchain-rspack - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.
Family contract: `docs/plans/skills/toolchain/bundler-family.md`. This plan
covers only what is Rspack-specific.

Area: toolchain. Order: reverse alphabetical, fifth skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-rspack/SKILL.md`: config example with
  `builtins.html`, `experiments.css` and `target: "es2022"`; CSS strategy,
  splitChunks guidance, type checking, assets, profiling, migration 1.x to 2.x,
  source-map security.
- `skills/rule-toolchain-vite/SKILL.md` and the family plan for the shared rules.
- `skills/rule-styleguide-typescript/COMPILER.md` for the TypeScript baseline.

Public sources verified in this session:

- Rspack CLI, https://rspack.rs/api/cli
- HtmlRspackPlugin, https://rspack.rs/plugins/html-rspack-plugin
- Target, https://rspack.rs/config/target
- Dev server and `allowedHosts`, https://rspack.rs/config/dev-server
- Environment and Define plugins, https://rspack.rs/plugins/environment-plugin.md
- Rspack 1.x to 2.x migration, https://rspack.rs/guide/migration/rspack_1.x

Facts that make the current text out of date:

| Current text                       | Rspack 2.x reality                                            |
| ---------------------------------- | ------------------------------------------------------------ |
| `builtins: { html: [...] }`        | replaced by `new rspack.HtmlRspackPlugin({...})`              |
| `experiments: { css: true }`       | `experiments.css` is removed; CSS works by default and `module.rules` selects `type: "css"` or `"css/module"` |
| `target` default `es2022`          | default is `browserslist` when configured, otherwise `web`    |
| `sourcemap: true` for production   | the option is `devtool`; production maps are a policy choice  |
| `--analyze` and the built-in analyzer | removed from `@rspack/cli` in 2.x; use an external analyzer  |
| CommonJS package output            | 2.x packages are pure ESM                                     |

Local articles: no dedicated Rspack piece exists in
`~/Downloads/articles to check/`; the mentions found are incidental (NestJS
ESM, TypeScript versus JavaScript). Context only, no citation.

## Decisions

| Question      | Decision                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Scope         | Baseline config, CSS, split, type checking and assets, profiling, migration, source maps |
| Version       | Rspack 2.x, with a 1.x compatibility note                                |
| Boundaries    | Rspack-specific config only; the family, TypeScript, pnpm and Docker rules are linked |
| CSS           | CSS Modules, lightningcss, Sass/Less, CssExtractRspackPlugin             |
| Split         | Keep the current rules and add route and vendor examples                 |
| Dev server    | Link the family rule and show only the Rspack `allowedHosts` syntax      |
| Type checking | `ts-checker-rspack-plugin` plus `tsc --noEmit` in CI, with a decision rule |
| Assets        | Asset modules; import from `src`, `public` only for absolute URLs        |
| Profiling     | Keep, verified and reduced to what still exists in 2.x                   |
| Delivery      | Plan only now                                                            |
| ADR           | Only when a decision is structural                                       |

The CSS baseline is the documented default: Rspack processes CSS with no
`experiments` flag, and the selected variants (CSS Modules, lightningcss,
preprocessors, extraction) are configured through `module.rules` and plugins
on top of it.

## Workstream A - Baseline configuration

1. `rspack.config.mjs`, written as pure ESM to match the 2.x packages.
2. `HtmlRspackPlugin` replaces `builtins.html`.
3. `target` is declared only when the project deviates from the default; the
   default is `browserslist` when configured, otherwise `web`.
4. `devtool` is the source-map option: `false` in production unless the project
   stores maps privately, a development value otherwise.
5. `output.path` and `output.publicPath` are declared explicitly, as the family
   contract requires.

## Workstream B - CSS strategy

1. **Default.** CSS is available with no flag; `type: "css"` in `module.rules`
   is the baseline the other options build on.
2. **CSS Modules.** `type: "css/module"` for `*.module.css`.
3. **Compatibility.** `builtin:lightningcss-loader` for syntax downgrade and
   vendor prefixing.
4. **Preprocessors.** Sass and Less through their loaders, only when the
   project already uses them.
5. **Extraction.** `CssExtractRspackPlugin` for the production build, so the
   styles arrive as files instead of injected style tags.
6. Tailwind, if used, goes through its PostCSS plugin; no Vite-specific path is
   presented as the Rspack one.

## Workstream C - Code splitting

Keep the existing rules, which are correct: `chunks: "all"`, `maxSize` before
broad vendor buckets, keep the default cache groups, and leave `name` unset in
favor of `idHint`. Add two examples: one route-level dynamic import and one
vendor group justified by cache reuse. Repeat the warning that `splitChunks`
changes chunk topology only.

## Workstream D - Type checking

Decision rule: `ts-checker-rspack-plugin` in development for fast feedback,
`tsc --noEmit` as the CI gate. A project that wants one mechanism uses `tsc`;
the plugin never replaces the gate.

## Workstream E - Assets

Asset modules over legacy loaders, imports from `src` for source-managed files,
and `public` referenced by absolute URL path only. `assetModuleFilename` is
declared when hashed names matter.

## Workstream F - Profiling and debugging

Reduce the section to what 2.x still supports: `RSPACK_PROFILE=TRACE` with
`RSPACK_TRACE_LAYER` and `RSPACK_TRACE_OUTPUT`, and the trace analysis script.
The debug package setup and the LLDB recipe leave the skill unless a current
source documents them.

## Workstream G - Source maps and security

Production maps are a decision: `devtool: false` by default, or a value that
emits maps only when they are stored privately. `.map` files are never served
publicly from a CDN without an access decision.

## Workstream H - Migration 1.x to 2.x

1. Packages are pure ESM in 2.x.
2. `--analyze` and the built-in analyzer are gone.
3. `experiments.css` is gone; CSS is default.
4. `output.charset`, `module.unsafeCache`, `strictExportPresence` and
   `optimization.removeAvailableModules` are removed.
5. `experiments.pureFunctions` is the new opt-in for function-level tree
   shaking.

The Lerna/Nx section does not belong here; bundler migration from webpack stays
out of the family because webpack is removed.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                       | Rejects                                             | Tier | Source            |
| ----------------------------- | --------------------------------------------------- | ---- | ----------------- |
| `rspack-no-experiments-css`   | `experiments: { css: ... }`                         | A    | Migration 1.x to 2.x |
| `rspack-html-plugin`          | `builtins.html`                                     | A    | HtmlRspackPlugin  |
| `rspack-devtool-not-sourcemap`| a `sourcemap` key in the Rspack config              | A    | Configuration reference |
| `rspack-no-bundler-analyzer`  | `--analyze` or `webpack-bundler-analyzer`           | B    | Migration 1.x to 2.x |

The family guardrails own env secrets, dev-server exposure, target, IO,
source maps and pinned dependencies; this skill indexes them instead of adding
a second copy.

## Assets and templates to ship

- `assets/templates/rspack.config.mjs` (2.x, ESM, HtmlRspackPlugin, CSS,
  splitChunks, devtool).
- `assets/templates/upgrade-rspack-1-to-2.md`.
- `assets/templates/rspack-dev-server.md` (`allowedHosts` syntax).

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the family contract.
- [x] Verify the Rspack 2.x facts.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Replace the config baseline with the 2.x ESM reference.
- [ ] Rewrite the CSS section around the default and the four variants.
- [ ] Add the route and vendor split examples.
- [ ] Add the type-check decision rule.
- [ ] Keep and verify the asset section.
- [ ] Reduce the profiling section to the supported commands.
- [ ] Rewrite the migration section for 1.x to 2.x.
- [ ] Link the family rules instead of restating them.

### Phase 2 - Guardrails and assets

- [ ] Implement the four rules with fixtures and a unit test each.
- [ ] Ship the config, upgrade and dev-server templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Rspack 2.x baseline, since dropping the removed
      options is a structural decision.

### Phase 3 - Verification

- [ ] Build the fixture with `rspack build` and assert `dist/`.
- [ ] Validate the reference config against the 2.x schema.
- [ ] Check every option named in the skill against the live documentation.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The CSS baseline (`type: "css"`) was not selected in the interview, but it is
  the documented default the selected variants build on, so the plan states it
  as the prerequisite rather than a new decision.
- No local article covers Rspack, so the plan anchors only to the official
  documentation.

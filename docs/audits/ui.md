# ui audit

- **Role**: ui v2
- **Date**: 2026-10-12
- **Scope**: Review the documentation UI at localhost:3001 after closing one duplicate preview server; the request specified no further review criteria.

Evidence for the documentation-site UI served at `http://127.0.0.1:3001/`. The request ends in `con` without further criteria; no additional evaluation criteria were assumed. No UI source was modified.

## Evidence

| Measure                | Command or source                                                                                                       | Observed output                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run date               | `date -u +%F`                                                                                                           | `2026-10-12`                                                                                                                                                                                                                      |
| Initial local servers  | `lsof -nP -iTCP:3001 -sTCP:LISTEN`; same command for `3002`; `curl -sI` on both URLs                                    | Node PID `49548` listening at `3001`, Node PID `16023` at `3002`; both answered `HTTP/1.1 200 OK`.                                                                                                                                |
| Server cleanup         | `kill 16011 16023`; repeat `lsof` for `3001` and `3002`; `curl -fsSI http://127.0.0.1:3001/`                            | `3001` still listened under PID `49548` and answered `HTTP/1.1 200 OK`; no listener remained at `3002`.                                                                                                                           |
| Existing browser tests | `pnpm test:e2e:docs-site`                                                                                               | exit `0`; `11 passed (26.6s)`, including axe-core light/dark checks, layout, keyboard, reflow and contrast tests. These tests build an isolated temporary site, not the live preview.                                             |
| Live local links       | Playwright Chromium GET of same-origin links from `/`, `/docs/getting-started.html`, `/docs/README.html`                | `checked: 30`, `brokenCount: 0`; this is a subset, not a whole-site link audit.                                                                                                                                                   |
| Live responsive home   | Playwright Chromium at `1440×900`, `768×900`, `320×800` against `3001`                                                  | body scroll widths match viewport (`1440`, `768`, `320`); header heights (`72`, `72`, `218`) CSS px respectively; home title `rule-mcp · rule-mcp`. Screenshots: `/tmp/rule-ui-desktop.png`, `/tmp/rule-ui-mobile.png`. |
| Site source            | `scripts/docs-site/_shell.mjs`, `style.css`, `_nav.mjs`, `prefs.js`, `transitions.js`; `tests/e2e/docs-site/*.test.mjs` | HTML generator emits skip link and focused `<main>`, primary nav and optional Reference nav; site uses external CSS and vanilla JavaScript, not a React/Vue/Svelte/Angular/Solid component runtime.                               |

## Graph evidence (scope: documentation site)

These are TokenSave graph estimates, not measured browser behavior. Tools without path filtering were read only to identify whether they had results in the UI scope.

| TokenSave tool and arguments                                                                                              | Returned output                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokensave_context({task:<exact scope>,keywords:["docs-site","serve","buildSite","style","index.html","accessibility"]})` | `scripts/docs-site/build.mjs` `buildSite` and `scripts/docs-site/_shell.mjs` `layout` appeared; Italian scope terms were not indexed, so matching relied on the UI/site keywords. |
| `tokensave_files({path:"scripts/docs-site",format:"flat"})`                                                               | Files include `_shell.mjs`, `style.css`, `prefs.js`, `transitions.js`, `build.mjs`, `serve.mjs` and site tests.                                                                   |
| `tokensave_health({path:"scripts/docs-site"})`                                                                            | `quality_signal: 8924`, `files_analyzed: 14`; acyclicity `1.0`, depth `1.0`, equality `0.6637`, redundancy `0.9592`, modularity `0.8889`.                                         |
| `tokensave_dsm({path:"scripts/docs-site",format:"stats"})`                                                                | `files: 14`, `edges: 11`, `density: 0.0604`, `clusters: 2`, `largest_cluster: 12`; no layering-violation count in returned stats.                                                 |
| `tokensave_dependency_depth({path:"scripts/docs-site",limit:2})`                                                          | `max_depth: 4`, `ideal_depth: 4`; longest reported chain runs from `serve.mjs` to `_pages.mjs`.                                                                                   |
| `tokensave_gini({path:"scripts/docs-site",metric:"complexity",scope:"file",limit:3})`                                     | `gini: 0.4102`; outlier `prefs.js` value `39.0`.                                                                                                                                  |
| `tokensave_coupling({path:"scripts/docs-site",direction:"fan_in",limit:4})`                                               | `build.mjs` has `4` dependent files.                                                                                                                                              |
| `tokensave_hotspots({path:"scripts/docs-site",limit:4})`                                                                  | `hotspot_count: 0` under the graph's hotspot criteria.                                                                                                                            |
| `tokensave_imports({depth:3})`; `tokensave_circular({})`                                                                  | Module imports report `cycle_count: 0` at depth `3`; file-level circular tool reports `4` cycles, none in `scripts/docs-site`.                                                    |
| `tokensave_impact({node_id:"function:eff383d3c01f884f14b144a735a773b3"})`                                                 | `buildSite` impact: `node_count: 2`, `edge_count: 1`.                                                                                                                             |
| `tokensave_callers({node_id:"function:eff383d3c01f884f14b144a735a773b3"})`; `tokensave_callees` with same ID              | Caller `serve.mjs`; callees include `collectPages`, `layout`, `rewriteLinks`.                                                                                                     |
| `tokensave_file_dependents({file:"scripts/docs-site/_shell.mjs"})`                                                        | `count: 1`, dependent `scripts/docs-site/build.mjs`.                                                                                                                              |
| `tokensave_affected({files:["scripts/docs-site/_shell.mjs","scripts/docs-site/style.css"]})`                              | Graph `count: 1` and suggests a template-engine test outside the docs site; the targeted `tests/e2e/docs-site` suite above is the observed UI test suite.                         |
| `tokensave_test_map({file:"scripts/docs-site/build.mjs"})`; `tokensave_test_coverage` for same file                       | Graph lists `covered_symbols: 1`, `uncovered_symbols: 1` and `tested: 1` of `2` production functions. This static graph is not the e2e result above.                              |
| `tokensave_test_risk({path:"scripts/docs-site",limit:4})`                                                                 | Top graph risk: `markdownUnder` in `_collect.mjs`, `risk: 44.38`; graph summary `tested: 1` of `36` functions, `coverage_pct: 3.0`.                                               |
| `tokensave_branch_list({})`; `tokensave_branch_search({branch:"develop",query:"layout"})`                                 | Branch list has `main` (current), `develop`, `perf/meta-surface`; `develop` search has `layout` in `scripts/docs-site/_template.mjs`.                                             |
| `tokensave_branch_diff({base:"main",head:"develop",file:"scripts/docs-site/_shell.mjs"})`                                 | Stored-branch symbol summary `added: 0`, `removed: 9`, `changed: 0`.                                                                                                              |
| `tokensave_session_recall({query:"UI OR docs",limit:3})`; `tokensave_session_start({})`; `tokensave_session_end({})`      | Recall returned prior docs decisions; health baseline `8504` and end `8504` (`delta: 0`, `pass: true`). These totals cover the project graph and were not used to rate this UI.   |

## Skip navigation

- `scripts/docs-site/_shell.mjs` emits `<a href="#main">Skip to content</a>` and `<main id="main" tabindex="-1">`. `style.css` has `body > header { position: sticky; top: 0; }` and no scroll offset for `main` or `#main`.
- Playwright Chromium at `320×800` on `/docs/README.html`: Tab focused the skip link; Enter focused `MAIN` and set `location.hash` to `#main`; `scrollY: 442`, `mainTop: 0`, `headingTop: 47`, `headingBottom: 88`, `headerBottom: 218` CSS px. Screenshot: `/tmp/rule-ui-skip-mobile.png`. At `768×800`, `headingTop: 47`, `headerBottom: 72`; at `1440×800`, `headingTop: 53`, `headerBottom: 72`.
- `tests/e2e/docs-site/behaviour.test.mjs` checks that the skip link is first and `main` gets focus but does not compare the heading with the sticky header. W3C WAI [Understanding Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), fetched 2026-10-12, discusses sticky headers and recommends scroll padding; this audit does not assert a WCAG failure for a partially visible focused `main`.

## Mobile navigation

- Playwright Chromium at `320×800` on `/docs/README.html`: sticky primary header height `218` CSS px, Reference nav height `223` CSS px, `mainTop: 442`, and body scroll width `320` CSS px. After `scrollTo(0,800)`, header remains at viewport `top: 0`, `bottom: 218` CSS px. Screenshot: `/tmp/rule-ui-reference-mobile.png`.
- `_nav.mjs` defines primary navigation to Home, Getting Started and Reference, plus a Reference submenu with Overview, Architecture, Surface map, Instructions, Prompts, Guardrails, Personas, Resources, CLI and Env vars. CSS allows both navigation lists to wrap.

## Preference storage

- `prefs.js` `bind()` change handler executes `writePrefs(next)` before `applyPrefs(next)`, while `readPrefs()` catches storage read errors and `writePrefs()` does not catch write errors.
- Playwright Chromium with `Storage.prototype.setItem` overridden to throw `DOMException('Storage blocked','QuotaExceededError')`: after checking Dark, the page reports `errors:["Storage blocked"]`, `theme:"system"`, `darkChecked:true`.

## Preference feedback

- `prefs.js` applies `prefs.motion === "reduce"` as `document.documentElement.dataset.motion = "reduce"`; `syncSummary()` composes the closed summary from only theme and contrast.
- Playwright Chromium on the live home page: after selecting Reduce motion, `label:"Preferences"`, `motion:"reduce"` and stored value `{"motion":"reduce"}`; after selecting More contrast, `label:"Preferences · more contrast"`, `contrast:"more"`.

## Content hierarchy

- Playwright Chromium live home page reports `title:"rule-mcp · rule-mcp"`, while `/docs/README.html` reports `title:"Reference · rule-mcp"`. `_shell.mjs` renders `<title>${escapeHtml(title)} · rule-mcp</title>`.
- `_shell.mjs` emits a footer with `Generated from docs/, edit the Markdown, not this file.`; the same text is visible on the home-page screenshot `/tmp/rule-ui-desktop.png`. Home has `6` links within `main` in the inspected desktop and mobile viewports.

## Layout rules

- `scripts/docs-site/style.css` has named grid areas for the home two-column arrangement and auto-fit tracks for flow/cards. Its architecture step numeral and home flow numeral use `display: grid; place-items: center` to center a single numeral (`rg -n 'display: grid|place-items: center' scripts/docs-site/style.css` returned grid at lines `389–390` and `669–670` for those counters).
- `skills/rule-ui/SKILL.md` and `skills/rule-ui-design-system/SKILL.md` require flex first; grid is reserved for named areas, subgrid, explicit placement and auto-fit tracks.

## External source

- W3C WAI [Understanding Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), fetched 2026-10-12: advises keeping focused content visible when sticky headers overlap it; the AA criterion concerns an entirely obscured focused UI component.

## Out of scope observations

- `tokensave_circular({})` reported file cycles outside `scripts/docs-site`; this review did not investigate them.

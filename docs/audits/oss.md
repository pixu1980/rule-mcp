# oss audit

- **Role**: oss v1
- **Date**: 2026-10-12

Snapshot of the local `main` checkout. Commands below were executed on a working tree with pending changes; repository-host settings, donor balances, and live issue/PR response times were not verified. A graph metric is a static graph estimate, not runtime coverage.

## Evidence

| What was measured         | Command or file read                                                                                                                                                                                                                   | Output or observation                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Date and runtime          | `date -u +%F; node --version; pnpm --version`                                                                                                                                                                                          | `2026-10-12`; `v24.21.0`; `12.11.2`                                                                                                      |
| Project and release       | `node -p 'JSON.stringify({name:require("./package.json").name,version:require("./package.json").version,private:require("./package.json").private,repository:require("./package.json").repository})'`; `rg -n '"version"' server.json` | `rule-mcp`, `0.1.0`, `private:false`, `github:pixu1980/rule-mcp`; `server.json` reports `0.1.0`                              |
| Checkout status           | `git branch --show-current; git status --porcelain                                                                                                                                                                                     | wc -l`                                                                                                                                   | `main`; `32` changed/untracked paths before this run's generated documents |
| Release tag               | `git tag -l 'v*'`                                                                                                                                                                                                                      | `v0.1.0`                                                                                                                                 |
| Existing tag verification | `git tag -v v0.1.0`                                                                                                                                                                                                                    | exit `1`: `error: no signature found`                                                                                                    |
| DCO hook installation     | `git config --get core.hooksPath; pnpm hooks:check`                                                                                                                                                                                    | `/Users/emilianopisu/.config/git/hooks`; `git hooks: 3 installed and current`                                                            |
| Local smoke test          | `pnpm test`                                                                                                                                                                                                                            | exit `0`: `All checks passed`                                                                                                            |
| Local lint                | `pnpm lint`                                                                                                                                                                                                                            | exit `1`: `57 problems (21 errors, 36 warnings)`                                                                                         |
| Catalog snapshot          | `pnpm census:check`                                                                                                                                                                                                                    | exit `1`: `stale, run pnpm census: docs/02-architecture.md, docs/05-env-variables.md, tests/fixtures/census.json`                        |
| Changelog                 | `CHANGELOG.md`; `.github/workflows/ci.yml`; `.github/workflows/release.yml`                                                                                                                                                            | The changelog says it is generated from commits; CI has a release-preview changelog check and the release job extracts the tagged entry. |

## Graph health (TokenSave)

All commands in this table are TokenSave MCP tools against the local graph. The graph includes `case-studies/` and `skills/` as well as the server, and branch snapshots may lag the working tree.

| Tool and arguments                                                         | Returned output                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokensave_health({})`                                                     | `quality_signal: 8506`, `files_analyzed: 2329`; acyclicity `0.9912` (`11` cycle edges), depth `1.0` (`max_chain: 8`), equality `0.4639` (`gini: 0.5361`), redundancy `0.9689` (`132/4251` dead/total functions), modularity `0.9994` |
| `tokensave_dsm({format:"stats"})`                                          | `files: 2329`, `edges: 1247`, `density: 0.0002`, `clusters: 542`, `largest_cluster: 135`; stats output did not report a layering-violation count                                                                                     |
| `tokensave_dependency_depth({limit:3})`                                    | `max_depth: 8`, `ideal_depth: 12`, `depth_score: 1.0`                                                                                                                                                                                |
| `tokensave_gini({metric:"complexity",scope:"file",limit:3})`               | `gini: 0.6645`, `total_items: 2274`; top outlier `src/core/self-update/_run.js` value `55.0`                                                                                                                                         |
| `tokensave_coupling({direction:"fan_in",limit:4})`                         | `src/core/skills/_lru.js: 198` coupled files; `src/transport/session-registry/_registry.js: 32`                                                                                                                                      |
| `tokensave_hotspots({limit:4})`                                            | `src/core/skills/_lru.js` symbol `has`: `253` incoming, `0` outgoing                                                                                                                                                                 |
| `tokensave_circular({})`                                                   | `cycle_count: 4`; cycles include `src/transport/session-registry/_close.js → _reap.js → _registry.js` and `src/core/session/resume/_announce.js → _context.js`                                                                       |
| `tokensave_imports({depth:2})`                                             | `cycle_count: 0` at the grouped-module level; this is not the file-level cycle measure above                                                                                                                                         |
| `tokensave_test_risk({limit:4})`                                           | `src/cli/setup/_use-selection.js` symbol `useSelection` risk `560.94`, `has_test: false`; graph rollup `tested: 39` of `1758`, `coverage_pct: 2.0` (graph reachability, not test-run coverage)                                       |
| `tokensave_impact({node_id:"function:0c369a69660c3c5628d552cef3920ced"})`  | `buildHandoff`: `node_count: 2`, `edge_count: 1`                                                                                                                                                                                     |
| `tokensave_callers({node_id:"function:0c369a69660c3c5628d552cef3920ced"})` | `registerHandoffTool` is a direct caller                                                                                                                                                                                             |
| `tokensave_callees({node_id:"function:0c369a69660c3c5628d552cef3920ced"})` | Calls include `semanticLines`, `featureRangeLines`, `adrLines`, `getGitDiff`                                                                                                                                                         |
| `tokensave_file_dependents({file:"src/tools/handoff/_build.js"})`          | `count: 1`, dependent `src/tools/handoff/_register.js`                                                                                                                                                                               |
| `tokensave_affected({files:["src/prompts/_handoff-prompt.js"]})`           | `count: 1`, graph candidate `src/prompts/__tests__/_handoff-prompt.test.mjs` (verify against the filesystem before running)                                                                                                          |
| `tokensave_test_map({file:"src/tools/handoff/_build.js"})`                 | `covered_symbols: 0`, `uncovered_symbols: 1`                                                                                                                                                                                         |
| `tokensave_test_coverage({file:"src/tools/handoff/_build.js"})`            | `total_prod_fns: 1`, `tested: 0`, `untested: 1`                                                                                                                                                                                      |
| `tokensave_branch_list({})`                                                | `branch_count: 3`: `main` (current), `develop`, `perf/meta-surface`                                                                                                                                                                  |
| `tokensave_branch_search({branch:"develop",query:"handoff"})`              | Results include `HANDOFF_MODES` in `src/prompts/_handoff-options.data.js`                                                                                                                                                            |
| `tokensave_branch_diff({base:"main",head:"develop"})`                      | Symbol summary `added: 1033`, `removed: 4846`, `changed: 138` (stored branch snapshots, not the current uncommitted diff)                                                                                                            |
| `tokensave_session_recall({limit:5})`                                      | Most recent decision concerns default close-feature squash; includes ADR `134`                                                                                                                                                       |
| `tokensave_session_start({})`; `tokensave_session_end({})`                 | Baseline `8506` for `2329` files; re-scan `8506` for `2332` files, delta `0`, `pass: true`                                                                                                                                           |

## Release provenance

- `.github/workflows/release.yml` has `on.push.tags: ["v*"]`, a separate build/verify/release chain, and a step named `Refuse lightweight tags` that runs `test "$(git cat-file -t "${GITHUB_REF_NAME}")" = tag`. No signature verification command occurs in that workflow. `git tag -v v0.1.0` returned `error: no signature found` and exit `1`.
- `CONTRIBUTING.md` says maintainers sign commits and tags and instructs `git tag -s v0.1.0`.
- GitHub Docs, [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), fetched 2026-10-12: signing is distinct from signing off, and cryptographically verifiable tags are marked Verified.

## Version and support

- `package.json` and `server.json` report `0.1.0`; `git tag -l 'v*'` printed `v0.1.0`.
- `SECURITY.md` support table marks `1.0.x` supported and `< 1.0` unsupported; the same file promises private reporting and acknowledgment within 3 business days. The actual GitHub advisory settings were not inspected.

## Conduct and governance

- `GOVERNANCE.md` identifies `pixu1980` as the BDFL and says this person owns repository settings, releases and funding. `MAINTAINERS.md` lists only `pixu1980` as maintainer. `.github/CODEOWNERS` assigns `*` to `@pixu1980`.
- `CODE_OF_CONDUCT.md` names `pisuemiliano.1980@gmail.com` (maintainer address) for reports and says they are escalated to the BDFL on dispute; later it states the moderator is the maintainer first, then the BDFL. `.github/ISSUE_TEMPLATE/config.yml` points to the same private address.
- [Building Welcoming Communities](https://opensource.guide/building-community/), fetched 2026-10-12, recommends public documentation and responsiveness while keeping sensitive conduct and security reports private.

## Contributor path

- `CONTRIBUTING.md` says issues are triaged within 7 days and PRs reviewed within 14 days. `MAINTAINERS.md` lists issues within 2 days and PRs within 7 days. Both are published as current policy; no live GitHub issue timestamps were collected.
- `.github/ISSUE_TEMPLATE/bug.yml`, `feature.yml`, `config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`, `GOVERNANCE.md` and `MAINTAINERS.md` exist. The bug template requires a version and a reproduction; the feature template asks for problem and proposal.

## DCO and license

- `CONTRIBUTING.md` states: `There is no CLA; inbound contributions are licensed under the DCO.` The same page explains that `git commit -s` adds `Signed-off-by`; `LICENSE` points at `LICENSES/MIT.txt` and `REUSE.toml` marks MIT.
- `.githooks/commit-msg` rejects human commits missing a `Signed-off-by` trailer, `.github/workflows/ci.yml` has a `DCO sign-off` job, and `pnpm hooks:check` returned `git hooks: 3 installed and current`.
- GitHub Docs, [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), fetched 2026-10-12, explicitly distinguishes signing from signing off. This audit does not determine legal licensing intent.

## Local quality gates

- On the dirty checkout (see Evidence), `pnpm test` passed smoke checks; `pnpm lint` exited `1` with `57 problems (21 errors, 36 warnings)`; `pnpm census:check` exited `1`, naming `docs/02-architecture.md`, `docs/05-env-variables.md`, `tests/fixtures/census.json`. No clean-checkout CI run was performed here.

## Funding

- `.github/FUNDING.yml` contains `github: pixu1980`. `GOVERNANCE.md` describes the project as unfunded, says the BDFL controls a Sponsors account when created and will report receipts and uses, and states sponsorship buys no roadmap priority. No donor/account data or public reporting cadence/location was verified.

## Discoverability

- `README.md` hero links `docs/01-getting-started.md` and `docs/README.md`, and its cards link the reference and surface map. It does not link `CONTRIBUTING.md`, `GOVERNANCE.md`, `CODE_OF_CONDUCT.md`, `MAINTAINERS.md`, or `SECURITY.md` directly. Those files exist at repository root.

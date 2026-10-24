# 03 - Roadmap execution: OSS phases 1-5, version reset, follow-ups

- **Date**: 2026-09-11
- **Branch**: `perf/meta-surface`
- **Commit range**: `829c368^..c754545` (42 commits, none pushed)
- **Documents**: `docs/plans/oss.md` (plan of record, checkboxes updated per step)

## What this session did

Executed the OSS remediation roadmap code-first across all phases, plus
owner-directed extras. Every step ran TDD (failing test first, true red
verified), `rule-mcp` routing before implementation, `rule_tool_check` before
committing, and Conventional Commits with mandatory scope plus DCO
`Signed-off-by` trailers (active since the Step 5 commit).

- **Setup wizard** (`829c368`, ADR 080): Node/Ink wizard behind
  `rule-mcp setup`, four shell scripts shrunk to bootstraps.
  Closed the earlier install/uninstall complaint: each agent's
  install/uninstall is scoped to that agent only.
- **Phase 1**: Step 12 (drop self `link:` dep), Step 4 (registry install
  claims -> clone path), Step 3 (server.json `io.github.pixu1980`, ADR 081),
  Step 2 code (SECURITY.md private channel; owner clicks 2.1/2.5 open),
  Step 20 (CHANGELOG header + generator preamble), Step 21 (version
  script + package.json fields), Step 18 (holder pixu1980 + AUTHORS).
- **Phase 2**: Step 7 (action SHAs + zizmor workflow), Step 8
  (permissions), Step 9 (dependabot + cooldown; 9.4 closed later via
  CONTRIBUTING text), Step 28 (audit gate), Step 31 (padded tables),
  Step 10 (CodeQL), Step 6 (3-job release pipeline + ADR 082), Step 1
  (manifests, `test:all` 1205/0).
- **Phase 3**: Step 16 (governance + ADR 083), Step 15 (CONTRIBUTING),
  Step 5 (DCO), Step 14 (Covenant 3.0), Step 19 (commit types),
  Step 23 (ROADMAP.md), Step 25 (funding), Step 26 (TRADEMARK + ADR 084).
- **Phase 4**: Step 17 (SPDX on 989 files, REUSE.toml, 1538/1538
  compliant, 3 ADR-061 splits, `test:all` 1209/0).
- **Phase 5**: Step 27 (docs site generator + Pages), Step 11 (tag-pinned
  verified pipe), Step 22 (Scorecard/SBOM via cdxgen), Step 24 (README),
  Step 29 code (signing docs + tag gate).
- **Phase 6**: Step 30 (preserved-controls lens on oss persona).
- **Owner extras**: version reset 1.0.0 -> 0.1.0 (ADR 085, tag v1.0.0
  deleted locally); Step 13 closed as superseded by ADR 080; follow-up
  batch (setup.sh deletion, truthful hints, org fixes, manifest hashes
  in `version --apply`).

## Open queues (owner / CI-observed)

- **Owner clicks**: 2.1/2.5 (vuln reporting), 10.4/16.5 (branch
  protection), 23.3 (labels), 25.4 (Sponsors), 29.2 (Vigilant Mode),
  14.5 (profile check), remote tag v1.0.0 delete (rule-rejected) +
  Release v1.0.0 page delete, npm/registry v0.1.0 publish, Pages enable.
- **CI-observed on push**: 6.6, 7.6, 8.5, 9.5, 10.5, 16.6, 22.4/22.5,
  27.4/27.6, 29.4, 31.3 (server reload re-verify).
- **Uncommitted**: `MAINTAINERS.md` response-time tweak is the owner's
  own edit - left untouched, commit or drop it explicitly.
- **Nothing pushed**: all 42 commits are local on `perf/meta-surface`.

## Tool output (full handoff)

## HANDOFF: rule-mcp

### Project Identity

- Description: MCP server for rule-mcp-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 0.1.0

### ADR Log (session additions 080-086)

| #   | Title                                                        | Tags                  |
| --- | ------------------------------------------------------------ | --------------------- |
| 080 | One installer, a Node wizard with shell bootstraps           | installer, cli, tui   |
| 081 | MCP registry identity is the GitHub owner                    | registry, release     |
| 082 | Release artifacts are GitHub tarballs, not registry packages | registry, release     |
| 083 | Governance is an explicit BDFL with path to co-maintainers   | governance, community |
| 084 | Keep the name with a written posture, no npm placeholder yet | naming, legal         |
| 085 | Reset the project version to 0.1.0, first release is v0.1.0  | release, versioning   |
| 086 | Documentation site is hand-written static HTML from docs     | docs, site            |

Full ADR table (86 records) is in the tool output above and in
`docs/adr/ADR.md`; only session decisions are summarized here.

### Working Tree Changes (uncommitted)

Changed 1 file(s):

- `MAINTAINERS.md` (owner's own response-time tweak - do not subsume)

### Recent Commits (session)

```
c754545 feat(release): let version apply refresh manifest hashes
4915afb docs(install): fix org names, qualify pnpx, align release docs
9cc31cf fix(cli): tell the truth about global install and update
7d67ecb chore(scripts): delete the orphaned setup.sh launcher
8bacef6 docs(plans): close Step 13 as superseded, Step 18 done
01dbc93 docs(oss): name the preserved controls where runs look
1888a4c docs(release): sign tags, refuse lightweight ones
deabf12 docs(readme): sell it first, then prove it
b3e82d4 ci(health): add Scorecard, security insights and SBOM
04fcdbd fix(install): pin the pipe to a release tag with verification
f502cfc feat(docs): build the documentation site from scratch
26e3782 feat(legal): stamp SPDX headers across all sources
19fec6e docs(plans): close 9.4, packageManager decision recorded
cef6805 fix(release): reset the project version to 0.1.0
1fe895d docs(naming): state the trademark posture, settle publish at v0.1.0
c48563b docs(funding): state where sponsorship would go
c6ac692 docs(roadmap): publish direction with ADR-backed horizons
402ce31 ci(commits): one type list for every commit gate
6db0f52 docs(conduct): adopt Contributor Covenant 3.0
9345497 feat(legal): require DCO sign-off on every commit
5fdea62 docs(contrib): give newcomers a front door
841bcec docs(governance): declare the BDFL model with a path out
f67046f docs(plans): close Step 1 on a green full suite
faf3d28 chore(scripts): refresh installer checksums
69198f4 fix(packaging): name pixu1980 in every distribution manifest
5b86a1e feat(release): ship a verified tarball, not an excerpt
29ce5b5 ci(codeql): scan javascript-typescript with security-extended
55eb74d fix(review-docs): pad generated tables Prettier-style
af22ce3 ci(audit): gate releases on the audit, not bare pnpm audit
8a0f709 chore(deps): add weekly updates with a 3-day cooldown
4c3a9fc ci(permissions): drop workflow-scope write grants
c79b7c4 ci(pins): pin every action to a commit SHA
9e2790b docs(license): name pixu1980 as copyright holder
c998815 feat(release): gate releases on one synced version
f3d1827 fix(changelog): sync the generator preamble with the header
0197e21 style(tests): satisfy prefer-array-from-map in header test
3ec06e7 docs(changelog): point the header at the real script
546fd2a docs(security): route vulnerability reports privately
3ac6069 fix(server): claim the owner's registry namespace
775ffe3 docs(install): remove registry install claims
7f7c7c7 fix(deps): drop the self link: dependency
829c368 feat(setup): add Node setup wizard, shrink shells
```

### Key documents (touched this session)

- `docs/plans/oss.md` - plan of record with per-step checkboxes
- `docs/adr/ADR.md` + `docs/02-product-architecture.md` - census-regenerated
- `SECURITY.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`, `ROADMAP.md`,
  `TRADEMARK.md`, `CODE_OF_CONDUCT.md`, `AUTHORS`, `LICENSES/MIT.txt`,
  `REUSE.toml`, `SECURITY-INSIGHTS.yml`, `.github/FUNDING.yml`

### Contract reminders

- Conventional Commits WITH mandatory scope plus DCO `Signed-off-by`
  trailer on every commit (`git commit -s`). Hook enforces both.
- Nothing pushed. `test:all` green at last full run (1214/0);
  `MAINTAINERS.md` fails `prettier --check` due to the owner's own edit.
- `pnpm config get` is blind to project `.npmrc` keys in this env
  (even pre-existing `save-exact`); the npmrc test reads the file back.
- `pnpx reuse` does not exist (Python tool); a pip venv was used
  ephemerally and removed. `npm sbom` cannot read a pnpm tree -
  cdxgen is wired instead. No `gh` CLI here; no docker daemon.
- The rule-mcp MCP tool serves stale code until the server reloads: 31.3
  tool-level re-verification belongs to the next session.
- rule-mcp `a11y-test-required` guardrail is a systematic false positive on
  Node contract tests; `en-english-only-prose` flags `com` inside URLs.

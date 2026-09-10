# oss plan

- **Role**: oss v1
- **Date**: 2026-09-10

Steps re-derived from the open findings in [the review](../reviews/oss.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

The step list below is grouped by severity, which is the ranking the contract asks for. The
roadmap underneath it is the order to actually work in, because several steps rewrite the same
few files and doing them out of order means editing those files twice.

## Decisions this plan is built on

Taken from the owner in the interview that opened this run. A later run that reverses one of
these must re-derive the steps that depend on it, not just edit one file.

| #   | Decision                                                                      | Consequence in this plan                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The license stays `MIT`                                                       | No relicensing project. Step 17 adds SPDX identifiers and a `LICENSES/` layout; no grant changes, no contributor re-consent.                                                                                                                                            |
| D2  | The copyright holder is `pixu1980`                                            | Step 18 rewrites one LICENSE line, adds `AUTHORS`, and feeds the same string into the step 17 header stamp.                                                                                                                                                             |
| D3  | Inbound contributions are licensed under the DCO, with no CLA                 | Step 5 adds a `Signed-off-by` check to the hook and to CI. Relicensing later would need every contributor's consent; that is the accepted trade.                                                                                                                        |
| D4  | Distribution stays git-clone plus installer; npm publication is out of scope  | Step 4 removes every npm claim from the install docs. The global `rule-mcp` command stays documented, sourced from the local checkout (`pnpm link --global`, or `pnpm add -g <path-to-checkout>`), not from a registry. Step 6 is the artifact the project ships. |
| D5  | The documentation site is built from scratch and deployed with GitHub Actions | Step 27 adds the site and the Pages workflow, and the deployed URL becomes the canonical install URL that step 11 substitutes for the placeholder host.                                                                                                                 |
| D6  | Governance is an explicit BDFL with a documented path to co-maintainers       | Step 16 writes the model down, adds `CODEOWNERS`, and names the escalation rule.                                                                                                                                                                                        |
| D7  | The code of conduct is Contributor Covenant 3.0                               | Step 14 adopts the text verbatim and names an enforcement contact.                                                                                                                                                                                                      |
| D8  | Funding is GitHub Sponsors                                                    | Step 25 adds `FUNDING.yml` and the policy text in README and `GOVERNANCE.md`.                                                                                                                                                                                           |
| D9  | The MCP registry identity is the GitHub owner, not a claimed brand            | Step 3 rewrites `server.json` to `io.github.pixu1980/rule-mcp` and records the decision.                                                                                                                                                                          |

## Roadmap

Six phases. A phase starts only when the phases it names under "Depends on" are done, except
where a step is marked parallel. Within a phase, the shared-file groups must be done together
and in the order written, because they touch the same file.

### Phase 0 - Owner settings

No repository change. These are clicks only the owner can make, and two phases are blocked on
them. They can run in parallel with phase 1.

| Action                                                           | Step                | Blocks                       |
| ---------------------------------------------------------------- | ------------------- | ---------------------------- |
| Enable GitHub Private Vulnerability Reporting                    | 2.1, confirm at 2.5 | Phase 1 close-out, step 22.2 |
| Create the label set and mark two tasks `good first issue`       | 23.3                | Step 15.5, step 23.5         |
| Create the GitHub Sponsors profile and mirror the funding policy | 25.4                | Step 25.5                    |
| Enable branch protection on `main` with the `ci` checks required | 16.5                | Phase 2 close-out, step 10.4 |
| Enable Vigilant Mode                                             | 29.2                | Step 29.4                    |

### Phase 1 - Truth on the front door

Nothing depends on anything here, and every later phase edits text this phase fixes. Do it
first or do it twice.

| Step | Finding | Depends on | Unblocks                                       |
| ---- | ------- | ---------- | ---------------------------------------------- |
| 12   | OSS-5   | -          | 6.3 (the verify job installs the tarball), 1.4 |
| 4    | OSS-4   | -          | 1.4, 13, 11, 24                                |
| 3    | OSS-3   | -          | 1, 26                                          |
| 2    | OSS-2   | 0 (2.1)    | 22.2                                           |
| 20   | OSS-20  | -          | 6.4                                            |
| 21   | OSS-21  | -          | 6.4                                            |
| 18   | OSS-18  | -          | 17.4                                           |

### Phase 2 - Make the release pipeline real

Group the shared-file work: `ci.yml` is rewritten once, for steps 7, 8, 9, 10, 21.3, 28.2 and
5.4 together, not six times.

| Step | Finding | Depends on   | Unblocks                                            |
| ---- | ------- | ------------ | --------------------------------------------------- |
| 7    | OSS-12  | -            | 6, 10, 22, 27, 28, 5.4                              |
| 8    | OSS-13  | -            | 10, 22, 27                                          |
| 9    | OSS-14  | -            | 7.2 (the `github-actions` ecosystem bumps the pins) |
| 28   | OSS-28  | -            | 10.3                                                |
| 31   | OSS-31  | -            | -                                                   |
| 10   | OSS-15  | 7, 8, 28     | 0 (10.4)                                            |
| 6    | OSS-11  | 7, 8, 12, 21 | 1.4, 22.3, 29.3                                     |
| 1    | OSS-1   | 3, 4, 6, 12  | -                                                   |

### Phase 3 - The contributor front door

Run in parallel with phase 2. Steps 15 and 16 are the load-bearing ones: half the remaining
findings are documents that link into them, so writing them last means rewriting the links.

| Step | Finding | Depends on                      | Unblocks                  |
| ---- | ------- | ------------------------------- | ------------------------- |
| 16   | OSS-9   | -                               | 0 (16.5), 15, 23, 25, 26  |
| 15   | OSS-8   | 16.2                            | 5, 14, 19, 23, 24.3, 29.1 |
| 5    | OSS-10  | 15, 7 (5.4 edits `ci.yml`)      | -                         |
| 14   | OSS-7   | 15.4, 2.3 (shared `config.yml`) | 24.3                      |
| 19   | OSS-19  | 15                              | -                         |
| 23   | OSS-23  | 15, 16                          | 24.4                      |
| 25   | OSS-25  | 16.2                            | 24.3                      |
| 26   | OSS-26  | 3, 16.2                         | 24.3                      |

### Phase 4 - Licensing and provenance

Last of the mechanical passes, because the SPDX stamp touches all 935 source files and will
conflict with every other code change still in flight. Step 18 lands in phase 1; step 17 reads
its holder string.

| Step | Finding | Depends on | Unblocks |
| ---- | ------- | ---------- | -------- |
| 17   | OSS-17  | 18         | -        |

### Phase 5 - Discovery and durability

| Step | Finding | Depends on                                    | Unblocks |
| ---- | ------- | --------------------------------------------- | -------- |
| 27   | OSS-27  | 7, 8, 24                                      | 11.2     |
| 11   | OSS-16  | 4, 27 (11.2, for the canonical URL), 6 (11.5) | 24       |
| 22   | OSS-22  | 7, 8, 2, 6 (22.3 attaches to the release)     | -        |
| 24   | OSS-24  | 4, 11, 14, 15, 16, 23, 25, 26                 | 27.4     |
| 29   | OSS-29  | 15, 6                                         | -        |

Note the 11 -> 27 -> 11 loop: 27.4 wants the rewritten README, and 11.2 wants the deployed URL.
Break it the cheap way - land 27.3 with the `raw.githubusercontent.com` tag URL as the interim
canonical URL (already written into 11.2), then close 27.4 once both are green.

### Phase 6 - Close-out

| Step | Finding | Depends on        | Unblocks           |
| ---- | ------- | ----------------- | ------------------ |
| 30   | OSS-30  | every phase above | the next `oss` run |

## Owner actions in one list

The steps above that are not code changes. Each is a click, and each has a step that cannot
close without it.

| #   | Where                                                           | What                                                                           | Step |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| 1   | `github.com/pixu1980/rule-mcp/settings/security_analysis` | Enable Private Vulnerability Reporting                                         | 2.1  |
| 2   | Repository Security tab                                         | Confirm the "Report a vulnerability" button is live                            | 2.5  |
| 3   | Repository Settings, Security                                   | Enable Vigilant Mode                                                           | 29.2 |
| 4   | Repository labels                                               | Create `bug`, `enhancement`, `good first issue`, `needs-triage`, `help wanted` | 23.3 |
| 5   | Repository branch protection                                    | Require the `ci` checks on `main`; record the setting in `GOVERNANCE.md`       | 16.5 |
| 6   | Repository required checks                                      | Add the CodeQL and audit checks                                                | 10.4 |
| 7   | GitHub Sponsors                                                 | Create the profile and mirror the funding policy text                          | 25.4 |
| 8   | Registry decision                                               | Publish to the MCP registry, or record the deferral in the step 3.3 ADR        | 3.4  |
| 9   | npm name                                                        | Publish a `0.0.0` placeholder for `rule-mcp`, or record the squat risk   | 26.2 |

## Preserved controls

Signals the project already has. A later `oss` run must report the loss of any of these as a
finding rather than treat the absence as normal. Each row names the command that proves it still
works.

| Control                                              | Where it lives                                                                       | Prove it                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Decision log with a generated index                  | `docs/adr/` (80 records), `docs/adr/ADR.md`                                          | `pnpm census:check`                                                               |
| Handbook reading order                               | `docs/README.md`                                                                     | `pnpm test:foundations`                                                           |
| Surface counts locked to the runtime                 | `tests/docs/docs-accuracy.test.mjs`                                                  | `pnpm test:foundations`                                                           |
| Generated catalog documents                          | `pnpm census`                                                                        | `pnpm census:check`                                                               |
| Hooks tracked in the repo, installed as shims        | `.githooks/`, `pnpm hooks:install`                                                   | `pnpm hooks:check`                                                                |
| Security hardening section that names its own suites | `SECURITY.md`                                                                        | `node --test src/cli/__tests__/` plus the `test/guardrails-*` set                 |
| Installer integrity against `scripts/SHA256SUMS`     | `scripts/build/checksums/index.mjs`, `src/cli/__tests__/_install-integrity.test.mjs` | `pnpm checksums` then `node --test src/cli/__tests__/_install-integrity.test.mjs` |
| Cross-platform test matrix                           | `.github/workflows/ci.yml` (3 OS x 2 Node)                                           | the `test` job on a pull request                                                  |
| Coverage ratchet with a branch floor                 | `scripts/reports/coverage/`, `_threshold.data.mjs`                                   | `pnpm test:coverage`                                                              |
| Exact dependency versions                            | `.npmrc`, guardrail `pkg-exact-versions`                                             | `pnpm test:foundations`                                                           |
| Conventional commits with a mandatory scope          | `.githooks/commit-msg`                                                               | `git commit` with a scope-less subject is rejected                                |

## Steps

- [x] **Step 1 - OSS-1 (critical)**: The distribution manifests name three different GitHub owners and publish nothing: scoop points at `github.com/rule`, winget at rule + `github.com/rule`, and the generated Homebrew formula at `github.com/rule-mcp`. All three carry version 0.1.0 (the repo is at 1.0.0), two carry literal PLACEHOLDER hashes, and their download URLs point at a v0.1.0 release tag that does not exist. The real remote is `git@github.com:pixu1980/rule-mcp.git` and the only tag is v1.0.0.
  - [x] **1.1**: Write the failing test tests/docs/packaging-manifests.test.mjs: every manifest under .github/scoop/, .github/winget/ and the formula emitted by scripts/package.sh must resolve to `github.com/pixu1980/rule-mcp`, carry the version read from package.json, and contain no PLACEHOLDER. Confirm it fails on all four files.
  - [x] **1.2**: Rewrite .github/scoop/rule-mcp.json: homepage and checkver.github to https://github.com/pixu1980/rule-mcp, version to 1.0.0.
  - [x] **1.3**: Consolidate the two winget manifests into one, .github/winget/pixu1980.rule-mcp.yaml, with PackageIdentifier pixu1980.rule-mcp, Publisher pixu1980, PublisherUrl https://github.com/pixu1980; delete .github/winget/rule.rule-mcp.yaml.
  - [x] **1.4**: Fix the Homebrew template in scripts/package.sh: homepage to https://github.com/pixu1980/rule-mcp, and replace the registry url with the signed GitHub Release tarball URL that OSS-11 produces.
  - [x] **1.5**: Gate: node --test tests/docs/packaging-manifests.test.mjs green; pnpm test:all green (1205 pass, 0 fail) pnpm format clean; pnpm test:all green.
- [ ] **Step 2 - OSS-2 (critical)**: Security disclosure routes every vulnerability report into a public issue. SECURITY.md's only reporting instruction is "Open an issue with the reproducer" - there is no private channel, no security contact, no acknowledgment or triage SLA, no embargo window and no CVE request process. A reporter who follows the file publishes the vulnerability before a fix exists.
  - [ ] **2.1**: Owner action: enable GitHub Private Vulnerability Reporting at https://github.com/pixu1980/rule-mcp/settings/security_analysis so the advisory form exists to link to.
  - [x] **2.2**: Rewrite SECURITY.md section ## Reporting: private channel first (the GitHub advisory form URL), public issues only for non-sensitive reports, then acknowledgment within 3 business days, triage within 7, a 90-day coordinated-disclosure default, how to request a CVE, and a supported-versions table.
  - [x] **2.3**: Add .github/ISSUE_TEMPLATE/config.yml with contact_links pointing at the private advisory form, and keep blank_issues_enabled false so a security report cannot silently become a public issue.
  - [x] **2.4**: Add tests/docs/security-policy.test.mjs asserting SECURITY.md contains the advisory URL, the acknowledgment SLA and the disclosure window, so the channel cannot be edited away by a later doc pass.
  - [ ] **2.5**: Owner action: confirm the repository Security tab now shows "Report a vulnerability".
  - [ ] **2.6**: Gate: node --test tests/docs/security-policy.test.mjs green; the Report a vulnerability button is live.
- [x] **Step 3 - OSS-3 (critical)**: server.json asserts the MCP registry namespace io.github.rule while the GitHub owner is pixu1980. The registry validates namespace ownership when publishing - io.github.<owner> requires authenticating as that GitHub user - so the name as written is unpublishable and claims a namespace the maintainer does not control.
  - [x] **3.1**: Change server.json name to io.github.pixu1980/rule-mcp.
  - [x] **3.2**: Add tests/docs/server-json.test.mjs: name must equal io.github.<owner>/<name> derived from repository.url, and version must equal package.json version.
  - [x] **3.3**: Record the decision with rule_tool_process_adr: "Registry identity is the GitHub owner, not a claimed brand" - name, namespace, and whether registry publication happens now or is deferred.
  - [x] **3.4**: Decide registry publication: publish with the official mcp-publisher CLI (login github, then publish) or record the deferral explicitly in the ADR so the invalid name is not left as the only statement of identity.
  - [x] **3.5**: Gate: node --test tests/docs/server-json.test.mjs green; pnpm census:check green; the ADR is in docs/adr/ADR.md.
- [x] **Step 4 - OSS-4 (critical)**: The documented primary install is a 404. README, its npm badge, docs/01 section 2 titled "Global npm install (recommended)", docs/02 and docs/04 all present pnpm add -g rule-mcp as the way to install, but the package is not on npm.
  - [x] **4.1**: Write the failing test tests/docs/install-claims.test.mjs: no tracked Markdown or script may contain pnpm add -g rule-mcp or npm install -g rule-mcp except inside the allow-listed compatibility note. Confirm it fails.
  - [x] **4.2**: Rewrite docs/01-getting-started.md section 2 to "Global CLI from a clone": git clone, pnpm install, then the global command via pnpm link --global or the installer-generated launcher, keeping one allow-listed note that registry install applies only once the package is published. The global-install route stays documented and working - it is the supported way to get the rule-mcp command on PATH - it just sources from the checkout (pnpm add -g <path-to-checkout>) instead of from a registry.
  - [x] **4.3**: Update the three mirrored tables: docs/02-product-architecture.md lines 423-426 and docs/04-operations.md lines 222, 251, 483.
  - [x] **4.4**: Remove the npm-version badge from README.md line 6 and replace the Quick start block at README.md lines 66-70 with the clone path.
  - [x] **4.5**: Gate: node --test tests/docs/install-claims.test.mjs green; tests/docs/docs-accuracy.test.mjs green; pnpm census:check green.
- [x] **Step 5 - OSS-10 (high)**: There is no inbound contribution licensing. No DCO sign-off is required, there is no CLA, and no file states that contributions are licensed under the project license, so the licensing status of any contributed patch is undefined. The interview resolved the mechanism: DCO, no CLA.
  - [x] **5.1**: Write the failing test tests/docs/dco.test.mjs: the hook must reject a fixture commit body with no Signed-off-by trailer and accept one that has it.
  - [x] **5.2**: Extend .githooks/commit-msg to require a Signed-off-by: Name <email> trailer in the body, with the same message style as the scope check and the same merge/revert exemption.
  - [x] **5.3**: Add the DCO section to CONTRIBUTING.md with the git commit -s instruction, what the trailer asserts, and a link to https://developercertificate.org/.
  - [x] **5.4**: Add a CI job in .github/workflows/ci.yml that verifies every commit in the pull request range carries the trailer, so the local hook is not the only gate.
  - [x] **5.5**: Gate: node --test tests/docs/dco.test.mjs green; a commit without the trailer is rejected locally and by the CI job.
- [x] **Step 6 - OSS-11 (high)**: The release workflow publishes nothing but a GitHub Release. There is no build job, no artifact, no publish job, no signed artifact, no provenance and no version bump, so the v1.0.0 release is a changelog excerpt and package.json prepublishOnly is dead code. Given OSS-4, the artifact the project actually ships is the GitHub tarball, and that is not verified or signed.
  - [x] **6.1**: Record the decision with rule_tool_process_adr: ADR 082 "Release artifacts are signed GitHub Release tarballs, not registry packages" - and state plainly that npm distribution is out of scope so OSS-4 is a documentation fix rather than a publication project.
  - [x] **6.2**: Add the failing test tests/release/workflow.test.mjs: release.yml must contain a build job that runs pnpm build and produces a checksum manifest, and a release job that consumes the artifact; it must not reference any registry.
  - [x] **6.3**: Rewrite .github/workflows/release.yml into three jobs (plus neutralized package.sh step 5, which regenerated the installers from stale heredocs) - build (pack, checksums, upload artifact), verify (install the packed tarball in an empty directory and run the bin), release (attach tarball and SHA256SUMS to the GitHub Release). Every job gets contents: read except release.
  - [x] **6.4**: Add the version bump to the flow: --check gates the build, --apply is the local pre-tag step (self-healing packs would mask disagreement) run scripts/build/version/index.mjs --apply (OSS-21) before packing and fail on --check mismatch, so tag, package.json, server.json and CHANGELOG cannot disagree.
  - [x] **6.5**: Document the verification command in README and docs/04: download the tarball and the checksum file, then shasum -a 256 -c.
  - [ ] **6.6**: Gate: node --test tests/release/workflow.test.mjs green; a scratch v0.1.0-rc.1 tag produces a release carrying the tarball plus the checksum file, and every job other than release declares contents: read.
- [ ] **Step 7 - OSS-12 (high)**: Every GitHub Action is pinned by a moving tag rather than a commit SHA. A compromised or retagged upstream action executes arbitrary code in CI, and in release.yml that code runs with contents: write.
  - [x] **7.1**: Write the failing test tests/docs/action-pins.test.mjs: every uses: line in .github/workflows/ must match a 40-hex SHA followed by a version comment. Confirm it fails on all current uses.
  - [x] **7.2**: Resolve and pin each action to its current release SHA with the tag in a trailing comment: actions/checkout, pnpm/action-setup, actions/setup-node in ci.yml; actions/checkout, softprops/action-gh-release in release.yml, plus whatever OSS-15, OSS-22 and OSS-27 add.
  - [x] **7.3**: Add .github/workflows/check-workflows.yml running zizmorcore/zizmor-action over .github/workflows/, with contents: read and actions: read only.
  - [x] **7.4**: Run zizmor locally over the workflow directory (zizmor 1.9.0 binary; only Step-8-owned findings remain) (docker run --rm -t -v "$(pwd):/repo:ro" ghcr.io/zizmorcore/zizmor:latest /repo/.github/workflows) and fix every finding, then re-run until clean.
  - [x] **7.5**: Delete stale remote branches that still carry the old workflows (only main plus the working branch exist; nothing to delete) - an attacker exploits the old copy.
  - [ ] **7.6**: Gate: node --test tests/docs/action-pins.test.mjs green; the zizmor job green on main.
- [ ] **Step 8 - OSS-13 (high)**: The CI workflow grants id-token: write to every job at workflow scope. The lint job, the six-cell test matrix, the coverage job and the audit job all install dependencies and none of them needs to mint an OIDC token; a compromised dependency in any of them inherits the ability.
  - [x] **8.1**: Write the failing test tests/docs/workflow-permissions.test.mjs: no workflow may set id-token, contents: write or actions: write at workflow scope, and every checkout step must set persist-credentials: false.
  - [x] **8.2**: In .github/workflows/ci.yml remove id-token: write from the workflow scope; keep contents: read as the default and add job-level permissions only where a job needs more.
  - [x] **8.3**: Add persist-credentials: false to every actions/checkout step in both workflows.
  - [x] **8.4**: Confirm the release workflow still works after the change (gh-release keeps contents:write at job scope; local zizmor clean) and that any job needing id-token gets it at job scope only (relevant once OSS-22 and OSS-27 add one).
  - [ ] **8.5**: Gate: node --test tests/docs/workflow-permissions.test.mjs green; zizmor clean; the CI matrix still passes.
- [ ] **Step 9 - OSS-14 (high)**: Dependencies are pinned exactly and nothing updates them. There is no Dependabot or Renovate configuration and no install cooldown configured, so every transitive security fix is manual, and the exact-pin policy has no adoption delay behind it.
  - [x] **9.1**: Add .github/dependabot.yml with the npm and github-actions ecosystems, weekly schedule, grouped minor and patch updates, and commit-message prefixes that satisfy the scope gate (for example chore(deps)).
  - [x] **9.2**: Set the cooldown explicitly and record the choice: minimum-release-age=4320 (three days) in .npmrc, noting that pnpm 11 already defaults to 1440 so this is a raise rather than a new control.
  - [x] **9.3**: Add a check that reads the cooldown back so it cannot be dropped silently - extend the manifest guardrail family or add tests/docs/npmrc.test.mjs asserting the key and its value.
  - [x] **9.4**: Decide and document the packageManager question: CONTRIBUTING.md states pnpm 11+ required, no packageManager pin (pkg-no-corepack forbids it) the guardrail pkg-no-corepack forbids adding it, so state in CONTRIBUTING.md that pnpm 11+ is required and why the version is not pinned in the manifest.
  - [ ] **9.5**: Gate: pnpm config get minimum-release-age returns the decided value; the new check green; the first Dependabot PR opens within a week.
- [ ] **Step 10 - OSS-15 (high)**: Nothing analyzes the server's own source for security defects. There is no CodeQL or other SAST workflow; the guardrail engine scans the code this server validates, not the code it is made of.
  - [x] **10.1**: Add .github/workflows/codeql.yml for the javascript-typescript language with the security-extended query suite, triggered on push to main, on pull requests to main, and weekly on a schedule.
  - [x] **10.2**: Pin the CodeQL actions by SHA (OSS-12) and give the job only the permissions it needs: contents: read plus a job-scoped security-events: write.
  - [x] **10.3**: Turn on the audit gate: already wired by Step 28 (ci.yml runs pnpm audit:gate) wire pnpm audit:gate through scripts/ci/audit-gate/index.mjs instead of the bare pnpm audit --prod (shared with OSS-28).
  - [ ] **10.4**: Owner action: add the CodeQL and audit checks to the branch protection required list alongside the existing ci checks.
  - [ ] **10.5**: Gate: the CodeQL workflow green with zero open code-scanning alerts; the required-check list includes it.
- [ ] **Step 11 - OSS-16 (high)**: The documented install is curl-piped-to-shell from a domain that does not exist. Five scripts present https://rule-mcp.domain.example as the install URL, and none of them verifies what it downloads before executing it.
  - [ ] **11.1**: Write the failing test tests/docs/placeholder-hosts.test.mjs: no tracked Markdown or script may contain domain.example.
  - [ ] **11.2**: Pin the install to a release tag rather than a branch, so the fetched script is immutable: replace the placeholder with the real canonical URL once OSS-27 lands, using the `raw.githubusercontent.com` tag URL as the interim.
  - [ ] **11.3**: Add integrity: the one-line installer downloads the script and its SHA256 from the same release, verifies before executing, and exits non-zero on mismatch.
  - [ ] **11.4**: Update the install documentation to present git clone plus ./scripts/install.sh as the default, keeping the pipe form as a documented alternative with the verification step shown inline.
  - [ ] **11.5**: Regenerate scripts/SHA256SUMS with pnpm checksums after the script edits.
  - [ ] **11.6**: Gate: node --test tests/docs/placeholder-hosts.test.mjs green; node --test src/cli/**tests**/_install-integrity.test.mjs green.
- [x] **Step 12 - OSS-5 (high)**: The published tarball cannot be installed by any npm-family client. package.json declares a runtime dependency on itself using the pnpm-only link: protocol, so installing the packed artifact aborts before the package is unpacked.
  - [x] **12.1**: Reproduce and capture the failure in an empty directory: npm pack, then npm install ./rule-mcp-1.0.0.tgz - expect EUNSUPPORTEDPROTOCOL.
  - [x] **12.2**: Delete "rule-mcp": "link:" from package.json dependencies and the matching overrides entry from pnpm-workspace.yaml; move local name resolution to the documented pnpm link --global dev instruction.
  - [x] **12.3**: Add tests/docs/manifest.test.mjs: no dependencies value may use the link:, file: or workspace: protocol unless the package is private.
  - [x] **12.4**: Re-reproduce after the change: npm pack and npm install ./rule-mcp-1.0.0.tgz in an empty directory must exit 0 and the bin must run.
  - [x] **12.5**: Gate: node --test tests/docs/manifest.test.mjs green; the temp-directory install exits 0.
- [ ] **Step 13 - OSS-6 (high)**: The two installers disagree and the Windows one still takes the path that cannot work. scripts/install.sh was migrated to a local-binary launcher ("no global npm install needed"), but scripts/install.ps1 still runs pnpm add -g / npm install -g against the unpublished registry package, and the bash header still claims it installs the npm package globally.
  - [ ] **13.1**: Add tests/installer/parity.test.mjs asserting neither installer invokes add -g on a registry package and that both resolve the CLI the same way.
  - [ ] **13.2**: Fix scripts/install.ps1 lines 340 and 380 to the local-binary launcher path the bash script uses (mirror ensure_global_shim), keeping the pnpx fallback only as an explicit opt-in flag.
  - [ ] **13.3**: Fix the scripts/install.sh header comment at line 10 to describe what the script actually does.
  - [ ] **13.4**: Regenerate scripts/SHA256SUMS with pnpm checksums - src/cli/**tests**/_install-integrity.test.mjs fails on any installer edit without it.
  - [ ] **13.5**: Gate: node --test src/cli/**tests**/_install-integrity.test.mjs green; installer parity test green; a --dry-run on Windows and on bash shows no registry call.
- [x] **Step 14 - OSS-7 (high)**: The project has no code of conduct, so the GitHub community profile is incomplete and there is no stated standard of behavior or route for reporting a conduct problem. The interview resolved the choice: Contributor Covenant 3.0.
  - [x] **14.1**: Add CODE_OF_CONDUCT.md at the repository root with the Contributor Covenant 3.0 text verbatim, adaptation section filled in for the project name.
  - [x] **14.2**: Fill the enforcement contact: `pisuemiliano.1980@gmail.com` until a project address exists, and state the escalation (maintainer then BDFL) in the same file.
  - [x] **14.3**: Add the conduct reporting link to .github/ISSUE_TEMPLATE/config.yml so it sits beside the security link.
  - [x] **14.4**: Link CODE_OF_CONDUCT.md from the README Contributing section added by OSS-8.
  - [ ] **14.5**: Gate: the GitHub community profile lists CODE_OF_CONDUCT as added; pnpm format clean.
- [x] **Step 15 - OSS-8 (high)**: There is no contribution entry point. No CONTRIBUTING.md, no issue templates and no pull request template exist, so the whole contribution path is seven lines buried in a numbered handbook chapter that a newcomer has to find first.
  - [x] **15.1**: Add CONTRIBUTING.md at the root, moving and expanding docs/07-engineering-guides.md lines 156-170: prerequisites, dev setup, the exact command list (pnpm install, pnpm test:all, pnpm lint, pnpm format, pnpm census:check), the ADR requirement for structural change, branch and commit conventions, and a first-response expectation of 7 days.
  - [x] **15.2**: Add .github/ISSUE_TEMPLATE/bug.yml and feature.yml with required fields (version, reproduction, expected behavior) plus config.yml with blank_issues_enabled false.
  - [x] **15.3**: Add .github/PULL_REQUEST_TEMPLATE.md carrying the checklist CI actually enforces: tests green, format clean, census current, ADR added when the change is structural.
  - [x] **15.4**: Add a Contributing section to README.md (CoC link lands with Step 14) linking CONTRIBUTING.md, CODE_OF_CONDUCT.md, GOVERNANCE.md and SECURITY.md, and leaving a pointer to docs/07 for the deeper engineering material.
  - [x] **15.5**: Gate: an issue chooser shows both templates; test:all green (chooser rendering proves on first real issue) a draft PR renders the template; pnpm test:all green.
- [ ] **Step 16 - OSS-9 (high)**: No governance, maintainer or ownership file exists, and the bus factor is one. 80 ADRs record what was decided but nothing records who decides, how a maintainer is added, or how a dispute escalates. The interview resolved the model: explicit BDFL with a documented path to co-maintainers.
  - [x] **16.1**: Record the decision first with rule_tool_process_adr: ADR 083 "Governance is an explicit BDFL with a documented path to co-maintainers" - the model, the escalation rule (ADR, then maintainer, then BDFL), and the criteria a contributor must meet to become a maintainer.
  - [x] **16.2**: Add GOVERNANCE.md: the roles (contributor, triager, maintainer, BDFL), how each is earned, how a decision escalates, how a maintainer is removed, and the statement that docs/adr/ is the record of decisions.
  - [x] **16.3**: Add MAINTAINERS.md naming the single current maintainer, the areas they own, and the expected response times.
  - [x] **16.4**: Add .github/CODEOWNERS mapping * to the maintainer and docs/adr/ to the BDFL.
  - [ ] **16.5**: Owner action: enable branch protection on main requiring the ci checks and one review for outside contributors, and record the exact setting in GOVERNANCE.md so it is auditable.
  - [ ] **16.6**: Gate: the ADR is present and docs/adr/ADR.md regenerated; pnpm census:check green; CODEOWNERS resolves on a test PR.
- [x] **Step 17 - OSS-17 (medium)**: No source file carries an SPDX identifier. The license is declared once in package.json and once in LICENSE, and 0 of 935 JavaScript files under src/, bin/ and scripts/ state their license, so file-level provenance cannot be established by a scanner and a copied file leaves the project without its terms.
  - [x] **17.1**: Write the failing check: scripts/reports/license-headers/index.mjs --check (989 files red) a script or test that walks every tracked .js and .mjs under src/, bin/ and scripts/ and fails on a file with no SPDX-License-Identifier line.
  - [x] **17.2**: Add scripts/reports/license-headers/index.mjs with --check and --apply: it inserts the SPDX-FileCopyrightText and SPDX-License-Identifier lines at the top of each source file that lacks them, preserving any shebang.
  - [x] **17.3**: Run the --apply pass, then wire the --check form into ci.yml as a license job as its own job so a new file cannot land without a header.
  - [x] **17.4**: Restructure to the REUSE layout: LICENSES/MIT.txt plus REUSE.toml (dep5 is deprecated upstream) `LICENSES/MIT.txt`, `LICENSE` kept at the root as the human-readable pointer.
  - [x] **17.5**: Run reuse lint over the tree and clear what it reports: 1538/1538 compliant (via pip venv - no npm reuse binary exists; 3 files tipped over budget were split per ADR 061) then record the layout choice in an ADR if it differs from the flat LICENSE the project has today.
  - [x] **17.6**: Gate: reuse lint reports zero files without licensing information; test:all green (1209/0) the header check job green.
- [ ] **Step 18 - OSS-18 (medium)**: Three different identities name the copyright. LICENSE says Pix, the git author is Emiliano Pisu, and the GitHub owner is pixu1980, so no downstream scanner or lawyer can map the copyright to one holder. The interview resolved the holder: pixu1980.
  - [x] **18.1**: Set the LICENSE line to "Copyright (c) 2025-2026 pixu1980".
  - [x] **18.2**: Add author, repository, bugs and homepage to package.json (done early by 21.4, verified here) (author pixu1980, repository github:pixu1980/rule-mcp) - this also closes half of OSS-21.
  - [x] **18.3**: Add an AUTHORS file listing pixu1980 with the contact address, so a contributor list has a home before the first outside contribution.
  - [x] **18.4**: Feed the same holder string into the SPDX header stamp from OSS-17: HOLDER is 2025-2026 pixu1980, matching LICENSE, AUTHORS and package.json so the two cannot disagree.
  - [x] **18.5**: Gate: grep over LICENSE, AUTHORS and package.json shows one holder only; pnpm census:check green.
- [x] **Step 19 - OSS-19 (medium)**: The two commit gates disagree. The pull request title check accepts twelve types including release and does not check the scope; the local hook requires a scope and accepts eleven types without release. A contributor who passes one fails the other.
  - [x] **19.1**: Write the failing test tests/docs/commit-gates.test.mjs: parse both files, assert the type lists are identical, and assert release is either in both or in neither.
  - [x] **19.2**: Add scripts/build/commit-types/index.mjs as the single source of truth (plus a --lint-range CLI so CI reuses it instead of a third regex copy) exporting the type list, and have a check fail when semantic.yml or commit-msg drifts from it.
  - [x] **19.3**: Decide release: removed from semantic.yml (changelog has no release section; bumps use the chore(release) scope) either add it to the hook's regex or remove it from semantic.yml, and state the choice in CONTRIBUTING.md.
  - [x] **19.4**: Add a commit-lint job that validates every commit in the pull request range, not only the title, so the scope rule is enforced on contributions from clones without the hook installed.
  - [x] **19.5**: Gate: node --test tests/docs/commit-gates.test.mjs green; bad-commit probe exits 1 the commit-lint job green on a deliberately bad test commit.
- [x] **Step 20 - OSS-20 (medium)**: The changelog header names a script that does not exist and describes a release step that does not happen: it points at scripts/build-changelog.mjs and claims the release workflow regenerates the file, while release.yml only reads it.
  - [x] **20.1**: Write the failing test tests/docs/changelog-header.test.mjs: every repository path named in the CHANGELOG header must exist on disk.
  - [x] **20.2**: Fix CHANGELOG.md line 3 to name scripts/build/changelog/index.mjs and the pnpm changelog command.
  - [x] **20.3**: Fix CHANGELOG.md lines 5-6 to describe what release.yml actually does once OSS-11 lands - generated by a job or by hand before tagging, not by the tag itself.
  - [x] **20.4**: Extend the docs-accuracy test to treat script paths in generated-document headers the same way it treats surface counts.
  - [x] **20.5**: Gate: node --test tests/docs/changelog-header.test.mjs green; pnpm format clean.
- [x] **Step 21 - OSS-21 (medium)**: The version lives in three hand-synced copies - package.json, server.json and the git tag - and nothing bumps or verifies them, so a release can ship a manifest that disagrees with its tag. package.json also lacks the repository field that server.json carries, so npm metadata would lose the source link.
  - [x] **21.1**: Write the failing test tests/docs/version-sync.test.mjs: package.json version must equal server.json version, and the newest CHANGELOG.md heading must equal both.
  - [x] **21.2**: Add scripts/build/version/index.mjs with --check and --apply: --apply writes one version into package.json, server.json and a new CHANGELOG heading; --check exits non-zero on any disagreement.
  - [x] **21.3**: Call the --check form from ci.yml and the --apply form from the release workflow before packing (shared with OSS-11).
  - [x] **21.4**: Add the missing package.json fields: repository, author, bugs, homepage (shared with OSS-18).
  - [x] **21.5**: Gate: node scripts/build/version/index.mjs --check exits 0 on main; node --test tests/docs/version-sync.test.mjs green.
- [ ] **Step 22 - OSS-22 (medium)**: There is no external, repeatable health signal for the project. No OpenSSF Scorecard run, no SECURITY-INSIGHTS.yml and no SBOM, so a consumer or a funder has nothing machine-readable to check and the maintainer has no trend to watch.
  - [ ] **22.1**: Add .github/workflows/scorecard.yml using the OpenSSF template: ossf/scorecard-action pinned by SHA, publish_results true, results uploaded as SARIF, and id-token: write scoped to that single job.
  - [ ] **22.2**: Add SECURITY-INSIGHTS.yml at the root with the OpenSSF schema: maintainers, security contacts, the disclosure policy written in OSS-2, and the supported-versions table.
  - [ ] **22.3**: Add SBOM generation to the release build job: npm sbom --sbom-format cyclonedx redirected to sbom.cdx.json, published as a release asset next to the checksum file.
  - [ ] **22.4**: Run the Scorecard workflow once, read the findings, and fold anything it reports that this plan missed into the next oss review rather than fixing it ad hoc.
  - [ ] **22.5**: Gate: the Scorecard workflow green; sbom.cdx.json present on the next release; the score is recorded in the review evidence for the next run.
- [ ] **Step 23 - OSS-23 (medium)**: There is no public roadmap and no stated triage expectation. docs/07 says only that open work is tracked in the issue tracker, so a would-be contributor cannot see direction, and a reporter has no idea when to expect a response.
  - [x] **23.1**: Add ROADMAP.md at the root with now / next / later, one paragraph each, and the ADR number that justifies each item so the reasoning is traceable.
  - [x] **23.2**: Define the triage convention in CONTRIBUTING.md: the label set (bug, enhancement, good first issue, needs-triage, help wanted), a first-response target of 7 days, and a stale rule with a stated window.
  - [ ] **23.3**: Owner action: create the label set in the repository and mark two genuinely small tasks good first issue so the path is demonstrated rather than described.
  - [x] **23.4**: Link ROADMAP.md from docs/README.md and from the README Contributing section so it is inside the reading order, not beside it.
  - [ ] **23.5**: Gate: ROADMAP.md present and linked from both entry points; the labels exist; pnpm census:check green.
- [ ] **Step 24 - OSS-24 (medium)**: The README front door fails the project's own readme skill. It opens with four shields.io badges, one of which is broken because the package is not on npm and one of which states a version that disagrees with package.json, and it has no Contributing, Code of Conduct, Governance, Security, Support or Sponsors section.
  - [ ] **24.1**: Remove the four badges at README.md lines 6-9 and state the same facts as text in the opening block: the Node floor, the `MIT` license, and the MCP SDK version read from package.json (1.30.0, fixing the drift).
  - [ ] **24.2**: Rewrite the opening block against the readme skill's three questions - what it does in plain language, how the reader benefits, what makes it different from the alternatives - and keep the existing fact bullet list immediately after it.
  - [ ] **24.3**: Insert Contributing, Code of Conduct, Governance, Security and Sponsors sections before the License section, each a short paragraph with one link.
  - [ ] **24.4**: Extend the Table of Contents to cover the new sections and ROADMAP.md, and check every anchor resolves.
  - [ ] **24.5**: Walk the readme skill checklist end to end: first paragraph sells it, every number is sourced, the example runs, getting started works from a clean machine.
  - [ ] **24.6**: Gate: pnpm test:foundations (which covers tests/docs/docs-accuracy.test.mjs) green; every ToC anchor resolves; the checklist walked and recorded in the review evidence.
- [x] **Step 25 - OSS-25 (medium)**: There is no funding surface at all: no FUNDING.yml, no Sponsors section and no statement of where money would go or who controls it. The interview resolved the platform: GitHub Sponsors. Absent a policy, a sponsor cannot tell what they are funding.
  - [x] **25.1**: Add .github/FUNDING.yml with github: pixu1980, which is what makes the Sponsor button render.
  - [x] **25.2**: Add a Sponsors section to README.md stating what the money is spent on (hosting, release infrastructure, maintainer time) and that sponsorship buys no roadmap priority.
  - [x] **25.3**: Add a Funding section to GOVERNANCE.md stating who controls the account, that the project is unfunded today, and that donations do not change the decision process - so the answer survives a later review without a new file.
  - [ ] **25.4**: Owner action: create the GitHub Sponsors profile and mirror the same policy text there, so the two descriptions agree.
  - [ ] **25.5**: Gate: the Sponsor button renders on the repository; the README and GOVERNANCE policy text match word for word.
- [x] **Step 26 - OSS-26 (medium)**: The project name is neither protectable nor claimed. There is no trademark or naming policy; Pix is the brand of the Brazilian instant-payment system and a common product word, and the npm package name and the io.github.rule registry namespace are both unclaimed and open to squatting.
  - [x] **26.1**: Add TRADEMARK.md stating what the marks are, what uses are permitted without asking (fork names, package references, compatibility statements), what requires permission (implying endorsement), and that the code license grants no trademark rights.
  - [x] **26.2**: Decide the defensive claim on the npm name and record it: owner decided publish v0.1.0, no placeholder (ADR 085) either publish a 0.0.0 placeholder to hold rule-mcp, or state the decision not to and record the squat risk explicitly.
  - [x] **26.3**: Record the naming decision with rule_tool_process_adr: ADR 084 (posture) plus ADR 085 (v0.1.0 publish) the package name, the registry namespace, the trademark posture, and the review date at which the name is reconsidered.
  - [x] **26.4**: Link TRADEMARK.md from README.md next to the License line so a consumer sees the boundary before they fork.
  - [x] **26.5**: Gate: TRADEMARK.md present and linked; the ADR present and listed in docs/adr/ADR.md.
- [ ] **Step 27 - OSS-27 (medium)**: There is no documentation website, so the install instructions have no canonical URL - which is exactly why the placeholder host rule-mcp.domain.example survived in five scripts. The interview resolved the direction: build a documentation site from scratch and publish it with GitHub Actions.
  - [ ] **27.1**: Decide the site shape (the interview said build from scratch) and record it with rule_tool_process_adr: generator or hand-written, where the source lives, and how the 15 chapters and the 80 ADRs map to routes.
  - [ ] **27.2**: Add the site source and a local preview command (pnpm docs:dev and pnpm docs:build) so the site is part of the normal dev loop rather than a release-only artifact.
  - [ ] **27.3**: Add .github/workflows/pages.yml deploying to GitHub Pages with actions/configure-pages, actions/upload-pages-artifact and actions/deploy-pages, all pinned by SHA, with pages: write and id-token: write scoped to the deploy job only.
  - [ ] **27.4**: Make the deployed URL the canonical install URL and feed it back into OSS-16, replacing the placeholder host.
  - [ ] **27.5**: Add tests/docs/link-integrity.test.mjs walking every relative link in docs/ and failing on a target that does not exist, so the site cannot ship dead links.
  - [ ] **27.6**: Gate: the Pages workflow green; the deployed site renders all 15 chapters; the link-integrity test green.
- [ ] **Step 31 - OSS-31 (medium)**: The persona document generator writes Markdown that the repository's own format gate rejects. Every `rule_tool_plan_docs` run leaves three unformatted files, so the `lint` job goes red and a contributor has to run `pnpm format:fix` before the change can land - and the next generator run undoes it.
  - [x] **31.1**: Write the failing test tests/docs/review-docs/format.test.mjs: render the fixture trio and assert the output is Prettier-clean (use the `prettier` API, not a shell-out, so the test does not depend on the binary being on PATH).
  - [x] **31.2**: Align the table renderer in src/core/review/docs/_table.js (plus the hardcoded audit skeleton in _render.js, same root cause) so each column is padded to its widest cell, matching Prettier's Markdown table style; keep escapeCell unaware of the padding.
  - [ ] **31.3**: Run a `rule_tool_plan_docs` pass over a scratch role and confirm `pnpm format` is clean straight afterward with no `pnpm format:fix` step in between.
  - [ ] **31.4**: Gate: node --test tests/docs/review-docs/format.test.mjs green; `pnpm format` clean immediately after a generator run.
- [x] **Step 28 - OSS-28 (low)**: The audit is not a gate. scripts/ci/audit-gate/index.mjs and the audit:gate script both exist, but no workflow calls them - CI runs only the bare pnpm audit --prod, so a known advisory does not block a release.
  - [x] **28.1**: Write the failing test tests/ci/audit-gate.test.mjs: the release workflow must invoke pnpm audit:gate before the artifact is packed.
  - [x] **28.2**: Replace the bare pnpm audit --prod step in .github/workflows/ci.yml with pnpm audit:gate, or call it from the release build job so both paths cover it.
  - [x] **28.3**: Verify the gate actually fails: probed with a stubbed pnpm (advisory exits 1, clean exits 0, garbage warns and passes) seed a fixture advisory and confirm a non-zero exit, then remove the fixture.
  - [x] **28.4**: Gate: node --test tests/ci/audit-gate.test.mjs green; the seeded advisory produces a non-zero exit.
- [ ] **Step 29 - OSS-29 (low)**: No commit and no tag is signed, so a consumer cannot verify that a release came from the maintainer, and GitHub shows no verified badge.
  - [ ] **29.1**: Document maintainer signing in CONTRIBUTING.md: the git config commit.gpgsign and user.signingkey setup, and the instruction to tag with git tag -s.
  - [ ] **29.2**: Owner action: enable Vigilant Mode in GitHub settings so unsigned commits are visibly marked rather than silently accepted.
  - [ ] **29.3**: Change the release instructions in docs/04-operations.md from git tag to git tag -s, and add a verification step to the release workflow that refuses a lightweight tag.
  - [ ] **29.4**: Gate: the next release tag verifies with git tag --verify, and the GitHub release shows Verified.
- [ ] **Step 30 - OSS-30 (info)**: Controls worth naming so a later run treats their loss as a finding rather than rediscovering them: the ADR log with a generated index, the reading-order handbook, the docs-accuracy lock, the census generator, the tracked hooks with shims, the SECURITY hardening section that names its own tests, the installer integrity check, the CI matrix and the coverage ratchet.
  - [ ] **30.1**: Review the Preserved controls section at the top of this plan against what is actually present, and note any row that no longer holds.
  - [ ] **30.2**: Fold the same list into the oss persona's review checklist so a later run reports a missing control as a finding rather than treating the absence as normal.
  - [ ] **30.3**: Gate: the section is present in the plan; the next oss review run's evidence cites the list.

## Cross-references

- [The audit](../audits/oss.md) - the commands this run executed and what they returned.
- [The review](../reviews/oss.md) - the 31 open findings each step is derived from.

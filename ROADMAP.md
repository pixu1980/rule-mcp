# Roadmap

Where rule-mcp is going, and what is blocking each horizon. Every item
names the ADR that justifies it and the review finding or plan step that tracks
it, so the reasoning and the status stay traceable.

The work queues live in [`docs/plans/`](./docs/plans/), re-derived from the open
findings in [`docs/reviews/`](./docs/reviews/) on every run. This file is the
order to read them in, not a second copy of them.

Legend: `[x]` done, `[ ]` open, `[~]` blocked on an action only the owner can
take (see [Owner actions](#owner-actions)).

## Now

### Close the shell-out surface (security)

The daemon service layer hands interpolated strings to a shell, and a value that
reaches one executes. This is the highest-severity open work in the tree and it
comes before anything that adds surface. Plan:
[`docs/plans/security.md`](./docs/plans/security.md), findings
[`docs/reviews/security.md`](./docs/reviews/security.md).

- [x] SEC-1 (high): `tryExec` interpolates into a shell; `tryExecFile` takes an argv array so no shell parses a path
- [x] SEC-2 (medium): the launchd wrapper single-quotes its paths instead of XML-escaping them
- [x] SEC-3 (medium): the PowerShell fallback launches with an argv array, not `shell: true`
- [x] SEC-4 (medium): a failed install reports the exit code, never the command line
- [ ] SEC-5 (medium): `shimWorks()` executes whatever the PATH resolves
- [x] SEC-6 (medium): argument quoting built from the argv array in the Windows `binPath` and the systemd `ExecStart`
- [ ] SEC-7 (low): `tryExec` collapses every failure, including the output cap, into `""`
- [ ] SEC-8 (low): the daemon shell-out surface exists twice in the live tree

### Installer follow-through (ADR 080)

The Node wizard is the installer and the shell scripts are thin bootstraps. What
remains is proving the bootstraps where a shell exists to run them.

- [x] One implementation in Node, parity by construction, covered by the `_install-bootstrap` tests
- [x] Agent catalog drift-free (installer agent-catalog test)
- [ ] PowerShell bootstraps exercised in CI on the `windows-latest` runner; today the `.ps1` files are read by a test, never executed

### Owner actions

Clicks only the owner can make, tracked in
[`docs/plans/github.md`](./docs/plans/github.md). Phase 0 blocks phases 1, 2 and 3.

- [~] Enable GitHub Private Vulnerability Reporting (blocks OSS-2 close-out)
- [~] Create the label set and mark two tasks `good first issue` (blocks OSS-23)
- [~] Create the GitHub Sponsors profile and mirror the funding policy (blocks OSS-25)
- [~] Enable branch protection on `main` with the `ci` checks required (blocks OSS-16)
- [~] Enable Vigilant Mode (blocks OSS-29)
- [~] Set Pages source to GitHub Actions (blocks OSS-27 deploy)

## Next

### First release: v0.1.0-beta (ADR 097, ADR 082)

The pipeline is written and has never run: the repository carries no tag. Cut
the first release and watch every job carry it.

- [ ] `pnpm changelog`, then `version --apply`, then a signed `git tag -s` (the release order the workflow assumes)
- [ ] Build/verify/release jobs carry a signed tarball plus `SHA256SUMS` to the GitHub Release
- [ ] CodeQL green on `main` with zero alerts
- [ ] Scorecard and the SBOM signal online (OSS-22)
- [~] Delete the stale remote `v1.0.0` tag and its Release page

### Release pipeline and supply chain (OSS phases 1-2)

- [ ] OSS-7: pin every GitHub Action by commit SHA
- [ ] OSS-8: drop `id-token: write` from every job that does not mint a token
- [ ] OSS-9: add Dependabot and an install cooldown behind the exact-pin policy
- [ ] OSS-10: add a SAST workflow for this server's own source
- [ ] OSS-6, OSS-1: finish the artifact and distribution manifests

### Contributor front door (OSS phase 3)

- [ ] OSS-16: governance and ownership (blocked on branch protection)
- [ ] OSS-15, OSS-5, OSS-19, OSS-23, OSS-25, OSS-26: the documents that link into them
- [ ] OSS-14, OSS-2: code of conduct and private disclosure (blocked on PVR)

### Discovery and durability (OSS phase 5)

- [ ] OSS-27: deploy the documentation site (built; blocked on Pages)
- [ ] OSS-11, OSS-16: the canonical install URL, replacing the placeholder host
- [ ] OSS-24, OSS-29: the README walk-through and signed tags

## Later

### Publish outward (ADR 081)

- [ ] Publish to the MCP registry: the identity is already decided and written (`io.github.pixu1980/rule-mcp` in `server.json`); what remains is the publish, after the pipeline above proves itself
- [ ] Make the deployed site URL the canonical install address in every script and document

## Architecture debt

Not product surface, but it is what makes every change above expensive.
Plan: [`docs/plans/architect.md`](./docs/plans/architect.md), findings
[`docs/reviews/architect.md`](./docs/reviews/architect.md).

- [ ] ARCH-1 (high): break the eight-module cycle tying invocation to skill loading, self-update and the gateway
- [ ] ARCH-2 (high): split the `loadAllSkills` god initializer
- [ ] ARCH-3 (high): freeze the 105-tool public API with a rename contract
- [ ] ARCH-4 (high): cut the 19-deep dependency chain
- [ ] ARCH-5..ARCH-10 (medium/low): ports for session/cache/process, barrels, god files, dedup onto `src/shared`, the three Node traffic patterns, seams for transports and the MCP version

## Reading this

- Status is per item, not per phase: an item is done when its plan gate is green.
- `[~]` items are owner actions and are the only ones this file marks as blocked by a person rather than by code.
- When a plan has nothing open, the next `handoff` run archives it as an ADR and deletes it; this file then loses its link, which is the signal to remove the section.

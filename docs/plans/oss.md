# oss plan

- **Role**: oss v1
- **Date**: 2026-10-12

Steps re-derived from the open findings in [the review](../reviews/oss.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Steps

Dependencies: confirm the owner's release-signing, supported-version, moderation, funding and licensing policies before editing those public commitments. Verify OSS-05 on a clean checkout before treating its local failures as baseline CI failures. OSS-08 can proceed independently after owner approval. No tag, repository setting or policy is changed by this plan.

- [ ] **Step 1 - OSS-01 (high)**: Release workflow accepts unsigned annotated tags despite signed-tag policy; v0.1.0 has no signature
  - [ ] **1.1**: Ask the repository owner to confirm the signed-tag and key-management policy; do not rewrite the existing release tag.
  - [ ] **1.2**: Add and test a cryptographic signature verification gate in .github/workflows/release.yml; distinguish annotated from verified.
  - [ ] **1.3**: On a new signed test tag, verify the release gate passes; assert an unsigned annotated tag fails before release creation.
- [ ] **Step 2 - OSS-02 (medium)**: Security support table names only 1.0.x as supported while package and tag are 0.1.0
  - [ ] **2.1**: Ask the owner which released pre-1.0 version line receives security fixes.
  - [ ] **2.2**: Align SECURITY.md supported-version table with the confirmed policy and package.json/server.json; check the release tag.
  - [ ] **2.3**: Validate the advisory and README links resolve to the updated support policy.
- [ ] **Step 3 - OSS-03 (medium)**: Code of conduct appeal routes from maintainer to the same BDFL with no independent alternative
  - [ ] **3.1**: Ask the owner to nominate a willing independent conduct contact and agree on a confidential escalation channel; do not publish a person's address without consent.
  - [ ] **3.2**: Update CODE_OF_CONDUCT.md and GOVERNANCE.md with reporting, recusal, appeal and response handling when the BDFL is involved.
  - [ ] **3.3**: Test that all public links reach a working private reporting channel without exposing reporter identity.
- [ ] **Step 4 - OSS-05 (medium)**: Local lint and generated-document checks fail on this dirty working-tree snapshot; clean-branch CI status is unverified
  - [ ] **4.1**: Run pnpm lint and pnpm census:check on a clean checkout before attributing failures to main.
  - [ ] **4.2**: For confirmed failures, fix only the failing files and regenerate the named census outputs via pnpm census.
  - [ ] **4.3**: Re-run pnpm test:all, pnpm lint and pnpm census:check in CI and record their results.
- [ ] **Step 5 - OSS-07 (medium)**: Contribution guide describes DCO certification as a license instead of identifying MIT as the inbound license
  - [ ] **5.1**: Confirm the intended inbound=outbound MIT policy with the project owner; obtain legal review if policy is uncertain.
  - [ ] **5.2**: Correct CONTRIBUTING.md wording to separate DCO provenance certification from MIT licensing without introducing a CLA.
  - [ ] **5.3**: Recheck LICENSE, REUSE.toml, the installed commit-msg hook and the DCO CI gate for consistent language and behavior.
- [ ] **Step 6 - OSS-04 (low)**: Contributor-facing issue and pull request response targets disagree with maintainer commitments
  - [ ] **6.1**: Ask the maintainer which triage and review response targets are sustainable.
  - [ ] **6.2**: Align CONTRIBUTING.md and MAINTAINERS.md to the same targets and clarify business versus calendar days.
  - [ ] **6.3**: Check the issue templates and contributor links reference the correct response policy.
- [ ] **Step 7 - OSS-06 (low)**: Funding document promises donor transparency without a public reporting cadence or location
  - [ ] **7.1**: Ask the owner whether sponsorship is active and what aggregate amounts can be disclosed without exposing donor identities.
  - [ ] **7.2**: If donations are accepted, document a public reporting location and periodic summary policy in GOVERNANCE.md; keep sponsor preferences separate from roadmap decisions.
  - [ ] **7.3**: Verify .github/FUNDING.yml and public documentation point to the approved channel without claiming unverified balances.
- [ ] **Step 8 - OSS-08 (low)**: README entry page has no direct links to contribution, governance, conduct or security policies
  - [ ] **8.1**: Add concise links to CONTRIBUTING.md, GOVERNANCE.md, CODE_OF_CONDUCT.md, MAINTAINERS.md and SECURITY.md to the README landing page.
  - [ ] **8.2**: Check each link locally and keep the handbook reference links intact.

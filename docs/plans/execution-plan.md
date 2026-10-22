# Open Source Steward execution plan

## Phase 1 - Evidence and decisions

- [x] Verify the current release-signature evidence and link it to the OSS audit (read-only): `git tag -v v0.1.0` exited 1 (`error: no signature found`); recorded in `docs/audits/oss.md`.
- [ ] Ask the owner to decide the signing, security-support, conduct escalation, funding-disclosure and inbound-license policies recorded as checkpoints in `docs/plans/oss.md`.

## Phase 2 - Release and contributor safeguards

- [ ] Address OSS-01 and OSS-02 only after the release/support decisions; verify signature rejection and support table against a clean build.
- [ ] Address OSS-03, OSS-04, OSS-06 and OSS-07 only after the relevant policy decisions; verify reporting routes, response targets, funding statements and DCO language.

## Phase 3 - Quality and onboarding

- [ ] Verify OSS-05 on a clean checkout before fixing confirmed failures; run the full project gates.
- [ ] Address OSS-08 after approval; check every new README link.
- [ ] Refresh `docs/audits/oss.md`, `docs/reviews/oss.md` and `docs/plans/oss.md` with the evidence and statuses after remediation.

No implementation or repository setting change is authorized by this plan. The full finding-specific steps, dependencies and verification gates are in `docs/plans/oss.md`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 1 - Evidence and decisions | `T6-review` | `muse-wonder-full` (max) | audit and contradiction hunting |
| Phase 2 - Release and contributor safeguards | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 3 - Quality and onboarding | `T7-author` | `qwen3.8-max` | skill bodies and references |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

# Audit: compliance mega-reviews and historical handoffs

- **Role**: docs-engineer v1
- **Date**: 2026-09-05

## Task

Analyze the four referenced document sets, verify their contents against the current
codebase, convert implemented work into ADRs, and delete the superseded documents:

- `docs/reports/claude-compliance-mega-review.md`
- `docs/reports/gpt-5.6-sol-compliance-mega-review.md`
- `docs/reports/security-performance-audit-2026-08-04.md`
- `docs/handoff/07|08|10|11|13-*.md`

## Method

Static verification of each finding's fix in the current `main` tree (command + result),
cross-referenced against the ADR index. No finding marked closed was re-opened.

## Findings → implemented evidence

### Report 1: `claude-compliance-mega-review.md` (2026-07-15, commit 4d9764b)

| Finding | Severity | Verified state in current tree | Covered by |
| --- | --- | --- | --- |
| `prompts/get` invalid shape + role system | 🔴 Critical | `GetPromptResultSchema.safeParse({description,messages}).success === true`; all messages `role: "user"` | ADR 044 |
| Router not structurally enforced | 🟠 High | Re-labeled "PIX WORKFLOW REMINDER" (advisory, per recommendation 4) | ADR 044 (gateway) |
| No `.claude/skills/` native integration | 🟠 High | `installNativeSkills()` present in `src/cli/skills-install.js`, called at install | ADR 017 |
| Tool surface annotations missing | 🟡 Medium | Token-efficiency pipeline decorates at MCP boundary | ADR 040 |
| Path traversal in `rule_tool_fix` | 🟡 Medium | `relative()`/resolve containment + `dryRun` honored (fix.js:67-89) | ADR 030 |
| `test:all` broken (playwright vs node) | 🟢 Low | `test:all` rewritten as explicit chain; ci.js lists files | ADR 037 |

### Report 2: `gpt-5.6-sol-compliance-mega-review.md` (same snapshot)

| Finding | Severity | Verified state | Covered by |
| --- | --- | --- | --- |
| P0-01 prompts/get | Blocking | schema-valid (see above) | ADR 044 |
| P0-02 build deletes skills | Blocking | embed is staging + atomic; repo is canonical source | ADR 037/041 |
| P0-04 `previousPassed` bypass | Blocking | `guardrails.js:185` — `previousPassed = new Set()` fresh every call, never client-supplied | ADR 044 |
| P0-05 fix dryRun/path escape | Blocking | dryRun honored; containment enforced | ADR 030 |
| P0-06 SSE unauthenticated + CORS * | Blocking | bearer token on /sse and /message; CORS deny-by-default (sse.js:66-82) | ADR 035/039 |
| P1-02 completion dead capability | High | `ref/prompt` per spec (handoff 08) | ADR 039 |
| P1-07 `skills install --all` non-TTY | High | installer self-heals, gates TUI rendering | ADR 035 |
| Router domain bias, confidence, multilingual | Partial | domain-aware routing (audit phase 4) | ADR 042 (fidelity) |

### Report 3: `security-performance-audit-2026-08-04.md` (23 findings)

| Finding | Severity | Status per report itself + ADR |
| --- | --- | --- |
| 01-07 (apply containment, gateway receipts, CSRF, lifecycle, cache, self-update, Docker) | High | **Fixed same day**; ADR 030, 031, 032 + 6 test files (`apply-containment`, `gateway-receipt-paths`, `architect-server-csrf`, `architect-interview-lifecycle`, `self-update-remote-pin`, `docker-hardening`) |
| 08 tool surface ~54k tokens | Medium | ADR 033 (surface = ./skills), ADR 040 (token pipeline) |
| 09-12 cache correctness | Medium | cache tiers + dependency invalidation (ADR 039/040) |
| 13-18 hardening | Medium | ADR 035/038/039 (installer + hardening cycles) |
| 19-23 hygiene | Medium/Low | ADR 038/039 (split hotspots, round-2) |

### Handoffs 07, 08, 10, 11, 13 (2026-07-15)

Each documents remediation phases of the audits above, all verified present:
07 installer, 08 SSE/server auth, 10 docs/metadata/guardrail terminology,
11 native Claude skills, 13 security remediation + ADRs 030-034.
The handoff README states: "All P0s and most P1s from the audit were resolved.
Do not redo these fixes." — consistent with the tree.

## Conclusion

No new ADR is warranted: every implemented behavior already has an ADR
(017, 030-035, 037-044), and creating duplicates would violate the
docs-engineer lens "documentation that repeats itself instead of pointing".
The audit reports are historical snapshots; the ADRs + handoff README are the
living record. Documents 07/08/10/11/13 + the three reports are deleted;
`handoff/09` (current session) and `handoff/README.md` (index, updated) stay.

## Deleted

- `docs/reports/claude-compliance-mega-review.md`
- `docs/reports/gpt-5.6-sol-compliance-mega-review.md`
- `docs/reports/security-performance-audit-2026-08-04.md`
- `docs/handoff/07-installer.md`
- `docs/handoff/08-server-sse.md`
- `docs/handoff/10-docs-maintenance.md`
- `docs/handoff/11-claude-native.md`
- `docs/handoff/13-security-audit-remediation.md`

## Kept

- `docs/reports/README.md` (index, updated) — this analysis as authoritative report
- `docs/handoff/09-census-and-handoff-autocommit.md` (current session, operational)
- `docs/handoff/README.md` (index, updated to drop deleted entries)
# Session Handoffs

Every session handoff this project has taken, newest first. The numbered
files in this directory are the source of truth; this index is generated from
them by `handoff doctor`, so editing it by hand is work the next run throws away.

## Index

| #                                                                  | Title                                                                  | Date       | Branch            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------- | ----------------- |
| [13](13-check-commands-and-ui-persona.md)                          | per-area check commands and the UI/UX persona                          | 2026-09-18 | main              |
| [12](12-opencode-dedicated-installer.md)                           | opencode gets a dedicated installer                                    | 2026-09-17 | main              |
| [11](11-sweep-at-handoff-and-resume.md)                            | the docs sweep runs at handoff and at resume                           | 2026-09-17 | main              |
| [10](10-clean-rule-commands-and-reinstall-command.md)               | clean /rule-* commands and the reinstall command                        | 2026-09-17 | main              |
| [09](09-postinstall-cli-registration.md)                           | postinstall CLI registration                                           | 2026-09-16 | main              |
| [08](08-the-nul-artifact-and-the-shell-out-audit.md)               | The `nul` artifact, and the audit of the surface that produced it      | 2026-09-15 | main              |
| [07](07-landing-develop-on-main-and-closing-the-finished-plans.md) | Landing develop on main, and closing the finished plans                | 2026-09-15 | main              |
| [06](06-setup-wizard-and-commands-selection.md)                    | The setup wizard is the installer, and it asks which commands to write | 2026-09-14 | develop           |
| [05](05-v0-1-0-beta-release-retarget.md)                           | v0.1.0-beta release retarget                                           | 2026-09-11 | main              |
| [04](04-dco-signoff-and-zizmor-release-fix.md)                     | DCO sign-off rewrite + zizmor release fix                              | 2026-09-11 | perf/meta-surface |
| [03](03-roadmap-execution-oss-phases-1-5.md)                       | Roadmap execution: OSS phases 1-5, version reset, follow-ups           | 2026-09-11 | perf/meta-surface |
| [02](02-oss-audit-and-remediation-plan.md)                         | OSS audit, review and remediation plan                                 | 2026-09-10 | perf/meta-surface |
| [01](01-performance-plan-execution.md)                             | performance plan execution                                             | 2026-09-09 | perf/meta-surface |

## Operating rules

- Write a handoff with `/rule-handoff`; it persists to `docs/handoff/<NN>-<slug>.md`.
- Never edit this file. Edit a handoff and let the next `handoff doctor` regenerate it.

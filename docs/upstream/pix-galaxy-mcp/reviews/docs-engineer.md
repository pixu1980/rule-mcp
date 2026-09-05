# docs-engineer review

- **Role**: docs-engineer v1
- **Date**: 2026-09-04

Findings distilled from [the audit](../audits/docs-engineer.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status   | Evidence                         | Summary                                                                                                          |
| ------- | -------- | -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| DOC-7   | low      | resolved | docs/audits/docs-engineer.md#web | An ADR names rule-mcp as its author, where outside practice asks for a person accountable for the decision |
| DOC-8   | low      | resolved | docs/audits/docs-engineer.md#web | No ADR states what would make it stop holding, so nothing says when to revisit one                               |

## What each finding means

**DOC-7 is closed: the author is a person.** `adrAuthor()` reads the git
identity, both writing paths use it, and the 77 ADRs written before it were
backfilled from the commit that added each file. The tool name survives as the
fallback for a machine with no identity configured, which is the honest answer
there: nobody to name. `handoff doctor` reports and repairs any ADR that drifts
back, so this stays true without anybody watching it (ADRs 086, 087).

**DOC-8 is closed for new decisions, deliberately not backfilled.** The ADR
template writes a "What would end this" section, and 5 ADRs carry one. The 78
written before it are untouched: the section is worth having because the
assumption is clear while the decision is being taken, and writing one a year
later would be a guess dressed as a record.

The six findings the first run opened, and the two this table shows resolved,
are the whole history of this role's findings: nothing is open, so the plan is
gone rather than empty.

# docs-engineer audit

- **Role**: docs-engineer v1
- **Date**: 2026-09-04

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

Third run: the two findings the second run recorded as practices this repository
had not adopted are now adopted, and this run measures that rather than
restating it.

| What was measured                        | How                                                     | Result                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whether an ADR names a person            | `grep -l '^- \*\*Author' docs/adr/[0-9][0-9][0-9]-*.md` | **80 of 83 carry the bullet and every one names a person**; the other 3 predate it and carry `**Deciders**: Project owner`. No Author field names a tool |
| Whether the writer still can name a tool | `adrAuthor()` with an empty git identity                | falls back to `rule-mcp`, which is the only path left to that value                                                                                |
| Whether the doctor keeps it that way     | `rule-mcp handoff doctor`                         | reports the ADRs whose author is a tool or nobody, and exits 1 on a dry run that finds any                                                               |
| Whether an ADR says what would end it    | `grep -l 'What would end this' docs/adr`                | **5 of 83**: the template writes it, and the 78 written before it are not backfilled                                                                     |

Second run, for comparison. It answered the two questions the previous audits recorded as unresolved,
and consulted outside practice, which the role's contract asks for and neither
earlier run did.

| What was measured                          | How                                                                                | Result                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Which tools docs/02 owes an entry          | `entryPathOf()` from the registry, against `docs/02-tools-operations.md`           | action **15**, of which **1 absent**: `pix_process_handon`; skill **91**, of which 89 absent |
| Whether a claimed supersession is answered | scan every ADR for `supersedes\|updates\|replaces NNN`, then look for the backlink | **every claim has a backlink**                                                                   |
| Whether an ADR names a person              | `grep -c "Author.*rule-mcp" docs/adr`                                        | every ADR names the tool, not a person                                                           |
| Whether an ADR says what would end it      | scan for a drift, revisit or expiry statement                                      | **none**                                                                                         |

<a id="web"></a>

## Sources consulted

- [Architectural Decision Records](https://adr.github.io/) - the format's own home, on superseding rather than editing
- [Architecture Decision Records: The 2026 Guide](https://www.catio.tech/blog/architecture-decision-record) - systems now move faster than the corpus describing them; agents cannot tell whether a decision still holds
- [Architectural Decision Records - The Complete Guide](https://techdebt.best/architectural-decisions/) - the most common defect is a reversed decision nobody wrote down, the earlier record still reading accepted; name an accountable owner; write the drift triggers while the assumptions are fresh
- [Martin Fowler, Architecture Decision Record](https://www.martinfowler.com/bliki/ArchitectureDecisionRecord.html) - the original framing
- [GOV.UK, 0001 record architecture decisions](https://docs.publishing.service.gov.uk/repos/govuk-infrastructure/architecture/decisions/0001-record-architecture-decisions.html) - a working log in production

## The two questions the earlier runs left open

- **Do the ten area tools belong in `docs/02`?** No. `entryPathOf()` classifies them as
  **skill** tools, and skill tools are documented by the `pix_<area>_<skill>` pattern
  rather than one row each. The previous audit guessed the split from a name prefix and
  reported an artifact. Measured with the registry instead, the same check found a real
  gap: `pix_process_handon` is an action tool and was documented nowhere.
- **What does outside practice add?** The defect it puts first is the one this repository
  had: 069 kept its definitions while 074, 078 and 079 replaced them, and nothing pointed
  forward. That is now a gate rather than a habit. Two of its other recommendations this
  repository does not follow, recorded as DOC-7 and DOC-8.

## What could not be concluded

- Nothing this run. Both previously open questions are answered above.

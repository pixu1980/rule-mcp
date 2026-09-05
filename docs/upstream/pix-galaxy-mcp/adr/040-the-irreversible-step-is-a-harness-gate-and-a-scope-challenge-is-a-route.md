# 040: The irreversible step is a harness gate, and a scope challenge is a route

- **Date**: 2026-08-11
- **Status**: accepted
- **Tags**: over-engineering, guardrails, hooks, routing, migrations, harness
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Session analysis of a real payment feature (4 sessions, 41 user turns) measured where over-engineering actually costs. Seven turns out of 41 were course corrections, and the most expensive single episode was a schema: seven columns, a new PaymentWebhookEvent table and five indexes, written at 19:37 and applied by `prisma migrate deploy` at 19:38. It was reviewed at 05:23 the next morning, and by then ten hours of code sat on top; the correction removed four columns, the whole table and four indexes. The three cheap episodes were all caught on a plan document, where a correction costs one turn. Replaying that session against the guardrails shipped the day before showed two failures: `no-speculative-audit-table` passed the migration, because it matched `_events` and the schema is Prisma PascalCase; and the user's own corrective prompt ("can we avoid editing so much the payment database schema... we are over engineering") routed to a backend skill, because the domain nouns outscored the simplicity signal.

## Decision

Three changes, each aimed at one measured failure. First, the guardrail now tokenises table names on case boundaries as well as separators and reads Prisma `model` blocks alongside SQL `CREATE TABLE`, so the artifact that motivated the rule actually fails it - verified against both files from the session. Second, the router gains a reduction-signal override with the same shape as the existing commit override: a prompt containing "over engineering", "can we avoid", "do we need", "reduce complexity" and similar routes to rule-process-simplicity while the domain skills keep their score and stay in alternatives, and the ADR followup is suppressed, because a request to remove something is not a decision to document. Third, the confirmation moves into the harness: `install --agent claude` writes one PreToolUse hook on Bash that asks before any ORM migration command and reports guardrail failures on the staged files before a commit. The hook answers "ask", never "deny". The decision logic is `rule-mcp guard bash`, reading the payload on stdin so the hook needs no jq and stays unit-testable.

## Consequences

Positive: all four corrective prompts from the real sessions now route to the simplicity skill with no ADR followup; the episode's migration and Prisma schema both fail pix_check; the point of no return asks before it passes, which is the only intervention that could have saved the most expensive turn. Negative: the hook spawns a Node process on every Bash call in Claude Code (one spawn, 60s timeout); it writes to the user's ~/.claude/settings.json, merging rather than replacing, and `--no-hooks` opts out; the reduction override means a prompt like "remove the unused import" routes to simplicity rather than to a domain skill, which is a deliberate trade. Untouched: routing for build-shaped schema prompts still favors a backend skill over the data family, and nothing fires at all when the model never calls a rule tool - the session with the highest correction density opened without routing.

## Alternatives Considered

1. Keep the migration confirmation in the workflow reminder - rejected: the reminder was already in context eight minutes before the schema was written and did not stop the command. A step the model has to remember is not a gate.
1. Deny the migration outright instead of asking - rejected: a false positive would wedge legitimate work, and the judgment belongs to the person in the room.
1. Two hooks, one per concern, with an `if: Bash(git commit*)` filter - rejected: two process spawns per Bash call, and that filter misses `git -C path commit`. One entry decides both.
1. Broaden the guardrail to any new table with no reader - rejected: in a migration file nothing references the table by construction, so every migration would fail. The audit/history/event name shape keeps the rule high-precision.
1. Add a guardrail for unnecessary columns - rejected: whether a requested column is necessary is not a static property. The migration hook asks the three questions instead, and the simplicity skill carries the checklist.

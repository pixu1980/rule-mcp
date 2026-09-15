---
name: rule-process-simplicity
description: >-
  Use before and during implementation to keep the change minimal. Covers the scope contract, the over-engineering catalog, the removal pass, and when a structural decision earns an ADR instead of code.
tags:
  - simplicity
  - scope
  - yagni
  - over-engineering
  - planning
frameworks: [all]
guardrails: [no-placeholder-implementation, no-speculative-audit-table, no-suppressed-errors]
---

# rule-process-simplicity - Build only what was asked

## Purpose

Large reasoning models over-build. Given "add a payment method", they produce a
payments table plus four columns nobody asked for, an audit table, a provider
interface with one implementation, and a feature flag that is never read. Every
piece looks defensible in isolation; together they are a schema the team now
has to maintain and a review the user has to fight.

The failure is not intelligence, it is the absence of a stated boundary. This
skill is that boundary.

## Hard constraints

1. **Implement exactly what the request states.** Not the generalized version,
   not the version that anticipates next quarter.
2. **Extra scope is proposed, never written.** If you believe something is
   missing, say so in one sentence and let the user decide. A proposal costs a
   line; an unrequested table costs a migration, a review, and a rollback.
3. **Declare the change set before writing code**: the files you will touch, and
   an explicit `out of scope` list. The list is the deliverable that makes
   over-building visible while it is still cheap.
4. **One implementation means no abstraction.** Interfaces, base classes,
   registries, and strategy objects arrive with the second caller, not the first.
5. **No code for an imagined future.** No "for future use", no parked
   implementations in comments, no flags that nothing reads.
6. **When in doubt, ship the smaller version** and list what you left out.

## The over-engineering catalog

These are the things that must not appear unless the request named them:

| Category      | Typical slop                                                                                         | What to do instead                                         |
| ------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Schema        | extra columns "while we're here", audit/history/soft-delete tables, indexes for hypothetical queries | Add the columns the feature reads or writes. Nothing else. |
| Abstraction   | interface + one implementation, factory for one product, generic hook with one caller                | Write the concrete thing. Extract on the second caller.    |
| Configuration | feature flags, env vars, options objects nothing reads                                               | Hardcode it. A constant is a flag you can grep.            |
| Resilience    | retries, backoff, circuit breakers, caching added preemptively                                       | Add when a failure or a measured cost exists.              |
| Structure     | new service, new package, new layer, barrel files for two exports                                    | Put it next to the code that uses it.                      |
| Process       | migration split into three, backfill script for empty tables                                         | One migration, no backfill until there is data.            |

## Schema changes

Schema is where over-building costs the most, because an applied migration is
the point of no return: after it, the code is built on top and removing a column
is a second migration plus a rewrite. Answer these **before** writing the
migration, in the plan, one line each.

For every new column:

1. **Who writes it?** Name the code path. "The provider response has this field"
   is not an answer - something has to store it deliberately.
2. **Who reads it?** Name the query, the endpoint, or the job. No reader today
   means the column is a guess about tomorrow. Delete it.
3. **Which existing column already holds this value?** Check the table first. A
   second column mirroring an existing one is a copy that can disagree with its
   source, and the comment "kept for backwards compatibility" on a table nobody
   has written to yet is a tell.
4. **Is it derivable?** If yes, say from what, and keep it only when the
   derivation crosses several tables _and_ something indexes or filters on it.

For every new table:

- Name the consumer. An append-only table nothing queries is a log you are not
  reading. `rule_tool_check` fails on this (`no-speculative-audit-table`, covering
  both SQL and Prisma models).
- If the reason is deduplication, idempotency or retries, check whether the
  queue, the provider, or a unique constraint already gives you that.

For every new index: name the query it serves, and check it is not a prefix of
an index you are already adding.

Defensive guards are not over-engineering. A migration that asserts the table is
empty before adding a `NOT NULL` column in one step is verifying the assumption
it stands on - keep it.

State the answers, then run the migration. A column removed in the plan costs a
sentence; the same column removed after the migration is applied costs the
migration, the rollback, and everything written on top of it.

## Workflow

1. Restate the request in one sentence. If your restatement is longer than the
   request, you have already added scope.
2. List `files_to_change` and `out_of_scope`. Show both before coding.
3. Implement. Write failing tests first (see
   [rule-devops-testing](../rule-devops-testing/SKILL.md)).
4. Run the removal pass (below) on your own diff.
5. Run `rule_tool_check`. The simplicity guardrails
   (`no-speculative-audit-table`, `no-future-use-code`, `no-commented-out-code`)
   block completion.
6. If the change is structural, record it with
   [rule-process-adr](../rule-process-adr/SKILL.md) without waiting to be
   asked. Documentation of a decision is not scope creep; a table nobody
   requested is.

## The removal pass

Before declaring the work done, walk your own diff and ask, per hunk:

- Did the request ask for this, explicitly or by direct necessity?
- If I delete it, what breaks _today_? "Nothing yet" means delete it.
- Does this abstraction have two callers? If not, inline it.
- Does this column, flag, or table have a reader? If not, drop it.
- Is this comment explaining _why_, or is it parked code? Parked code goes.

Report what you removed. A diff that shrank during the removal pass is a
successful pass, not a wasted one.

## Answering "should I also..."

Never answer it by writing the code. Answer it in prose:

> Left out deliberately: an `orders_audit` table. Nothing reads it today; if you
> need change history, that is a separate decision worth an ADR.

## Clean code truths that look wrong until you have the scars: duplication, function length, comments, layers

Every rule below contradicts something taught as clean code. Each one is what
people conclude after maintaining the version that followed the rule.

**Duplication is cheaper than the wrong abstraction.** Two similar blocks are
easy to read and easy to change independently. One abstraction over both is easy
until the third caller needs different behavior, and then every caller pays for
a parameter it does not use. Wait for the third occurrence, and for the shape to
stop moving.

**A longer function can be cleaner than five small ones.** Splitting a linear
sequence into five named steps means five files to open to answer "what happens
here". Extract when a piece is reused, or independently testable, or genuinely
its own idea. Not to hit a line count.

**Explicit beats clever reuse.** A shared helper with four boolean parameters is
harder to read than four direct calls, and it makes every caller's behavior
depend on every other caller's requirements.

**Comments are not a failure when they preserve why.** Code states what it does.
It cannot state which alternative was rejected, which bug this ordering fixes, or
which upstream quirk this works around. Delete comments that restate the code;
keep the ones a future reader cannot reconstruct.

**Sometimes the cleanest refactor is stronger validation.** If a function is
defensive at five levels, the fix is usually one check at the boundary that makes
the invalid state impossible, not five tidier guards.

**More layers do not automatically create separation.** A repository that only
forwards to an ORM, a service that only forwards to a repository, and a
controller that only forwards to a service is one change spread across four
files. Separation means a boundary something can vary behind.

**Clean code is about the cost of the next change, not appearance.** The measure
is how much has to be understood and touched to make the change that will
actually be asked for.

## Practices that separate senior work

Less about advanced technique than about deciding in a different order.

1. **State what must remain true before writing the flow.** Naming the invariants
   first turns most of the flow into a consequence rather than a choice.
2. **Put the decision at the narrowest responsible boundary.** A rule enforced in
   three places has three ways to drift. Enforce it where it cannot be bypassed.
3. **Prefer explicit operations over flexible updates.** `approveOrder(id)` says
   what happened and what may change. `updateOrder(id, patch)` says nothing and
   can change anything.
4. **Separate reversible decisions from expensive ones.** A file layout is cheap
   to change. A schema, a public API and a data migration are not. Spend the
   deliberation where reversal is costly and move fast where it is not.
5. **Design the failure path with the success path.** Deciding what happens on
   timeout, partial write and retry afterwards means the answer has to fit the
   code that already exists.
6. **Use constraints and tests to preserve decisions.** A decision defended only
   by a comment is a decision with a deadline. A database constraint, a type, or
   a failing test survives the reviewer who was not in the discussion.
7. **Optimize for the next change, not the current demonstration.** The version
   that demos best is often the version that is hardest to modify.

## Writing code got faster, delivering software did not: the parts of the job that do not compress

Writing code got dramatically easier. Software engineering did not, and the two
were always different problems. Keeping them apart is what stops a team from
concluding that because generation is fast, delivery should be.

Below a handful of people in one room, none of this applies: no coordination
overhead, no review circles, compliance is a spreadsheet, and an agent is a
genuine multiplier. Run. Somewhere past a few dozen people the physics change.
Coordination cost arrives and never leaves, and it cannot be opted out of,
because growing is how the work reaches more people in the first place.

What generation did not repeal:

- **Maintainable code**, because somebody carries the pager for it.
- **A real rollout process**, because a bad deploy in a regulated environment is
  not a rollback, it is an incident report.
- **Tests that someone reads**, because customers ask to see the results.

And what got scarcer rather than cheaper: **deciding what to implement, and
defending that decision through an organization that has opinions.** Knowing the
right answer is a small fraction of the work. The rest is agreeing that the
artifact satisfies the actual requirement, getting the team that will own a piece
of it to agree, finding the budget and the people, and getting a decision from a
room where two of the parties are arguing about something from last year. No
generator does that, and the plan that skips it does not ship.

Two consequences worth acting on:

- **Stay hands-on, deliberately.** The moment you stop touching the code, your
  architecture opinions drift into fantasy, and you become the person who says
  "just add a flag" to a system where a flag costs three days. Shipping something
  small on purpose is what keeps a review honest.
- **Speed of writing is the wrong metric to optimize.** It measures the part that
  was already the easiest to explain. Optimize the decision that precedes it and
  the ownership that follows it.

## Code splitting and file size

Simplicity has a unit: the file. A file someone can read top to bottom in one
sitting stays honest; a file that cannot be read whole hides its coupling.

- **100 lines of code per file, with a +50 tolerance.** At 150 lines the file
  must be split - not negotiated. The tolerance absorbs a legitimate long
  function; it is not a second budget.
- **Split by meaning, never by count.** Each new file holds one nameable
  concern - one rule, one function, one command. A file named for its position
  (`js-1.js`, `parts-2.js`, `utils-3.js`) is a split that happened without a
  design decision; the name is the test. If you cannot name the piece, you have
  not found the seam yet.
- **Folders follow the barrel convention** (see rule-styleguide-patterns): the
  folder's `index.js` is the only public entry and carries no underscore;
  every implementation file inside is prefixed with `_`. Nesting to a third,
  fourth or fifth level is fine as long as every level is a theme, not a bucket.
- **Pure data is exempt, and says so in its name.** Word lists, criteria
  tables and test corpora gain nothing from being cut in half; name them
  `*.data.js` (or `*.corpus.mjs` / `*.fixture.mjs` in tests) and keep them
  whole. The exemption is for data only - a 500-line file with one function in
  it is not data.
- **The threshold ratchets.** Grandfathered files may only shrink; a fixed file
  leaves the allowlist and can never come back over the cap.

## Enforcement in this server

- The **workflow reminder** on every tool result states the minimal-change rule.
- The **router** returns a `scope_contract` with the forbidden-without-request
  list and asks you to declare `out_of_scope` first.
- **rule_tool_check** fails on speculative audit tables, future-use markers, and
  commented-out implementations.
- The **file-size budget test** (`tests/docs/file-size-budget.test.mjs`) holds
  this repository to the 150-line cap and the junk-name ban above; its ratchet
  of grandfathered files only ever shrinks.
- The **removal pass** is yours; nothing static can judge whether a requested
  field is necessary.

## See also

- [rule-process-adr](../rule-process-adr/SKILL.md) - record the decision instead of building for it
- [rule-process-code-review](../rule-process-code-review/SKILL.md) - reviewing someone else's scope creep
- [rule-styleguide-patterns](../rule-styleguide-patterns/SKILL.md) - when a pattern is actually warranted

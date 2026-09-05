# Handoff 04: the numbers say what they measure, phase C and D closed, one router command

- **Branch**: `feat/evolution`
- **Covers**: `2785f50..HEAD` (10 commits) on top of handoff 03
- **Date**: 2026-09-04
- **Nothing pushed.** All commits are local.
- **CI**: `pnpm run ci` green at head (exit 0), and it no longer needs a clean
  color environment to pass - see the doctor UI note below.

## What this session did

Handoff 03 left five items in order of leverage. All five are closed or
explicitly scoped, and two follow-ups it did not know about were closed with
them.

### Hardening 4.2, the reminder diet (ADR 073)

The reminder rode on every result: **30 of 30 calls, 3820 tokens, ~127 per
call** on a 30-call, 8-tool session measured on the decoration path. It now
goes out in full on the session's first result and as a one-liner every
`RULE_MCP_REMINDER_EVERY` (default 5) calls after it, with nothing in
between. **581 tokens, 7 reminders, -85%** against a 60% target. No rule was
dropped; both forms were shortened. `test/reminder-diet.test.mjs` carries the
before number as the divisor, so the claim is an assertion rather than a note.

### Hardening 4.3, the caveman verdict (ADR 074)

The measured zero was a **measurement bug, not a broken compressor**.
`saved.caveman` was booked as `core - final`, and `final` is the result after
the reminder was appended in the same step, so ~50 tokens removed against ~127
added clamped to zero. Compression is real and small: **418 of 21889 tokens
(1.9%)** on a corpus of real results, 0% on the router's JSON (skipped by
design), 0.6-4.1% on prose skill bodies. `finalizeResult` became `finalize()`,
which returns what the compression step alone removed. `test/caveman-efficacy.test.mjs`
is the eval: corpus saving above 1%, router JSON byte-for-byte, fences, URLs,
headings, table rows and inline code unchanged, idempotence.

### Personas C.2 and C.3 (ADR 075)

`pix_plan_docs` plus `src/core/review-docs.js` do the trio's bookkeeping:
skeletons, headers, merge, flip to resolved, prune, delete the plan when nothing
is open. **Reported means open** - that is what makes the merge a function of
one run's output instead of a status the model maintains. The review table is
the storage format and round-trips, so a `|` in a summary is escaped out and
back. C.3 extended the docs gate: `validateTrio()` checks headers,
audit<->review<->plan links, dangling finding ids, and a plan that outlived its
findings. Roles are discovered from `docs/audits/` and `docs/reviews/` only, so
dated files in `docs/plans/` are ordinary plans and are left alone.

### Personas B.5 and D.1 (ADR 076)

`rule-mcp roles list|show|new|deprecate|accept`. `new` and `deprecate`
write into the user layer through the same validator the loader uses, and the
embedded catalog is never edited: deprecating a built-in role writes the user's
own copy of it. D.1 closed the gap the 4.4 fence left: fencing stopped overlay
text being **obeyed**, not a clone deciding **which persona runs**. A
project-layer role is refused on first use by both plan tools - the writing one
before it writes - and the refusal shows the role in full, fenced, with the
command that accepts it. Acceptance lands in
`.rule-mcp/roles-accepted.json` keyed `id@version`.

### Hardening 4.5, partial and marked partial (no ADR; it changed no default)

A labeled corpus: **48 snippets over 24 of the 93 rules**, precision and recall
printed per rule, both required perfect. It found three real defects:

- `sql-injection` matched `db.query` only, so the same concatenation on
  `database.query` or `pool.query` passed - and this project's naming rules
  would call it `database`.
- `error-exposure` matched `res.` only, so
  `response.status(500).json({ stack: error.stack })` passed for the same reason.
- `js-comment-no-history` read "until this" as history and rejected a
  present-tense comment.

Second half: `test/fixtures/kpi-regression.jsonl` plus the KPI block it must
produce, with invariants, so the next redefinition of a reported number is a
decision instead of a drift.

### The router rename and the test-command overlap (ADR 077, updates 029)

`/rule` is the router, with **no alias** - the old file is pruned on the next
install or `agent-commands` run. The test commands collapsed to one:
`/rule-tdd` keeps the name and took the hand-written body and `scope`
argument that `/rule-write-tests` had. Auditing that overlap found the
prompts naming **two tools that never existed** (`pix_test_driven_development`,
`pix_find_skills`); both are fixed and `test/prompts.test.mjs` now checks
every prompt body against the tool registry.

### The two follow-ups ADR 074 wrote down (ADR 078)

A cache hit ran through the same `finalize` as a miss and recorded only the
cache saving; `reminderOverhead` was `final - core`, which nets the reminder
against the compression from the same step and read **zero** whenever
compression won. Both are measured at the step that causes them now. On 16
calls with 8 hits: **caveman 504 -> 1004 tokens, reminderOverhead 0 -> 511**.
The two figures are finally comparable, and compression is ahead about two
to one.

## New defaults a reader must know

| Default                 | Was                                     | Now                                                 | Escape hatch                      |
| ----------------------- | --------------------------------------- | --------------------------------------------------- | --------------------------------- |
| Workflow reminder       | every result, full once per tool        | full once a session, terse every 5th call           | `RULE_MCP_REMINDER_EVERY=1` |
| `savedBySource.caveman` | core minus final (always 0)             | measured across the compression step                | none - the old number was wrong   |
| `reminderOverhead`      | net growth (0 when compression won)     | measured across the reminder                        | none                              |
| Cache-hit telemetry     | cache saving only                       | core/final tokens, compression and reminder as well | none                              |
| Router command          | `/rule-mcp`                       | `/rule`, old file pruned                         | none by design (ADR 077)          |
| Test command            | `/rule-tdd` + `/rule-write-tests` | `/rule-tdd` only, with the hand-written body     | none                              |
| Project-layer role      | loaded silently                         | refused until `roles accept <id>` for that version  | none - it is the gate             |

Surface: **108 tools** (`pix_plan_docs` added), **34 commands** (router
renamed, one test command removed).

## Traps for the next session

- **Read a guardrail's `check` before labeling a snippet for it.** Five of
  seven assumptions were wrong: `no-css-classes` reads CSS blocks (the JSX case
  is `react-no-classname`), `semantic-html` wants a `<div>` wearing a semantic
  attribute, `js-throw-new-error` is about `throw Error(` without `new`,
  `no-commented-out-code` needs three consecutive code-ish comment lines, and
  `no-future-use-code` keys on marker phrases.
- **Generalizing a guardrail regex reintroduces backtracking.** Widening the
  receiver from `db.` to `\w+.` cost **12.9s and 6.4s** on the 1.1 ReDoS
  corpus, which caught it. Anchor on the literal (`.query(`) and bound every
  span (`[^"']{0,200}`).
- **The corpus coverage floor is a ratchet at 24 rules.** It may only go up,
  and the 69 rules without a snippet are printed on every run. Do not lower it
  to make a change pass.
- **A prompt may only name registered tools.** The new gate in
  `test/prompts.test.mjs` fails a prompt that names a tool before it exists,
  including one being added in the same change - register first.
- **The router's filename lives in eight installers.** Renaming it moved six
  committed assertions across Pi, Claude, Gemini, Cursor, Windsurf, Cline, VS
  Code and Devin. `pruneOrphanedCommands` also had to learn that the router is
  the one command with no hyphen after `rule`.
- **The three surface assertions still move together** when a tool is added:
  `minimal-tools` count, `skill-surface-embedded-only` ACTION set,
  `tool-surface-budget`. Headroom was ~5000 tokens of 20000 before
  `pix_plan_docs`.
- **`js-comment-no-history` is narrow on purpose and still collides.** It now
  needs a past-tense verb near "before/until this", but any new phrasing rule
  in that family deserves a corpus pair before it ships.
- **The trio gate is green because this repo has no trios.** `docs/audits/` and
  `docs/reviews/` do not exist yet; the first real persona run is what exercises
  `validateTrio` on live documents.
- **Tool results pass through caveman compression**, which drops articles: an
  assertion on returned text must match the substance, not the filler.

## Next, in order of leverage

1. **Decide what `saved.cache` means.** A hit books the replayed result's
   tokens as saved, but the model still reads every one of them - what a hit
   saves is recomputation. It is **26864 of 27868** `measuredSaved` on a
   16-call session, so it dominates a total labeled "tokens saved". Named in
   ADR 078 and deliberately not decided there.
2. **Hardening 4.5's remainder**: 69 rules with no labeled snippet. The harness
   and the ratchet exist; this is corpus work, and each rule read costs less
   now that the pattern is established.
3. **Personas D.3** (routing evals for "act as a `<role>`" phrasings). Its
   stated dependency B.4 is deferred by ADR 072, so target `pix_plan`
   instead of per-role skills.
4. **Hardening 3.2**: signed tags and CI-only publishing. Both need decisions
   outside this repository; `publishConfig.provenance` is already declared.
5. **A first real persona run**, which is also the only way to exercise C.3 and
   D.1 end to end on live documents rather than on fixtures.

## Conventions

Conventional commits **with a mandatory scope**; `pnpm run ci` (never
`pnpm ci`); English everywhere; exact pins at the latest release; an ADR for
every default change; failing tests before implementation.

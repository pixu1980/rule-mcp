# Handoff 05: the numbers say what they measure, a recording leaves the project, and the guardrails get a net

- **Branch**: `feat/evolution`
- **Covers**: `2785f50..HEAD` (25 commits), which is handoff 04's own range plus everything after it
- **Date**: 2026-09-04
- **Nothing pushed.** 148 commits are local on this branch.
- **CI**: `pnpm run ci` green at head (exit 0), **67.7s** where it was 118.2s.

Handoff 04 is superseded by this one: it listed D.3, `saved.cache` and four
loose ends as open, and all of them closed.

## What this session did

### The metrics stopped lying (ADRs 073, 074, 078, 079)

Four numbers this server reports about itself were wrong, each for its own
reason, and each is now measured where the work happens:

| Number                  | Was                              | Is                                                       |
| ----------------------- | -------------------------------- | -------------------------------------------------------- |
| Reminder overhead       | 3820 tokens, on 30 of 30 calls   | **581** tokens, 7 reminders, cadence configurable        |
| `savedBySource.caveman` | 0, always                        | **1004** on a 16-call session; the zero was the recorder |
| `reminderOverhead`      | net of compression, read 0       | **511**, measured across the reminder itself             |
| `saved.cache`           | 26864 of 27868 "tokens saved"    | **gone from the total**; reported as replayed output     |

The compression bug is the one worth remembering: `saved.caveman` was booked as
`core - final`, and `final` is the result **after** the reminder was appended in
the same step, so ~50 tokens removed against ~127 added clamped to zero. Both
effects are now measured at their own step.

### Personas: phases C and D closed (ADRs 075, 076 superseded, 082)

`pix_plan_docs` keeps the audit/review/plan trio deterministically - merge,
flip to resolved, prune, delete the plan when nothing is open - and `validateTrio`
gates it in `docs-scan`. The `roles` CLI writes overlays through the same
validator the loader uses. D.3 landed persona routing: `detectRole()` reads the
registry, so `agisci come un architetto software` resolves to `architect` where
it used to route to `unknown`.

**D.1 was built and then removed.** The project overlay layer went with ADR 082,
and the trust gate existed only for project-layer roles.

### Nothing is written into a project any more (ADR 082)

`./.rule-mcp/` is gone from the codebase - not unused, absent, with a test
that walks `src/` and fails if the ignore machinery reappears. A recording lives
in `~/.rule-mcp/projects/<name>-<hash>/`. This repository's 2.0MB moved
intact: **3535 telemetry lines** plus its exports. The git hooks, whose only
purpose was keeping that directory out of commits, keep their removal path and
nothing else.

### Performance, measured before touching anything (ADR 081)

- The 25.8s suite is `process-hygiene`, **measured** rather than inferred.
- The 45 `node:test` suites run as one invocation: 39.7s to 26.8s, isolation
  unchanged because node already gives each file its own process.
- `self-update-throttle` 25.3s to **7.9s**: its stub slept 2s on every git
  subcommand, and `execFileSync` waits for the pipe a fire-and-forget fetch
  leaves open.
- The BM25 index is cached on disk: 95ms to **18ms**, a routed CLI call 0.76s to
  **0.28s**.

### The guardrails got a net, and it keeps finding bugs (hardening 4.5, partial)

**76 of 93 rules**, 152 labeled snippets, precision and recall perfect on all of
them. Four real defects surfaced: `sql-injection` and `error-exposure` only
matched abbreviated receivers (`db.`, `res.`), `js-comment-no-history` read
"until this" as history, and `cors-explicit` skipped `cors({ origin: "*" })`
entirely because it guarded on empty parens.

### Two persona runs, for real

`docs-engineer` found nine wrong counts in the docs, three undocumented env
vars, an unmarked ADR reversal and NUL bytes that made two source files grep as
binary - which had silently truncated the audit's own first measurement.
`performance` produced the numbers above. Both trios are in `docs/audits/`,
`docs/reviews/`, `docs/plans/`.

## New defaults a reader must know

| Default                 | Was                            | Now                                                    | Escape hatch                      |
| ----------------------- | ------------------------------ | ------------------------------------------------------ | --------------------------------- |
| Workflow reminder       | every result                   | full once a session, terse every 5th call              | `RULE_MCP_REMINDER_EVERY=1` |
| Project recording       | `./.rule-mcp/`           | `~/.rule-mcp/projects/<slug>/`                   | `RULE_MCP_STATE_DIR`        |
| Router command          | `/rule-mcp`              | `/rule`                                             | none, by design (ADR 077)         |
| Test command            | `tdd` + `write-tests`          | `/rule-tdd` only                                    | none                              |
| Role layers             | project > user > embedded      | user > embedded                                        | none (ADR 082)                    |
| ci                      | 76 sequential steps, 118.2s    | one parallel `node --test` plus the scripts, 67.7s     | none                              |
| Result cache key        | package version                | version plus a signature of `src/`                     | `RULE_MCP_NO_CACHE=1`       |
| ADR template            | context/decision/consequences  | plus **What would end this**                           | leave `--ends-when` unset         |

Surface: **108 tools**, **190 resources**, **33 prompts**, **34 commands**,
**78 ADRs**. The ADR count is files, not numbers: 082 is the highest number and
015, 019, 020 and 031 were deleted, so counting to the highest number claims
four ADRs that are not there.

## Traps for the next session

- **A background `pnpm run ci` reports the exit code of the last command in the
  chain, not of ci.** Two runs were reported green that had failed. Read the
  `CI EXIT=` line out of the log.
- **A tool result is not evidence about code you just changed.** The MCP server
  process holds the old module until it restarts; the reminder text and the
  handon parser both looked unchanged for that reason.
- **The result cache replays a core computed by older code** unless the code
  signature moves. It made a routing test pass for the wrong reason. Suites that
  measure behavior set `RULE_MCP_NO_CACHE=1`.
- **Read a guardrail's `check` before labeling a snippet for it.** Five of seven
  assumptions were wrong the first time, three of sixteen the second.
- **Generalizing a guardrail regex reintroduces backtracking**: widening a
  receiver cost 12.9s on the ReDoS corpus. Anchor on a literal, bound every span.
- **A test that relocates `RULE_MCP_STATE_DIR` does not relocate `HOME`.**
  The first version of the central layout wrote 24 test projects into the real
  home directory.
- **`js-comment-no-history` fires on "the old", "until this" and "used to"** in
  ordinary prose. Three commits this session were reworded, not fixed.
- **The trio's plan table takes a list of finding ids per step.** The gate
  rejected a plan written by the person who wrote the gate.
- **Changing a prompt's text does not change the installed commands.** The
  generated files under `~/.claude/commands/` and its eight siblings keep the old
  description until `rule-mcp agent-commands --sync` runs: `/rule-init`
  still advertised the gitignore rule and the hooks that ADR 082 removed. The
  registry is the source of truth; the installed copies are a build output.

## Next, in order of leverage

1. **Label the remaining 17 guardrail rules.** Four want a file tree rather than
   a snippet; the rest did not fire on any plausible pair, which is a gap in the
   corpus and not a claim about them.
2. **Make `process-hygiene` cheaper, or accept 25.6s as the floor.** It defines
   total ci time now. Gating it changes what a green run means, so it is the
   owner's call.
3. **Decide whether the skill registry is cacheable**: 263ms per invocation, the
   last large item in startup now that the index is cached.
4. **Hardening 3.2**: signed tags and CI-only publishing, both needing decisions
   outside this repository.
5. **DOC-7**: whether an ADR's `Author` field carries a person rather than this
   tool.
6. **148 unpushed commits.** Nothing has left this machine.

## Conventions

Conventional commits **with a mandatory scope**; `pnpm run ci` (never `pnpm ci`);
English everywhere; exact pins at the latest release; an ADR for every default
change, with a backlink on whatever it supersedes; failing tests before
implementation.

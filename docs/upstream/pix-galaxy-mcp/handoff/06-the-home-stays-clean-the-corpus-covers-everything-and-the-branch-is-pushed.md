# Handoff 06: the home directory stays clean, the corpus covers every rule, and the branch is finally pushed

- **Branch**: `feat/evolution`, now tracking `origin/feat/evolution`
- **Covers**: `94b1ae0..529e025` (7 commits)
- **Date**: 2026-09-04
- **Pushed.** 160 commits went to the remote for the first time. The merge
  request is not opened yet; GitLab offers the link on push.
- **CI**: `pnpm run ci` green at head (`CI EXIT=0`), **45.8s** where it was 67.7s.
- **Partly superseded by ADR 088**, taken later the same day: three frontend
  skills were removed, so the surface below reads 108 tools, 190 resources, 91
  skills and 93 guardrail rules over 186 snippets where it is now **105, 184,
  88** and **84 over 168**. Everything else here still holds.

Handoff 05 is superseded by this one. Its numbering was verified rather than
trusted: five of its claims held, two did not, and the ADR count was wrong by
four.

## What this session did

### Nothing writes into the real home directory any more (ADRs 083, 085)

Six suites pinned neither `RULE_MCP_STATE_DIR` nor `HOME`, so every ci
run filed about twenty fixture recordings in the person's own
`~/.rule-mcp/projects/`. Measured there before the fix: 192 `clone-*`,
16 `rule-init-*`, 8 `rule-handon-*`, 8 `acme-app-*`, 8 `nowhere-*`, 229 of
them empty. Each suite now pins `HOME` to a temp directory - `homedir()` reads
it, so no new knob - and **267 leftover directories were removed**. What
survives in that directory is four projects, one of them this repository's own
recording at 4632 telemetry lines.

The guard is `test/home-recording-leak.test.mjs`. It runs three suites for real
and compares the real projects root before and after; the three self-update
suites are covered instead by `test/fixtures/git-sandbox.mjs`, which **refuses
to build a sandbox while `HOME` is the real home** and says how to fix it. A
full ci run now adds zero directories.

### The guardrail corpus covers all 93 rules, and found a fifth bug (ADR 084)

The 17 unlabeled rules hid one: `css-comments-required` probed for CSS rules
with `/[\w-]\s*\{/`, which never matches `[data-part="card"] {` - the selector
this styleguide asks everyone to write - so an undocumented rule stylesheet
passed the rule that exists to document it. Coverage is **93 of 93 rules over
186 snippets**, precision and recall perfect on every one, and the floor equals
the rule count: a rule shipped without a labeled pair fails the suite. The four
rules expected to need a file tree were all answerable from code plus a file
name.

### ci is 45.8s, and neither cause was the work the tests do (ADR 085)

- `process-hygiene` reported 25.5s for seven tests that finish in 6.2. Five
  `Promise.race` calls left their losing `setTimeout` armed, and the event loop
  waited 19 seconds for the longest one. Cleared through one `within` helper:
  **6.3s**, and the suite asserts no timer is left armed.
- The three self-update suites built eighteen git sandboxes at **746ms** each.
  A sandbox is now a **39ms** copy of one template with `origin` re-pointed at
  its own upstream: 9.3s to 5.0s, 8.0s to 6.0s, 5.1s to 2.3s.

### An ADR names the person who decided (ADRs 086, 087)

`adrAuthor()` reads `user.name` and `user.email` from git through an injectable
reader; a machine with no identity falls back to the tool rather than inventing
a person. **77 existing ADRs were backfilled** from the commit that added each
file, ten of which had no author line at all. ADRs 007 to 009 predate the bullet
header and already name their decider, so they were left alone.

`handoff doctor` keeps it that way: the plan carries the ADRs whose author is a
tool or nobody, `--fix` repairs them, and two other gaps closed with it -
`--fix-commits` now derives its renames from history when the plan has none
(the run after a committed `--fix`), refuses on a dirty tree the way
`filter-branch` silently does, and every step prints while it happens.

### The numbers, remeasured against the registries

| Claim in handoff 05               | Verdict                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 108 tools                         | true                                                                                                |
| 34 commands                       | true                                                                                                |
| 83 ADRs                           | **wrong**: 78 files then, 83 now; 082 was the highest number and 015, 019, 020 and 031 were deleted |
| `pnpm run ci` green               | true, re-run                                                                                        |
| Installed commands need a re-sync | **already done**: `/rule-init` was re-synced 4 Sep 17:21                                         |

`pix_process_handon` read the handoff correctly but reported "27 commits
since" against the range the document declares, not since it was written.

### The performance trio closed two of its three findings

PERF-1 is closed by the two fixes above. **PERF-2 is closed because its premise
does not reproduce**: it claimed 263ms of skill loading was the last large item
in startup, and the measurement is `loadAllSkills` 38ms of a 216ms invocation
(28ms on a second call) against 53ms of node boot and 51ms of importing the
module graph. A digest-keyed cache would recover about 30ms and add an
invalidation, so it was not built. PERF-3 stays open at 40ms per guardrail check.

## New defaults a reader must know

| Default                        | Was                  | Now                                    | Escape hatch           |
| ------------------------------ | -------------------- | -------------------------------------- | ---------------------- |
| A test suite's home            | the person's own     | a temp dir, pinned per suite           | none, by design        |
| A git sandbox in tests         | built, 746ms         | copied from one template, 39ms         | none                   |
| ADR author                     | `rule-mcp`     | the git identity, tool as fallback     | leave git unconfigured |
| `handoff doctor` dry run       | exits 1 on numbering | also exits 1 on a tool-named author    | `--fix`                |
| `handoff doctor --fix-commits` | needed a rename plan | runs on its own, derives from the slug | dirty tree refuses     |
| `handoff doctor` output        | summary only         | one line per step, as it happens       | none                   |
| Corpus coverage floor          | 76 of 93             | **93 of 93**                           | none                   |

Surface: **108 tools**, **190 resources**, **33 prompts**, **34 commands**,
**83 ADRs**, **93 guardrail rules** with 186 labeled snippets.

## Traps for the next session

- **A background `pnpm run ci` reports the exit code of the last command in the
  chain.** Read the `CI EXIT=` line. Still true, still the way two runs were
  reported green that had failed.
- **`js-comment-no-history` fires on "the old path"** in ordinary prose. Two
  comments this session were reworded, not fixed.
- **The repo is not prettier-clean**: 44 files fail `pnpm run format`, which is
  not in the ci chain. Running `--write` on a file you touched churns lines you
  did not, so format only what you added.
- **`git filter-branch` refuses on a dirty tree** and its message does not say
  so. `--fix-commits` now refuses first, with the reason.
- **A slug is the only witness a stale commit reference has.** Edit a slug and
  the number together and the reference stays stale by design.
- **`orphanedPathReferences` reads `%s` and `%B`**, and `%B` contains the
  subject, so one path matches twice per commit unless deduped.
- **The MCP server process holds the old module until it restarts.** A tool
  result is not evidence about code you just changed.

## Next, in order of leverage

1. **Open the merge request.** 160 commits are on the remote and nobody has
   reviewed them.
2. **PERF-3, or accept it**: 40ms per guardrail check over 93 rules, and the
   self-guardrail suite runs it over every file in `src/`.
3. **The new largest startup item is the import, not the reading**: 51ms of
   importing the skills module graph against 38ms of reading 91 files. Nothing
   measured what a dynamic import per rarely-used tool would move.
4. **Three ADRs still have no author bullet** (007, 008, 009). They carry
   `**Deciders**: Project owner` in a header shape that predates the bullets,
   and converting them is a documentation decision, not a repair.
5. **Hardening 3.2 is out of the roadmap by decision**, not by oversight:
   signed tags and CI-only publishing need a key owner and a runner, and this
   repository does not publish from CI today.

## Conventions

Conventional commits **with a mandatory scope**; `pnpm run ci` (never `pnpm ci`);
English everywhere; exact pins at the latest release; an ADR for every default
change, with a backlink on whatever it supersedes; failing tests before
implementation.

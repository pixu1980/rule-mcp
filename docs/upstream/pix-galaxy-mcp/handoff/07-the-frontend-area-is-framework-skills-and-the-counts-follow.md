# Handoff 07: the frontend area is framework skills, every count follows, and the doctor repairs what it finds

- **Branch**: `feat/evolution`, tracking `origin/feat/evolution`
- **Covers**: `529e025..707fe4e` (5 commits, 167 files, 350 insertions, 11464 deletions)
- **Date**: 2026-09-04
- **Pushed**, all of it. 165 commits ahead of `origin/main`; the merge request is
  still not opened.
- **CI**: `pnpm run ci` green at head (`CI EXIT=0`), **48.0s**.

Handoff 06 stands except for its surface numbers, which ADR 088 replaced; it
carries a line saying so.

## What this session did

### The frontend area is framework skills and styleguides, nothing else (ADR 088)

The no-framework path was removed on the owner's decision, and with it
everything that served only that path: an editor extension and its `.vsix`, a
framework-specific guardrail group of nine rules and its map entry, eighteen
corpus snippets, five functions in `src/cli/install.js` and one phase in each of
`install.sh`, `uninstall.sh`, `install.ps1` and `uninstall.ps1`, the
cross-references in eleven skills, the rows in both hand-maintained indexes, and
a directive-syntax section in the HTML styleguide that documented a runtime this
repository no longer ships. `extensions/` no longer exists. **The installers now
write agent configuration and nothing else.**

The detector resolves an undetected project, meaning its `vanilla` key and its
fallback, to `rule-frontend`, the area skill. The framework skills describe
what they adapt as a store-and-signals architecture, which is what their mapping
tables always compared.

**What stayed, deliberately**: custom elements as a platform concept. The CSS,
JavaScript, naming and patterns styleguides still teach `customElements.define`,
tag selectors and shadow DOM, because that is the HTML standard and removing it
would gut them. The "template engine" in
`docs/plans/2026-09-03-review-personas.md` is the review-roles template
(`src/core/review-roles-template.js`), a different thing, untouched.

### The routing gap this leaves, measured

The prompt _"build a small widget in vanilla javascript with a reactive store,
no framework"_ routes to **`rule-frontend-react` at 100%**, with
`rule-frontend` second at 0.81. BM25 scores the store-and-signals vocabulary
the framework skills inherited, and nothing else carries it now. Giving
`rule-styleguide-javascript` that vocabulary would fix it; it was proposed
rather than written, because it edits a skill nobody asked to change.

### `handon` stopped over-reporting how far the repository moved

It counted `start..HEAD` and called the result "commits since", so the number
carried the size of the range the handoff itself describes. Handoff 05 was
reported as 27 commits since when 25 of them were its own work; handoff 06 as 9
when 7 were. A range with a fixed end is now counted from that end. A range
written `<sha>..HEAD` records no sha for where HEAD was, so it still counts from
the start and says which: _"9 commits in and since the range, which ends at
HEAD"_. **Write a fixed end in a handoff** and the number means what it says.

### The doctor repairs authors, and `--fix-commits` runs on its own (ADR 087)

Three gaps, all found by using the command. The plan now carries the ADRs whose
author names a tool or nobody, and `--fix` repairs them in each file's own
punctuation. `--fix-commits` no longer depends on the rename plan: with none it
derives the rename from history, because a slug survives a renumber, so a path
whose file is gone and whose slug matches exactly one file is a rename it can
state rather than guess. It refuses on a dirty tree, which is what
`filter-branch` does without saying why. And every step prints as it happens.

### DOC-7 and DOC-8 closed, and two plans say what happened

The docs-engineer trio has nothing open, so its plan file is gone rather than
empty: 80 of 84 ADRs carry the author bullet and every one names a person, the
other three predate the bullet and carry `**Deciders**: Project owner`. Five
ADRs say what would end them, and the ones written before the template did are
deliberately not backfilled. In the hardening plan, 4.5 is done and 3.2 is out
of scope by decision rather than by oversight.

### Every count followed the removal

Nine rules and eighteen snippets left with the skills, so every live document
claiming 93 rules over 186 snippets was describing a repository that no longer
exists. The performance trio and the hardening plan now read **84 over 168**.

## Surface

**105 tools**, **184 resources**, **33 prompts**, **34 commands**, **84 ADRs**,
**88 skills**, **84 guardrail rules** over **168 labeled snippets** - from 108,
190, 33, 34, 83, 91, 93 and 186 at handoff 06.

## Traps for the next session

- **Do not export `RULE_MCP_STATE_DIR` in the shell that runs ci.**
  `project-dir-central` asserts the default path under a pinned `HOME`, and an
  inherited override fails it. One ci run was reported red for that reason with
  nothing wrong in the code.
- **The `commit-msg` hook rejects the conventional-commits breaking marker**:
  `feat(scope)!:` is refused, only `type(scope):` passes. Put
  `BREAKING CHANGE:` in the body.
- **A message rewrite moves the shas a handoff names.** One commit subject on
  this branch was rewritten and force-pushed with a lease, which changed every
  sha after it: this handoff's own range had to be corrected, and a handoff
  naming a sha that is gone now reports that fact instead of reading as
  open-ended. The messages inherited from `main` were left alone by decision.
- **44 files fail `pnpm run format`, which is not in the ci chain.** Running
  `--write` on a file you touched churns lines you did not, so format only what
  you added.
- **A stdio MCP server does not come back when you kill it.** Claude Code does
  not respawn it; the client has to reconnect (`/mcp`). Until then the tools are
  absent, and a server started before an edit keeps advertising the old schema.
- **`js-comment-no-history` fires on "the old path"** in ordinary prose.
- Still true from handoff 06: read the `CI EXIT=` line out of a background ci
  log, and a tool result is not evidence about code you just changed.

## Next, in order of leverage

1. **Open the merge request.** 165 commits are on the remote and nobody has
   reviewed them. A description is drafted outside the repository; it predates
   ADR 088, so its counts need one pass.
2. **Decide the vanilla vocabulary**: give `rule-styleguide-javascript` the
   words that used to route elsewhere, or accept that a no-framework prompt
   lands on a framework skill.
3. **PERF-3, or accept it**: 40ms per guardrail check over 84 rules, run over
   every file in `src/` by the self-guardrail suite. It is the only open finding
   left in `docs/reviews/`.
4. **The largest startup item is the import, not the reading**: 51ms importing
   the skills module graph against 38ms reading the skills, inside a 216ms
   invocation. Nothing measured what a dynamic import per rarely-used tool would
   move.
5. **Decide whether `format` becomes a gate.** One churn commit buys a rule
   nobody has to remember.
6. **ADRs 007, 008 and 009** keep a header shape that predates the bullets.
   Normalizing them is a documentation decision, not a repair.

## Conventions

Conventional commits **with a mandatory scope**; `pnpm run ci` (never `pnpm ci`);
English everywhere; exact pins at the latest release; an ADR for every default
change, with a backlink on whatever it supersedes; failing tests before
implementation.

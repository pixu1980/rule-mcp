# 071: The census generates eight numbered documents and three fenced blocks inside the chapters a person writes

- **Date**: 2026-09-08
- **Status**: accepted
- **Tags**: docs, census, generator, tooling

- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The census generated six documents (07-skills through 12-personas) and refreshed two fenced blocks, but the guardrail rules and the resource surface were documented nowhere a reader could find them: 95 rules and 184 resources existed only in the code. The generator also depended on two hand-kept data files. `_env-vars.data.mjs` restated the env table in `docs/05-env-variables.md`, which is two copies of one fact, and the copy without a generator behind it goes stale first - it had already drifted, documenting `RULE_MCP_TOKENSAVE_AUTOTRACK` and `RULE_MCP_AUTO_UPDATE`, which nothing in `src/` or `bin/` reads, while five variables the code does read appeared in no table. `_labels.data.mjs` hand-wrote a purpose line per core tool beside the `description` the tool already declares. Formatting lived outside the generator: `package.json` and `.githooks/pre-commit` each carried an eight-path prettier invocation, and `tests/docs/census-generated.test.mjs` ran a third one over a temp copy of `docs/`, so three lists had to agree for the staleness check to mean anything. `docs/README.md` had a header row triplicated and advertised counts (96 skills, 112 tools) that the runtime had not matched for some time - the drift ADR 048 exists to remove.

## Decision

`docs/08-skills.md` through `docs/15-resources.md` are whole generated files, one inventory topic each, and `docs/01`, `docs/03` and `docs/05` carry `census:begin`/`census:end` fences the same run rewrites. Privacy leaves the numbered sequence for `docs/06-privacy.md`, so the generated documents are the tail of the handbook and `tests/docs/docs-handbook-numbering.test.mjs` can assert exactly that, plus a gapless sequence from `01` and a `docs/README.md` row per chapter. The generator formats its own output with the repository prettier settings and writes only the files that changed, so one invocation owns the bytes: `pnpm census` writes, `pnpm census:check` exits 1 on a stale file, `prebuild` and the pre-commit hook call the same entry point, and the staleness test compares `censusOutputs()` in memory rather than shelling out to prettier a second time. Both hand-kept data files are gone. The env block is derived by scanning `src/` and `bin/` for `RULE_MCP_*`, excluding co-located `__tests__` (ADR 067) because a test sets a variable rather than reads it, and it reports the disagreement in both directions - read but undocumented, and documented but read nowhere. Core tool purposes come from each tool's own `description`. The CLI document is rendered from the commander program itself, not from a registry declared beside it: commander owns both what parses and what `--help` prints, so a second declaration would be the copy that goes stale.

## Consequences

Eleven files are owned by the generator and must never be edited by hand: eight whole documents and the fenced blocks in three chapters. A new inventory topic is a new numbered file plus an entry in the census INDEX, which also updates the cross-links in the other seven, and the numbering test fails until the new document is the tail and `docs/README.md` lists it. The env scan depends on the literal `RULE_MCP_` prefix appearing in source, so a name assembled from string fragments would be missed. Renumbering moved six documents and made every prior link to `07`-`12` wrong; the links inside `docs/` were repointed, and anything outside the repository that deep-linked a chapter by number is broken. The hardcoded `01`..`12` list in `tests/docs/docs-accuracy.test.mjs` was deleted rather than extended, because a list of numbers is the copy that forgets the chapter added next. The pre-commit hook runs only where `.githooks` is installed into `.git/hooks`, and it exits early when prettier is absent, because a commit is not the place to fail over a missing dev dependency.

## What would end this

Assumption: the eight inventories are read separately. The split stops paying if they are always opened together, because then the cross-links are the only navigation anyone uses. The env scan stops holding the moment a variable name is built at runtime rather than written literally, which the undocumented count would show as a number that no longer matches the table. The commander-rendered CLI document stops being the right shape if the CLI ever drops the parser for hand-rolled argument reading, because the option descriptions and defaults would then have no declaration to render from.

## Alternatives Considered

1. Keep six documents and leave the guardrails and resources undocumented - 95 rules and 184 resources stay visible only in the code
1. Keep the numbering and append `13-guardrails` and `14-resources` - no renames, but privacy sits between the chapters a person writes and the ones the census owns, so the generated set is not the tail and the numbering test cannot say so
1. Keep prettier in `package.json`, the hook and the test - three path lists that must agree for the staleness check to mean anything
1. Port a hand-kept env data file beside the generator - a second list to keep in sync with the doc table, which is what drifted
1. Declare the CLI options in a registry the terminal and the census both render - the document would be right and the registry would be a second copy of what commander already parses

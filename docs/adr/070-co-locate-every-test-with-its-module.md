# 70. Co-locate every test with its module

## Status

accepted

## Context

191 suites lived under `tests/` while the module code they exercised grew under
`src/`. Every split, rename or cross-module edit forced a rewrite of two import
graphs, and leaves without a home drifted. The structural-hygiene plan asked
for total test co-location: a test belongs next to the code it pins, in
`src/<module>/__tests__/`.

## Decision

Move every unit and integration suite from `tests/<area>/...` into
`src/<area|<module>>/__tests__/`, preserving git rename history via `git mv`
and re-anchoring each relative import to the new depth (subtree-relative refs
are mirrored; repository-root refs are re-computed against the real file
system). `tests/docs/**` and `tests/e2e/**` stay: the docs doctor and the
Playwright end-to-end suite are repository-level infrastructure, not module
tests, and the e2e runner needs its own test harness. The suite runner
(`scripts/ci/run-tests/_suites.data.mjs`) now globs `src/**/__tests__` once;
adding a test edits no manifest.

## Consequences

One import graph per module, renames re-pointed by the file system instead of
by hand, and the runner no longer grows its glob list. Test code moved under
`src/` is excluded from the coverage instrument (its own branches would
otherwise move the ratchet), and the self-guardrails walk is scoped to
`src` with `node_modules`/`.git` skipped.

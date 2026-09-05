# 055: Cache freshness is per entry, not per namespace

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: cache, invalidation, skills, determinism, measurement

- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The cache namespace was `pkg.version : mtime of skills/`. One heading edited in one skill changed that mtime, the namespace no longer matched, and every stored entry for all 88 skills was dropped. On this repository, whose sessions mostly consist of editing skills, that made the cache close to ornamental: it was correct, and it was empty whenever it mattered. `loadAllSkills(force)` made it worse by calling `cacheClear()` outright, so the reload triggered by editing a skill emptied what the mtime had not already invalidated.

The mtime was doing a job it could not do well. It answered "has anything under `skills/` changed", which is a true and almost useless question, because the entry for a PostgreSQL prompt does not become wrong when the Svelte skill gains a section.

## Decision

Each entry records the content digests of the skills that produced it, and freshness is checked on the read that finds it. `skillDigest(name)` is the first 16 hex characters of a sha256 over that skill's `SKILL.md`, memoized per process and dropped on a reload. An entry is served only when every digest it recorded still matches; otherwise it is evicted there and then, so a stale answer is never served and the space is not held twice. A dependency that no longer resolves counts as changed, because a deleted skill cannot be shown to be unchanged and unverifiable is not the same as valid. The namespace is back to `pkg.version` alone, which is what it can honestly claim: a server upgrade may change output shape for reasons no content digest captures.

The digest lives in `tool-cache.js` rather than in `core/skills.js` because `skills.js` imports the router and the router imports the cache, so putting it there would close a cycle; invalidation is the only consumer anyway. `loadAllSkills(force)` now clears the digest memo instead of the cache, since clearing on reload would discard the benefit in precisely the case it was built for.

`dependenciesOf(name, args, result)` in the router attributes an answer to skills. Three cases are attributable: the router names the route it chose and the alternatives it offered, a skill tool is its own skill, and a check is the skill it checked. Four tools read no skill at all and are listed explicitly - the component templates, the compressor, the WCAG report and the stats reader - and depend on nothing, so no skill edit can reach them. Everything else is attributed to every skill, which is honest for `pix_search` and conservative for the rest. The failure mode of getting that list wrong is invalidating too much, which is exactly what the cache did for every entry until now, and never serving something stale.

## Consequences

Measured by `scripts/cache-report.mjs` after the routing corpus: 108 entries, and the worst single skill edit is `rule-platform-web` with 36 dependents, so **67% of the cache survives it against 0% before**. The report computes that from the recorded dependencies rather than by editing a file, so it is repeatable and touches nothing. `rule-platform-web` is the worst case because it appears as a routing alternative for many prompts, and those answers do include its sections, so the number is real rather than an artifact.

The stored entry shape changed from a bare result to `{ result, deps }`. A cache file written by an older server fails the namespace check anyway, because the old namespace carried the mtime, and the loader additionally skips any entry without the new shape rather than guessing what it depended on. Nothing migrates; a few entries are recomputed once.

One number is zero and worth watching: no entry currently depends on no skill, because the corpus pass only calls the router. A session that uses `pix_component` will produce entries that are permanently valid, and if that count stays at zero it means the template tools are never being cached, which would be a different finding.

## Alternatives Considered

1. Keep a global skills digest instead of the mtime. Rejected: it is the same all-or-nothing invalidation with a more accurate trigger, and the trigger was never the problem.
2. Record dependencies by watching which files the handler read. Rejected: it needs instrumentation around every read for a result three explicit cases already produce, and the conservative default covers the rest.
3. Keep `cacheClear()` on reload as a safety net. Rejected: a reload is caused by a skill edit, so the net would catch exactly the case the phase exists to fix.

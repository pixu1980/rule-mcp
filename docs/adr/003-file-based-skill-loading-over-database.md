# 003 — File-Based Skill Loading over Database

**Status**: Accepted  
**Date**: 2026-06-20  
**Deciders**: Project owner

## Context

Skills (SKILL.md files) need to be discoverable and queryable. Options:
- File-based: read SKILL.md from `~/.agents/skills/<name>/` or embedded `skills/` directory
- Database: store skill content in SQLite, PostgreSQL, etc.

## Decision

Use **file-based skill loading** with an in-memory LRU cache.

## Rationale

1. **Zero dependencies** - No database driver or migration system needed.
2. **Skill files are markdown** - Users can edit SKILL.md directly without any database schema knowledge.
3. **Simplicity** - `readFileSync` + LRU cache + BM25 inverted index. Total: 3 modules (skills.js, bm25.js, router.js).
4. **Performance** - LRU cache (50 entries) keeps frequently accessed skills in memory. BM25 index (170 sections, 2414 terms) is rebuilt in ∼20ms.
5. **User control** - Skills live at `~/.agents/skills/`. Users can add custom skills by creating a new directory with a SKILL.md file.

## Consequences

- Cross-skill queries require scanning all SKILL.md files at startup (∼20ms for 17 skills, negligible).
- Full-text search requires an in-memory BM25 index (built at load time, cleared on `skills reload`).
- Plugin system (Phase 7) is trivial: `~/.agents/skills/<custom-skill>/SKILL.md` is auto-detected.
- No concurrent access concerns - single-process, single-threaded Node.js.

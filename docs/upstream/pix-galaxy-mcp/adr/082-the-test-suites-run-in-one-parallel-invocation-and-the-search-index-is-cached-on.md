# 082: The test suites run in one parallel invocation and the search index is cached on disk

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: performance, testing, cache, startup
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

A performance run measured the two costs the ci script and the CLI pay on every invocation. The ci script ran 76 steps in sequence, each a fresh node process: the 45 node:test suites alone took 39.7 seconds of which a large part was process startup rather than work, and the whole script took 118.2 seconds. Two suites dominate - process-hygiene at 25.6s, which starts and kills real processes, and self-update-throttle at 25.3s, whose cost is a git clone and a child process per scenario rather than the 450ms of sleeps it contains. Separately, buildIndex tokenizes 91 skills into 7057 terms across 984 sections on every process start: about 95ms warm, 203ms cold, paid once by a long-lived server and again by every CLI invocation and every hook.

## Decision

The node:test suites run as one invocation with a 180 second per-test timeout. node:test already runs each file in its own child process, so the isolation every suite relies on is unchanged and only the waiting is gone: 39.7s to 26.8s for those suites, 118.2s to about 82s for the whole script, green on three consecutive runs. The plain script-style tests stay sequential because they share the repository's state directory. The BM25 index is written to the state directory as gzipped JSON, keyed by a digest of the code signature and a signature over the skills, and read back instead of rebuilt: 18ms against 95ms, and a routed CLI call drops from 0.76s to 0.28s. Superseded index files are deleted when a new one is written, since only the current key can ever be read and each file is 477KB. The code signature moved from tool-cache into core/code-signature.js: the result cache imports the index for query canonicalization, so the index could not import the cache back without closing a cycle. RULE_MCP_NO_CACHE=1 disables the stored index along with the result cache.

## Consequences

A failing suite still fails the run, but the output is now interleaved across 45 files rather than printed one file at a time, so reading a failure means finding its file in the report. The floor for the whole script is the slowest single suite, 25.6s, so further work on test time means making process-hygiene cheaper rather than adding parallelism. The stored index is 477KB in the state directory and is rewritten whenever the code or any skill changes, which on a development checkout is most commits; the prune keeps exactly one. A skills edit is caught by mtime and count, so a content change that preserved both would be missed - the same trade the result cache makes. The 263ms that loadAllSkills spends reading 91 skills is untouched and is now the larger half of CLI startup.

## Alternatives Considered

1. Gate the process tests behind a flag for local runs: it would cut the floor, and it changes what a green run means, which is a decision for the repository owner and not for a performance audit
1. Replace the sleeps in the self-update suites: measured, they are 450ms of the 25.3s - the cost is the clone and the child process per scenario, so removing them would buy almost nothing
1. Rebuild the index and keep it in memory only: what the measurement shows is that the server is not the expensive case; the CLI and the hooks are, and they get a fresh process every time
1. Cache the index keyed on the skills alone: a scorer change would then be served from an index built by the previous scorer, which is the failure the result cache had

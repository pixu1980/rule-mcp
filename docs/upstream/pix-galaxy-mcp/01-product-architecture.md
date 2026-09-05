# Product and architecture

## What this server is

An MCP server that turns 88 rule skills into 105 tools, routes a prompt to
the right skill, and checks code against guardrails. **It never calls a model.**
Every answer is a pure function of the request and the skill files on disk,
which is what makes results cacheable, replayable and testable.

That constraint shapes everything below. A router that scores lexically can be
measured against a corpus. A guardrail that runs a regular expression can block
a merge. A cache whose values are deterministic can be verified and shared.

## The pieces

```
┌──────────────────────────────────────────────────────────────────────┐
│  MCP client: Claude, Codex, Cursor, Copilot, Gemini, VS Code, Pi     │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  JSON-RPC 2.0 over stdio, Streamable HTTP or SSE
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  rule-mcp                                                      │
│                                                                      │
│  @modelcontextprotocol/sdk    server, transports, capabilities       │
│                                                                      │
│  Tools                                                               │
│    rule                   route a prompt to a skill               │
│    pix_<area>_<skill>    89 skill tools, one per skill           │
│    pix_gateway           route + evidence + guardrails + receipt │
│    pix_apply             write files, receipt required           │
│    pix_check             blocking guardrail validation           │
│    pix_search            BM25 across every section               │
│    pix_component         deterministic component templates       │
│    pix_scaffold          project and config bootstrap            │
│    pix_a11y_report       WCAG-EM conformance with EARL           │
│    and: compress, detect, fix, stats, update                         │
│                                                                      │
│  Core                                                                │
│    skills.js                 load and cache SKILL.md                 │
│    bm25.js                   the index routing and search share      │
│    guardrails.js             27 shared rules plus per-area           │
│    tool-cache.js             two-tier deterministic result cache     │
│    cache-catalog.js          the shared, committed half of it        │
│    enforcement.js            fail-closed pre and post processing     │
│    telemetry.js              per-project JSONL, rollups, KPI export  │
│    caveman.js, fingerprint.js  output compression and cleanup        │
└──────────────────────────────────────────────────────────────────────┘
```

## Routing

`rule` takes a prompt and returns a skill, its matched sections,
alternatives and a confidence. Scoring is BM25 over an index built from every
skill's sections, in `src/core/bm25.js`, which `pix_search` also uses.

Three properties decide the quality of a route, and each was measured before it
was kept:

- **Coverage weighting**, the fraction of the query's terms a skill contains,
  is what makes BM25 usable here. Raw inverse document frequency ranks a skill
  that mentions a rare term once above the skill the term is about.
- **Headings score three times body text.** They are the routing surface, so
  the words a person types belong in a `##`.
- **The stemmer is deliberately conservative**, plural and third person only.
  An aggressive one merges terms that mean different things in a corpus this
  small.

`test/routing-corpus.test.mjs` scores the router against real phrasings in
`test/routing-corpus.mjs`, with floors at 80% exact and 95% top-or-alternative.
The corpus includes prompts that miss, because a corpus written to pass
measures nothing.

## Evidence and writes

`pix_gateway` is the single entry point for work: it routes, loads the
routed skill's evidence, runs guardrails over any code passed with it, and
issues a receipt when everything passes.

`pix_apply` writes files and requires that receipt. The receipt binds the
exact ordered path and content tuples that were checked, so authorization
covers what was validated and nothing else, and it expires after five minutes.

The gateway's deterministic half, route and evidence and verdict, is cached
under its own key. **The receipt is minted on every call, hit or miss.** An
identity is never replayed.

## The result cache

Every tool answer is a pure function of the tool, its arguments and the skill
files, so an identical call replays instead of recomputing.

| Tier         | Key                                         |
| ------------ | ------------------------------------------- |
| `exact`      | The arguments as given                      |
| `normalized` | Prompt-shaped arguments canonicalized first |

There is no third tier, and its absence is asserted rather than assumed.

Freshness is per entry: each records the content digests of the skills that
produced it, so editing one skill invalidates the entries that depended on it
and leaves the rest. Mutating tools, and anything embedding a timestamp or a
receipt, are never cached.

`rule-catalog.json` is the half a team inherits: entries reused at least
three times that still reproduce when recomputed, written by `cache export` and
committed by a person. It loads under the local cache, so a shared answer never
outranks one this machine computed.

## Output

What the cache stores is the deterministic core. Everything after it is applied
per call, on hits and misses alike: the workflow reminder, caveman compression,
fingerprint removal, ASCII box alignment, and the request id.

## Transports

| Transport       | Use                                                 |
| --------------- | --------------------------------------------------- |
| stdio           | Default. The client owns the process lifecycle      |
| Streamable HTTP | Current spec, for a shared daemon                   |
| SSE             | Legacy HTTP+SSE, for clients that predate the above |

The HTTP transports require a bearer token, stored once per machine with
owner-only permissions. TLS is available by passing a certificate and key.

## Lifecycle

Nothing this server starts is allowed to outlive it.

One shutdown path (`core/lifecycle`) owns it. SIGINT, SIGTERM and SIGHUP run
the cleanups each transport registered - close the sessions, close the sockets,
flush the cache and the telemetry buffer - behind a three-second deadline, and
then exit whatever the cleanups did. A signal handler that could hang would be
worse than no handler at all, so the exit is unconditional and a second signal
skips the tidying entirely.

A stdio server exists for one client, and the protocol never says when that
client is gone. Three things say it instead: stdin closing, a write failing
with a dead-peer error, and a parent that has become init. Any of them ends the
process. Two servers were once found orphaned by killed clients, each spinning
at 100% of a core on a socket with no peer and holding 165 MB - an error per
event-loop turn, swallowed and logged forever. Swallowing is now counted: a
hundred errors in a second is a broken process rather than a bad request, and
it exits (70) for the client to respawn.

A shared daemon closes a session when its transport says so, and sweeps for
the ones that never will: a stream already destroyed, or a session nobody has
touched in an hour. Each session owns an MCP `Server`, so an unreaped session
is a leak with a protocol handler attached.

Idle memory goes back. After ten minutes without a tool call, the BM25 index,
the SKILL.md cache and the in-memory cache tier are dropped - all three
rebuildable, and the result cache is flushed to disk first so the next lookup
reloads rather than recomputes. Every housekeeping timer is unref'd: none of
them is ever the reason a process is still running.

## Enforcement

Every handler is wrapped. Preprocessing validates input and refuses what is
unsafe; postprocessing validates the result's shape and, for the router, that
it never names a tool or skill that does not exist. **Failure is closed**: an
invalid result is an error, not a warning.

Three harness hooks carry the rules a prompt cannot. `SessionStart` injects the
directive and, on resume, the verified handoff. `UserPromptSubmit` adds a short
reminder. `PreToolUse` guards the irreversible steps, a schema migration and a
commit.

## Skills

`skills/` in this repository is the only source. A directory in the user's home
cannot add, rename or shadow a tool, and no `plugin.js` from outside is
imported into the process.

Each skill is one `SKILL.md` with YAML frontmatter. Adding a directory adds a
tool at load time; four indexes are maintained by hand and checked by
`test/skills-docs.test.mjs`.

## The cost of the tool surface

`tools/list` is the one output paid on every model turn, before the model has
decided to do anything. It is measured by `scripts/tool-surface-report.mjs` and
guarded by `test/tool-surface-budget.test.mjs` against the budget in
`src/core/tool-budget.js`.

A tool may declare `advertise` to narrow what it publishes without narrowing
what it accepts: a property costs tokens every turn and is worth advertising
only if the model should reach for it.

## Security model

- Skills load from the bundled directory only.
- Writes require a path-bound receipt from a passing guardrail run.
- Implausible project roots are refused, so a traversal check has a floor.
- Prompt text never reaches disk. Telemetry records length and routed skill.
- The self-update remote is pinned and the container runs without root.
- The installer writes no secrets into an agent configuration, and every
  configuration write takes a backup first.

## Platform

Node 20 or later, on macOS, Linux and Windows. Three runtime dependencies: the
MCP SDK, zod, and the skills package.

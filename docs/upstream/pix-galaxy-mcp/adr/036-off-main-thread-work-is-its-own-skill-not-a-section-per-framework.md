# 036: Off-main-thread work is its own skill, not a section per framework

- **Date**: 2026-08-06
- **Status**: accepted
- **Tags**: skills, taxonomy, frontend, performance, workers, routing
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Nothing in the corpus covered browser concurrency. Asking the router how to move
heavy JavaScript off the main thread returned `rule-platform-desktop` at 100%
confidence - a confident answer about Electron's main process, which is a
different main thread entirely. `rule-platform-web` carried an INP budget
(`< 200ms`) and a TBT budget (`< 200ms`) but no guidance on how to meet either
once a synchronous task exceeds them.

The obvious alternative was a "Web Workers" section inside each of the nine
frontend framework skills. That fails on three counts:

1. **The subject is framework-independent.** `postMessage`, structured clone,
   transferables, `SharedArrayBuffer`, `OffscreenCanvas`, and
   `scheduler.yield()` are platform APIs. Only pool ownership and cancellation
   wiring differ per framework, and those are a five-row table, not nine
   sections.
2. **Nine copies drift.** `rule-frontend-forms` was already merged away for
   this exact reason (ADR 009). Duplicating a fast-moving area - `scheduler.yield()`
   reached Firefox in 2025, Safari still has neither `yield()` nor `postTask()` -
   guarantees nine different levels of staleness.
3. **Routing needs a target.** The scorer in `src/tools/ai.js` ranks whole
   skills by keyword hits against `##` headings. A subsection buried in
   `rule-frontend-react` can never outrank React's own headings for a prompt
   like "the UI freezes when I parse a big CSV".

A second question was where the skill belongs. `rule-platform-web` is the web
umbrella, so `rule-platform-web-workers` reads naturally - but platform skills
select a project type, and this skill does not. `rule-frontend-*` already
held two non-framework members at the time, so the
area is not strictly "one skill per framework".

## Decision

**Add `rule-frontend-workers` as a single framework-neutral skill under the
frontend area**, listed in a new "Cross-Cutting" table in
`skills/rule-frontend/SKILL.md` so it is not mistaken for a tenth framework.

Scope: diagnosis (waiting vs computing), dedicated workers and module-worker
creation, the request/response envelope, worker pools, transferables,
`SharedArrayBuffer` with its cross-origin-isolation requirement,
`OffscreenCanvas`, main-thread yielding for work that must touch the DOM, and
measurement through LoAF, long tasks, and field INP.

Two content decisions worth recording:

- **The reference pool takes a worker factory, not a URL.** Vite, webpack, and
  Rspack only detect a worker when `new Worker(new URL("./x.js", import.meta.url))`
  appears inline. A pool that accepts a URL and constructs the worker internally
  produces, at build time, a worker whose own imports were never bundled - a
  failure that shows up only in production. The factory keeps the detectable
  literal at the call site.
- **Task logic lives in a registry of pure functions** (`src/tasks/index.js` in
  the example tree), shared by the worker entry point and by a main-thread
  fallback. One definition serves the browser, the server render, and the unit
  tests, and the tests need neither a worker nor a DOM shim.

The skill states the Node.js correspondence explicitly (main thread ≈ event
loop, Web Worker ≈ `worker_threads`, pool ≈ `piscina`, and no browser analog
for `cluster` or `UV_THREADPOOL_SIZE`), because the two models are routinely
conflated and `rule-backend-node` covers the server half.

## Consequences

**Positive**

- Routing has a target. Verified in-process after `loadAllSkills(true)`:
  "the UI freezes when I parse a big CSV in the browser", "move heavy javascript
  off the main thread with a web worker pool", "improve INP by offloading work to
  background threads", "render canvas in a worker with OffscreenCanvas", and
  "transferable arraybuffer postMessage structured clone" all resolve to
  `rule-frontend-workers`. "how do node worker threads and the event loop
  work" previously resolved to `rule-process-code-review`.
- `rule-platform-web`'s INP and TBT budgets now have a linked remedy.
- One place to update as `scheduler.yield()`, LoAF, and Safari support move.

**Negative**

- The frontend area now mixes framework skills with a cross-cutting one. The
  separate table header carries that distinction, and it will need repeating if
  a second cross-cutting frontend skill appears.
- Per-framework wiring is a table rather than nine worked examples. Accepted:
  the ownership rule (module singleton, component owns only the `AbortSignal`)
  is identical everywhere, and the framework skills remain the place for
  idiomatic component code.

**Neutral**

- Four hand-maintained indexes gained a row: the dispatcher table in
  `skills/rule/SKILL.md`, the frontend index, the README tool table, and the
  frontend area prompt in `src/prompts/index.js`. Skill registration itself is
  automatic - `getSkillNames()` globs the directory.

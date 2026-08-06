# Security & Performance Audit — rule-mcp

**Date:** 2026-08-04
**Scope (agreed):** full — runtime (`src/`), transports, installer (`scripts/install.sh`, `install.ps1`), self-update, sandbox, `rule_tool_apply`, Docker, and the architect interview server shipped inside `skills/`.
**Branch audited:** `feat/architect-context-pack` @ `92ff942`
**Method:** static review of all 45 runtime modules + targeted runtime measurements (startup, tool-surface size, cache behaviour). Every finding below carries a file:line anchor; measured numbers are marked **measured**.

Findings are ordered by severity. Each one states the failure scenario, not just the smell.

> **Remediation status (2026-08-04, same day):** findings 01-07 are fixed on `feat/architect-context-pack` — see ADR 030, 031 and 032, and the six new test files listed under each finding. Findings 08-23 are open.

---

## Executive summary

The codebase is unusually disciplined for an MCP server: bearer auth on both HTTP transports, timing-safe token compare, body caps, session caps, cross-origin denial, atomic token writes with `0600`, a deterministic cache with an explicit core-vs-decoration invariant, and a sandbox that keeps handler failures from killing the process. The problems are not sloppiness — they are **boundary problems**: places where a guard exists but is anchored to a value the caller controls, and places where a local-only assumption is contradicted by a shipped default.

Three things need attention before telemetry work starts:

1. **The write path can be pointed anywhere.** `rule_tool_apply`'s containment root is a caller-supplied argument, and the gateway receipt binds file _contents_ but not file _paths_. Together they turn "the only writer, gated by guardrails" into "write approved bytes to any path".
2. **The architect interview server is an unauthenticated local writer.** It writes into the user's project on a `POST` that any website open in the browser can issue, and the MCP tool that spawns it never kills it.
3. **The tool surface costs ~54k tokens per model turn** (measured). For a product whose core claim is token savings, this is the single largest measurable regression, and half of it is exact duplication.

---

## S1 — High severity

### 1. `rule_tool_apply`: containment root is caller-controlled

**Where:** `src/tools/apply.js:22-29` (`assertInsideProject`), `src/tools/apply.js:76-77`

`assertInsideProject` correctly rejects `..` escapes — but relative to `rootDir`, which comes from the tool's own `path` argument (`resolve(rootPath)`, default `"."`).

**Failure scenario:** a call with `path: "/"` (or `"/Users/<user>"`) makes every target "inside the project". `files: [{ path: "Users/<user>/.zshrc", content: "…" }]` resolves to `/Users/<user>/.zshrc`, `relative()` returns `Users/<user>/.zshrc`, no `..` prefix, write allowed. The check is structurally incapable of failing when the attacker picks the root.

**Also:** no `realpath` resolution. A symlink inside a legitimate project (`<project>/vendor → /etc`) escapes containment, because `path.resolve` is pure string math and never touches the filesystem.

**Fix:** anchor containment to a root the caller cannot choose — process cwd, or an explicit allowlist of opened project roots — and validate the _realpath_ of the deepest existing ancestor before writing. Reject absolute `file.path` values outright rather than normalising them.

**Fixed** — `resolveProjectRoot()` refuses the filesystem root, the home directory and system directories; `resolveWriteTarget()` refuses absolute paths, `..`, NUL bytes, protected destinations, and symlink escapes proven by `realpath` on the deepest existing ancestor. ADR 030, `test/apply-containment.test.mjs` (19 assertions).

### 2. Gateway receipt binds content but not paths

**Where:** `src/tools/gateway.js:41-56` (`issueReceipt`), `src/tools/gateway.js:66-78` (`validateReceipt`), `src/tools/apply.js:83-84`

The receipt is `sha256(code)`. `rule_tool_apply` recomputes that hash over `files.map(f => f.content).join("\n---FILE---\n")` — content only. Paths are never part of the signed material.

**Failure scenario:** obtain a receipt for content that passes every guardrail, then apply that same content to `.git/hooks/pre-commit`, `package.json`, `eslint.config.mjs`, or any dotfile inside root. Guardrails validated _what_, never _where_, so the receipt proves nothing about the destination. Combined with finding 1, "where" is unbounded.

**Second defect:** the `\n---FILE---\n` separator is in-band. `files: [{path:"a", content:"X\n---FILE---\nY"}]` and `files: [{path:"a",content:"X"},{path:"b",content:"Y"}]` hash identically — a receipt issued for one shape is valid for the other.

**Fix:** bind the receipt to a canonical digest over the ordered tuple list `[(normalizedPath, sha256(content))…]` plus file count, with a length-prefixed encoding instead of a text separator. Make the receipt single-use.

**Fixed** — `rule_tool_gateway` accepts a `files` array and issues a path-bound receipt over `canonicalFilesDigest()` (length-prefixed path and content, order- and count-sensitive). Receipts carry their binding; `validateReceipt` refuses a path-bound token and a content-only receipt can no longer authorise a multi-file write. ADR 030, `test/gateway-receipt-paths.test.mjs` (13 assertions). Receipts stay multi-use within the 5-minute TTL so the dry-run → apply preview keeps working; single-use would break it.

### 3. Architect interview server: unauthenticated, CSRF-able file writer

**Where:** `skills/rule-architect/assets/context-server.mjs:68-130` (handler, `POST /api/generate`)

The server binds loopback (`BIND_HOST = "127.0.0.1"`, line 26) and deliberately sets no CORS headers — good. But it has **no authentication token, no `Origin` check, and no `Host` check**, and `POST /api/generate` writes generated files into `targetDir` including agent entry files at the project root, honouring `force: true` from the request body (line 113).

**Failure scenario:** while the interview server is running, any page the user visits issues `fetch("http://localhost:<port>/api/generate", {method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"}, body:"{…}"})`. `text/plain` makes it a CORS _simple request_ — no preflight, so the absence of CORS headers does not stop the request from executing. The attacker cannot read the response but does not need to: the side effect is a file write into the user's project with attacker-chosen content, `force: true` overwriting existing root files. Port discovery is a short scan of the ephemeral range. Missing `Host` validation additionally leaves DNS-rebinding open.

**Fix:** mint a one-time token at spawn, put it in the URL the MCP tool prints, and require it on every `/api/*` request; reject requests whose `Origin` is present and not same-origin, whose `Host` is not `localhost`/`127.0.0.1`, or whose `Sec-Fetch-Site` is not `same-origin`. Drop `force` from the wire protocol or gate it behind the token too.

**Fixed (header validation)** — new shared `skills/rule-architect/http-guard.mjs` enforces `Sec-Fetch-Site`, `Origin` and `Host` on every `/api/*` request in both servers. Browser-set headers cannot be forged by page script, so CSRF and DNS rebinding are closed with no change to the duplicated `interview.js` copies. ADR 031, `test/architect-server-csrf.test.mjs` (12 assertions, including a live cross-site POST against both servers). The one-time token was **not** added: it needs UI changes in both interview copies, and `force` stays on the wire — residual work, tracked here.

### 4. Spawned interview server is never reaped

**Where:** `src/tools/architect.js:53-116`

`spawn("node", [serverPath, targetDir], { detached: false })` resolves the promise either when the URL appears on stdout or after a 5s timeout (line 106-115) — and then **nothing ever kills the child**. Listeners stay attached and keep appending to `output` for the process lifetime.

**Failure scenario:** each `rule_tool_architect mode=interview` call leaves another HTTP server listening on a random port with write access to a project directory, indefinitely, multiplying the exposure in finding 3. `output` grows without bound. Orphans survive the MCP server's own shutdown because nothing tracks them.

**Also:** `spawn("node", …)` resolves `node` through `PATH` instead of `process.execPath` — wrong runtime version at best, PATH hijack at worst.

**Fix:** track children in a registry, kill on tool completion/timeout and on server shutdown, `removeAllListeners()` after resolving, cap `output`, and spawn `process.execPath`.

**Fixed** — children are tracked in a registry keyed by target directory: a second call reuses the running server, listeners detach once the URL is found, `output` is capped at 64 KB, each server dies after a 30-minute lifetime, and `exit`/`SIGINT`/`SIGTERM` stop all of them. `spawn` now uses `process.execPath`. ADR 031, `test/architect-interview-lifecycle.test.mjs` (asserts the child is actually dead, not merely forgotten).

### 5. `rule_tool_architect mode=interview` is cached — the second call hands out a dead URL

**Where:** `src/core/tool-cache.js:35-43` (`NON_CACHEABLE` — `rule_tool_architect` is absent), `src/tools/skill.js:58-62`, `src/tools/router.js:180-184`

`rule_tool_architect` is treated as a deterministic read-only tool, but `mode: "interview"` has a process-spawning side effect and returns a URL containing an ephemeral port.

**Failure scenario:** first call spawns the server and caches `"Server started! Open your browser to http://localhost:51234"`. The cache is persisted gzipped and survives restarts (`tool-cache.js:132-144`). Every later identical call returns that text **without spawning anything**, so the user opens a dead port and the tool reports success. This is a correctness break in the cache's own core invariant: only deterministic, side-effect-free tools may be cached.

**Fix:** add `rule_tool_architect` to `NON_CACHEABLE`, or split the interview mode into its own non-cacheable tool. Then add a registration-time assertion so a tool that can spawn or write cannot be registered as cacheable.

**Fixed (denylist)** — `rule_tool_architect` is in `NON_CACHEABLE`; `test/architect-interview-lifecycle.test.mjs` pins both that entry and the fact that the denylist stayed narrow. The registration-time assertion that would prevent the next such mistake is **not** implemented — residual work.

### 6. Self-update executes unverified remote code on every tool call

**Where:** `src/core/self-update.js:123-158`, invoked from `src/tools/router.js:162-164`

The forced update is well-engineered in the ways it advertises — `--ff-only`, dirty-tree skip, detached-HEAD skip, fail-open — but it verifies _nothing about what it pulls_: no remote-URL allowlist, no signed-tag or `git verify-commit` check. On success it hot-reloads skills and schedules `process.exit(0)` so a supervisor restarts into the new code (`self-update.js:208-225`).

**Failure scenario:** anyone who can write one line into `.git/config` (`branch.<x>.remote`, or `remote.origin.url`) — a malicious dependency's postinstall, a shared dev box, a checked-in `.git` in a container image — gains code execution in the MCP server at the next tool call, with no user interaction and no visible prompt. Upstream repository compromise has the same effect on every install. Note also that `git merge` runs repository-provided hooks when `core.hooksPath` points inside the tree (this repo ships `.githooks/`), so pulled content can execute on the following merge.

**Fix:** pin the expected remote URL and abort on mismatch; require a signed tag or signed commit before merging; keep auto-_detection_ forced but make auto-_apply_ opt-in (`RULE_MCP_AUTOUPDATE_APPLY=1`) with the banner offering `rule_tool_update` instead. Log the resolved remote and commit id so the update is auditable.

**Fixed (remote pinning + optional signature + audit log)** — the upstream remote is verified _before any fetch_: `normalizeRemoteUrl()` compares host+path so this repo's scp-style SSH remote matches the HTTPS URL `server.json` declares, and `resolveAllowedRemotes()` trusts only that declaration unless `RULE_MCP_UPDATE_REMOTE` replaces it. A mismatch yields `remote-not-allowed` with a loud banner and no network call, which closes the `.git/config` rewrite vector. `RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1` adds `git verify-commit`. Applied updates log remote and commit range to stderr. ADR 032, `test/self-update-remote-pin.test.mjs` (10 assertions, including a real repointed-remote sandbox). **Residual:** auto-apply is still forced, so a compromised _upstream_ is only mitigated by enabling signature verification — flipping auto-apply to opt-in changes a documented product promise and is left as an open decision.

### 7. Docker ships the server on every host interface, as root

**Where:** `docker-compose.yml` (`ports: "37999:37999"`), `Dockerfile` (no `USER`)

`"37999:37999"` publishes on `0.0.0.0` of the host, so the container's `RULE_MCP_HOST=0.0.0.0` becomes LAN exposure — the only barrier is the bearer token, and there is no rate limiting or lockout on failed auth. The image also runs as root (`node:22-alpine` default), on a mutable base tag, with dependency install scripts enabled.

**Failure scenario:** a laptop on a café/office network running `docker compose up` publishes an MCP server that serves skill content and — via `rule_tool_apply` combined with finding 1 — writes files as root inside the container. This directly contradicts the "never beyond loopback" posture confirmed for this deployment.

**Fix:** `127.0.0.1:37999:37999`, add `USER node`, pin the base image by digest, install with `--ignore-scripts`, and add auth-failure backoff before any non-loopback bind is ever documented.

**Fixed** — compose publishes `127.0.0.1:37999:37999`; the Dockerfile drops to `USER node` before `CMD`, installs with `--ignore-scripts`, and sets `RULE_MCP_DOCKER=1` so `detectInstallType()` refuses git self-update inside an image. ADR 032, `test/docker-hardening.test.mjs` asserts the port mapping carries a loopback host, that the final `USER` is not root and precedes `CMD`, and that install scripts stay off. **Residual:** the base image is still a tag — no digest was resolvable here (no Docker in this environment) and inventing one would be worse than none; auth-failure backoff is finding 16 and remains open.

---

## S2 — Medium severity

### 8. The tool surface costs ~54k tokens per model turn (measured)

**Measured** on this machine: `listTools()` returns **176 tools**, `JSON.stringify` = **215,711 bytes ≈ 54k tokens**, recomputed in ~10-12 ms per `tools/list` request. Startup: 79 ms module import + 158 ms `loadAllSkills`, RSS 177 MB.

**Where:** `src/core/skills.js:33` (`IS_MINIMAL_TOOLS` off by default), `src/tools/router.js:117-145` (`listTools` recomputes Zod→JSON Schema every call), `src/tools/router.js:253-273` (`getSkillNames` merges `~/.agents/skills` with embedded)

88 of those 176 tools are `rule_tool_pix_*` mirrors of the `rule_tool_*` set, coming from a second skills tree in `~/.agents/skills` — functionally duplicate entries whose descriptions differ only by brand. Half the tool budget buys nothing.

**Fix:** flip `MINIMAL_TOOLS` to the default (the allowlist at `skills.js:40-51` already exists), deduplicate by canonical skill id when merging skill roots, and memoise `listTools()` output keyed on the registry generation counter.

### 9. Cache invalidation misses hand edits and home skills

**Where:** `src/core/tool-cache.js:75-81` (`namespace`)

The cache namespace is `version + statSync(embeddedSkills).mtimeMs`. A directory's mtime changes when entries are added or removed — **not** when a nested file's content changes. `~/.agents/skills` is not fingerprinted at all.

**Failure scenario:** edit `skills/rule-frontend-react/SKILL.md` (or pull it via git without the self-update path that calls `cacheClear()`), restart the server, ask the same question: the gzipped on-disk cache replays the pre-edit answer forever. Editing a home skill has the same effect. The cache is exactly as authoritative as it is stale.

**Fix:** namespace on a digest of `(path, size, mtimeMs)` for every `SKILL.md` across both roots — one `readdir` walk at startup, cheap — or content-hash the skill set.

### 10. Cache hits bypass preprocessing, hooks, and instrumentation

**Where:** `src/tools/router.js:180-184` vs `186-213`

The cache is consulted before `preprocessToolCall`, before `_beforeHooks`, and returns before `_afterHooks`. Today the loss is limited (argument normalisation, NUL/prototype hygiene), but the shape is wrong in two ways: any future security check added to preprocessing is silently skipped whenever a cache entry exists, and the key is computed from _un-normalised_ arguments, so `path: " . "` and `path: "."` occupy two entries for one computation.

**Telemetry consequence (relevant to phase 2):** `_afterHooks` never fire on cache hits or errors, so telemetry built on them would be blind to exactly the events we want to count. Instrument inside `callTool` around both exits.

**Fix:** move the cache lookup after preprocessing and key it on normalised arguments; keep hooks on both paths with an explicit `servedFromCache` flag.

### 11. Cache flush is a synchronous level-9 gzip of the entire cache

**Where:** `src/core/tool-cache.js:132-144`, `189-192`

`flush()` serialises the whole `_memory` map and `gzipSync(..., { level: 9 })` on the main thread, on a 2s debounce and again on `process.exit`. The bound is 500 _entries_, with no byte budget, and a single entry may legally hold 1 MB of content (`src/core/enforcement.js:4`).

**Failure scenario:** a session that fills the cache with large skill bodies produces a multi-hundred-MB JSON string plus a level-9 compression pass, blocking the event loop for seconds — in daemon mode that stalls every connected client, and it happens again at shutdown.

**Fix:** add a total-bytes budget with LRU eviction, drop to level 6, and move the write off-thread (`zlib.gzip` async, or a worker) with a bounded synchronous fallback at exit.

### 12. Daemon-shared module globals leak state across clients

**Where:** `src/tools/gateway.js:21` (`receiptStore`), `src/core/enforcement.js:94` (`_remindedTools`), `src/server.js:62` (`serverInstance`), `src/core/tool-cache.js:49`

Each connection gets its own MCP `Server` instance, but all authorisation and behavioural state is module-global.

**Failure scenarios:** client A's receipt validates client B's `rule_tool_apply` call (cross-client authorisation); the workflow reminder degrades to its terse form for every client after the first has seen it once, so a fresh session silently loses the full contract; `serverInstance` is overwritten by each `createServer()`, so `stopServer()` closes only the most recent one.

**Fix:** scope receipts and reminder state per session (pass a session id through `callTool`, or instantiate a per-connection registry), and drop the `serverInstance` singleton in favour of the per-session maps the transports already keep.

### 13. `rule_tool_apply` shells out to `pnpx prettier` synchronously

**Where:** `src/core/post-process.js:33`

`execFileSync("pnpx", ["prettier", "--write", …], { timeout: 15_000 })` — argv form, so no shell injection, but it blocks the event loop for up to 15 s per apply and, when prettier is not already present, resolves and executes a package from the registry at tool-call time (supply chain + hard failure offline). Errors are swallowed, so the user cannot tell formatting was skipped.

**Fix:** resolve `node_modules/.bin/prettier` (project, then package) and skip cleanly when absent; never fetch at tool-call time; run async; report skipped formatting in the result.

### 14. `execSync` with interpolated paths in the VS Code installer

**Where:** `src/cli/install.js:644` (`${cli} --install-extension "${vsixPath}" --force`), `:724` (`${cli} --uninstall-extension ${extensionId}`)

Shell string interpolation with a filesystem path inside double quotes: a path containing `"`, `$(…)`, or a backtick breaks out. Inputs are internal today, which makes this a latent bug rather than a live hole.

**Fix:** `execFileSync(cli, ["--install-extension", vsixPath, "--force"])`.

### 15. Plugin loading is an unguarded in-process code path

**Where:** `src/tools/router.js:294-315`

`loadPluginJs` imports `~/.agents/skills/<name>/plugin.js` and merges its guardrails into the engine — arbitrary code in the server process, no isolation, silently swallowed failures. It is the user's own directory, so this is a documented trust boundary rather than a vulnerability, but two things need fixing: the URL is built as `"file://" + join(...)` instead of `pathToFileURL()` (breaks on Windows drive letters and any path with a space or `#`), and skills installed by `scripts/install-skills.mjs` land in that directory, so the trust boundary is wider than "hand-written by the user".

**Fix:** `pathToFileURL`, log load failures at least to stderr, and document that installing a skill means executing its `plugin.js`.

### 16. Socket hygiene on both HTTP transports

**Where:** `src/transport/sse.js:266-267`, `src/transport/http.js:260-261`

`httpServer.timeout = 0` disables the socket idle timeout to protect long-lived streams, but `headersTimeout` / `requestTimeout` are left at defaults and never tuned for the "slow body" case; there is no rate limiting or lockout on failed bearer auth; `MAX_SESSIONS = 256` each allocates a full MCP server (measured baseline: 177 MB RSS for one). `handleCors` answers `OPTIONS` before auth (acceptable, but it does confirm the service exists to an unauthenticated peer, alongside the public `/health`).

**Fix:** set explicit `headersTimeout`/`requestTimeout`, add exponential backoff per peer on auth failure, and lower `MAX_SESSIONS` to something proportional to real client counts (single digits for a personal daemon).

### 17. `getSkillNames()` hits the filesystem on every tool call

**Where:** `src/tools/router.js:253-273`, called from `src/tools/router.js:204` on every `callTool`

Two `readdirSync` calls plus an `existsSync` per non-`rule-` entry, on every single tool invocation, purely to build the validation context. With two skill roots and 167 directories that is a few hundred syscalls per call.

**Fix:** cache the name set, invalidate in `loadAllSkills(force)` (which already flushes the other caches).

### 18. Handoff silently truncates on large diffs

**Where:** `src/tools/handoff.js:150-186`

`tryExec` uses `execSync` with the default 1 MB `maxBuffer` and returns `""` on any failure. A working tree with a diff over 1 MB therefore yields an empty diff section, and the handoff document reports "(no uncommitted changes)"-shaped output while real changes exist. Five shell spawns per call is also avoidable.

**Fix:** `execFileSync` with `maxBuffer` raised and an explicit "diff truncated at N bytes" marker in the output when the cap is hit. Never let a failed capture read as "nothing there".

### 19. Installer appends brand-scoped rule blocks to global agent memory

**Where:** `scripts/install.sh:~560-640` (`append_rules_block`, applied to `~/.claude/CLAUDE.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`)

Idempotency is checked with `grep -q "rule-mcp-rules"`, a brand-specific marker. Rebranded siblings of this server (`rule`, `root`) use their own markers, so their blocks accumulate instead of replacing each other. The audited machine's own `~/.claude/CLAUDE.md` currently carries four near-identical MANDATORY blocks.

**Failure scenario:** every model turn in every project pays for several hundred duplicated instruction tokens, forever — a permanent tax on the exact metric the telemetry work is meant to improve. It is also self-defeating: contradictory tool names across the blocks push the model toward tools that do not exist in the current install.

**Fix:** one canonical marker (`rule-ai-rules`) with upgrade-in-place semantics that replaces any known legacy block, plus a `doctor` check that reports duplicated blocks and offers to collapse them. Track "instruction bytes injected per turn" in telemetry.

### 20. Installer writes a post-commit hook into the user's repository

**Where:** `scripts/install.sh:~700-730`

The installer appends a `post-commit` hook running `rule-mcp doctor` in the background on every commit, in whatever repository the installer happens to run from. It is invasive (the installer modifies a repo it does not own), largely ineffective (silently never runs when `core.hooksPath` is configured — as it is in this very repo), and spawns background work on every commit for no user-visible benefit.

**Fix:** drop it, or make it opt-in behind an explicit flag and respect `core.hooksPath`.

### 21. `collectBody` corrupts multibyte input

**Where:** `skills/rule-architect/http-body.mjs`

`body += chunk` implicitly stringifies each `Buffer` with no `setEncoding("utf8")`, so a multibyte character split across a chunk boundary decodes to replacement characters. The limit is also compared against `body.length` (UTF-16 code units), not bytes, so the documented "2 MiB" ceiling is neither a byte count nor consistent across inputs.

**Fix:** `req.setEncoding("utf8")` (which buffers partial sequences) or collect `Buffer`s and `Buffer.concat` at the end; count bytes with `chunk.length`.

### 22. Guardrail engine: synchronous regex sweep and dead skip logic

**Where:** `src/core/guardrails.js:107-124`, `src/core/guardrail-defs.js` (234 regex literals)

`checkCode` runs the full guardrail set synchronously over up to 256 KB of code (`enforcement.js:3`), single-threaded — in daemon mode this stalls every other client. Separately, `previousPassed` is initialised empty on every call (line 109) and never populated, so the `skipped` branch (112-118) is unreachable and every summary reports "(0 skipped from previous iteration)" — a message describing a feature that does not exist.

**Fix:** delete the dead skip path (or implement it properly, per session, without accepting client-supplied pass lists), cap code size for the check explicitly, and consider yielding between guardrail groups on large inputs.

### 23. Sandbox timeout cannot cancel the work it times out

**Where:** `src/utils/sandbox.js:78-128`

`wrapRequestHandler` races the handler against a timer and responds 408, but the handler keeps running; `cleanup()` destroys the request socket only in the error path, and `isAborted` (line 83) is assigned and never read. A slow tool call therefore continues to consume CPU and hold memory after the client has been told it timed out.

**Fix:** thread an `AbortSignal` through to cancellable work, drop the unused flag, and record timeouts as a telemetry error class.

---

## Consequences for the telemetry work (phase 2 input)

The agreed telemetry design (local JSONL + 7-day raw + daily rollups, redacted remote in phase 2, zero new dependencies, non-blocking) intersects the findings above at four points:

1. **Instrument inside `callTool`, not via `_afterHooks`.** Hooks never fire on cache hits or errors (finding 10) — precisely the events the "tokens saved" metric depends on.
2. **Never write telemetry into the cached `core`.** The core-vs-decoration invariant (`src/tools/router.js:34-36`) exists because anything env- or state-dependent frozen into the cache replays wrong. Counters belong outside the cached object.
3. **Session identity already exists for two transports and not the third.** `transport.sessionId` (SSE) and `Mcp-Session-Id` (HTTP) are usable as-is; stdio needs a per-process id minted at startup. Per finding 12, do not reuse module globals for it.
4. **Redact at the recording boundary.** `rule_tool_gateway` and `rule_tool_ai` receive free-form prompts, `rule_tool_check` receives code, `rule_tool_apply` receives paths. Record length, language, and hashes only — never the values — so that no later export step can leak what was never stored.

Measured baseline to compare against once telemetry lands: **176 tools / 215,711 bytes ≈ 54k tokens per turn**, 158 ms `loadAllSkills`, 177 MB RSS, `listTools()` ~10-12 ms per call.

---

## Suggested order of work

| Order | Items         | Rationale                                                                                      |
| ----- | ------------- | ---------------------------------------------------------------------------------------------- |
| 1     | 1, 2, 3, 4, 5 | Write-path and spawned-server boundaries. Everything else is safe to defer; these are not.     |
| 2     | 7, 6          | Deployment defaults and unverified remote code — config-level fixes with large blast radius.   |
| 3     | 8, 9, 19      | The three measurable token/staleness wins, and the baseline telemetry has to be able to prove. |
| 4     | 10, 11, 12    | Cache and daemon-state correctness — prerequisites for trustworthy metrics.                    |
| 5     | 13-18, 20-23  | Hardening and hygiene.                                                                         |

ADR candidates: receipt scope (path binding), interview-server authentication, self-update trust model, minimal-tools default, telemetry storage and redaction contract.

# Mega-review - `openai-codex/gpt-5.6-sol`, `pix_tool` router, skills and tools

- **Audit date:** 2026-07-15
- **Repository:** `rule-mcp@1.0.0`
- **Reference commit:** `4d9764b`
- **MCP SDK:** `@modelcontextprotocol/sdk@1.29.0`
- **Verified host/model:** Pi `0.80.6`, provider `openai-codex`, model `gpt-5.6-sol`

> **Summary verdict:** `gpt-5.6-sol` is interoperable with `rule-mcp` MCP tools in the Pi host, but the product in its current state **is not production/release compliant**. The `pix_tool` router is not a gate: without the explicit `/rule-mcp` prompt, the model used the router in only 1 out of 5 domain requests and often called specialized tools directly. Additionally, guardrails are bypassable, `rule_tool_fix` can write outside the root, MCP prompts don't respect the official schema, and build/release can destroy the `skills/` corpus.

## 1. Scope, snapshot and limits

The repository was already heavily modified before the audit. This document evaluates the **observed working tree**, separating it from the Git baseline when necessary. The author's modifications were neither restored nor corrected. Destructive tests were run in temporary directories; ADRs auto-created during initial calls were removed at audit end.

### Coverage

Excluding `.git/`, `node_modules/`, `.tokensave/`, `.context/`, `dist/`, `coverage/` and `test-results/`:

| Area                              | Files |  Lines |
| --------------------------------- | ----: | -----: |
| Total snapshot before this report |   474 | 61,546 |
| `src/`                            |    32 |  9,313 |
| `src/` + `bin/` + `scripts/`      |    42 | 12,221 |
| `test/`                           |    22 |  1,712 |
| `skills/` (all assets included)   |   377 | 39,924 |
| `SKILL.md`                        |    70 | 17,581 |
| `docs/`                           |    22 |  4,958 |

Executed:

- syntactic parse of 138 `.js`/`.mjs` files with `node --check`;
- parse of 5 shell scripts with `bash -n`;
- parse of 9 JSON files with `JSON.parse`;
- parse of 15 YAML files with Ruby/Psych;
- AST/import/export inventory, complexity, Markdown links, metadata and frontmatter;
- runtime matrix of 67 skill-tools × 6 modes = **402 calls**;
- in-memory MCP tests with official SDK client/server;
- adversarial tests on guardrails, file-system, installer, router, resources, prompts and packaging;
- 8 separate real conversations with `openai-codex/gpt-5.6-sol`.

PowerShell and ShellCheck were not installed: the 2 `.ps1` files therefore lack native parser validation and the `.sh` files lack ShellCheck verification. Docker was unavailable: the Dockerfile was statically audited, not built.

"Every line" means every textual file in scope was scanned and every executable subsystem was read/reviewed. It does not mean formal certification of every statement in the 17,581 lines of skill documentation nor execution of every SQL/framework snippet on all platforms.

## 2. Final scorecard

| Area                          | Verdict             | Primary evidence                                                       |
| ----------------------------- | ------------------- | ---------------------------------------------------------------------- |
| MCP stdio startup             | **Pass**            | In-memory SDK client/server with successful handshake                  |
| `tools/list` and `tools/call` | **Technical Pass**  | 76 isolated tools, schema-valid calls                                  |
| Real use by `gpt-5.6-sol`     | **Technical Pass**  | Pi registers correct provider/model and successful tool calls          |
| Automatic `pix_tool` router   | **Fail**            | 1/5 domain requests without explicit command                           |
| Router with `/rule-mcp` | **Partial Pass**    | 1/1 invoked first, but primary route wrong due to path bias            |
| Routing quality               | **Partial**         | 52/60 top-1; 58/60 top-6; multilingual and generic prompts weak        |
| Native Pi skill trigger       | **Partial**         | In one case the model read 8 `SKILL.md`, but not via MCP router        |
| `rule_tool_check` as gate      | **Fail**            | `previousPassed` bypassable and result not tied to code hash           |
| `rule_tool_fix` safety         | **Blocking Fail**   | `dryRun` ignored in `generate`; path traversal confirmed               |
| MCP resources                 | **Partial**         | Standard resources readable; plugins listed but unresolvable           |
| MCP prompts                   | **Blocking Fail**   | Shape and role non-compliant with SDK schema                           |
| MCP completion                | **Functional Fail** | Uses nonexistent ref type for tool argument completion                 |
| Templates/components          | **Fail**            | Output not framework-specific or not guardrail-compliant               |
| Test suite                    | **Fail**            | `test:all` structurally broken; red suites and incomplete coverage     |
| CI/release/build              | **Blocking Fail**   | Missing test/build/LICENSE files; masked gates; destructive embed      |
| Installer/uninstaller         | **Fail**            | Malformed configs overwritten; `skills install --all` crashes non-TTY  |
| SSE security                  | **Fail**            | Local HTTP without auth, CORS `*`, reachable mutating tools            |
| Documentation/manifest        | **Fail drift**      | Tool counts/versions/source and "zero dependencies" claim inconsistent |
| Overall production readiness  | **Not approved**    | Open P0s and P1s                                                       |

## 3. Direct answer: do the router and triggers actually enter the chat?

### 3.1 Real experiment on `gpt-5.6-sol`

Sessions were run with `--no-session`, separate JSONL output, and auto-ADR disabled where possible. Case A's final record actually reports:

```json
{
  "provider": "openai-codex",
  "model": "gpt-5.6-sol",
  "stopReason": "stop"
}
```

| Case | Request                                             | Observed calls                                                                   | `pix_tool` first? | Result                                                                  |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| A    | Accessible React button                             | `pix_tool` → `rule_tool_search` → `rule_tool_frontend_react` → 2× `rule_tool_check` | Yes               | Almost complete flow, but final response differs from checked artifact  |
| B    | Rate limiting/abuse                                 | `rule_tool_backend_security` → `rule_tool_search`                                  | **No**            | Specialized tool chosen directly                                        |
| C    | PostgreSQL API, pagination/filters                  | `rule_tool_backend_api_design` → `rule_tool_data_postgresql` → `rule_tool_search`   | **No**            | Two direct skill-tools                                                  |
| D    | React hook with AbortController                     | `rule_tool_frontend_react` → `rule_tool_search`                                    | **No**            | Direct framework tool                                                   |
| E    | "Which rule workflow?"                               | 8 native `read` calls on `SKILL.md`                                              | No MCP            | The host's skill trigger works when explicitly requested                |
| F    | `2 + 2`                                             | No tools                                                                         | n/a               | Correct behavior                                                        |
| G    | Repeat rate limiting                                | `rule_tool_backend_security` → `rule_tool_search`                                  | **No**            | Confirms case B                                                         |
| H    | Same request preceded by `/rule-mcp` template | `pix_tool` → `rule_tool_search` → `rule_tool_backend_security` → …                 | **Yes**           | Template forces first step, but `pix_tool` initially routes to frontend |

Empirical result, without overinterpreting the sample:

- domain requests without explicit command (A–D, G): router used **1/5 = 20%**;
- requests with explicit command (H): router used first **1/1**;
- direct call to appropriate skills/tools: frequent and operational;
- no server-side mechanism blocks a response that doesn't call `pix_tool`.

### 3.2 Why this happens

`src/tools/ai.js` registers `pix_tool` as a normal tool. `src/tools/router.js` registers all other tools in the same registry and `src/server.js` exposes them simultaneously. `pix_tool` returns JSON with `route` and `next_tools`, but **does not invoke or orchestrate** those tools: the model decides whether to proceed. Enforcement only activates after a tool call already chosen by the client.

The `prompts/rule-mcp.md` template is therefore useful, but remains a natural language instruction. MCP has no capability for a server to enforce "call this tool before responding". For a real guarantee, enforcement is needed in the host/agent harness or a single orchestrating API that hides secondary tools.

### 3.3 The final check is not tied to the final response

In case A the model checked a function with props, `disabled`, JSDoc and filename `_AccessibleButton.tsx`; the final response instead showed a function without props/JSDoc using `console.log`. The server doesn't know the model's final response and doesn't emit a receipt tied to the code hash. "I called `rule_tool_check`" therefore doesn't prove the delivered artifact is the one validated.

## 4. Router: quality, bias and determinism

### 4.1 Quantitative results

- isolated corpus: 70 skills, 69 route candidates, 76 tools;
- tool definitions: 90,873 bytes, approximately **22,719 tokens** using byte/4 estimate;
- 60 curated prompts: **52/60 top-1**, **58/60 top-6**;
- 69 prompts derived from skill descriptions: **68/69 exact top-1**;
- `rule-ui`'s description routes to `rule-ui-design-system`;
- `loadAllSkills(true)` duplicates the registry: **76 → 152 tools**.

### 4.2 Dominant path bias

The logic at `src/tools/ai.js:222` applies a strong floor/bias to the detected framework. The repository itself is classified by `rule_tool_detect` as `vanilla` frontend, despite being an MCP Node server. Test:

| Prompt                           | Path              | Primary route                                     |
| -------------------------------- | ----------------- | ------------------------------------------------- |
| "Protect a backend web service…" | absent            | `rule-backend-security`                            |
| same prompt                      | root of this repo | **`rule-frontend-vanilla-reactive`**               |
| same case via `/rule-mcp`  | root of this repo | **`rule-frontend-vanilla-reactive`, confidence 1** |

The correct backend route only appears as an alternative. Project detection must be a secondary, domain-aware signal, not a cross-cutting override.

### 4.3 Misleading confidence

`confidence` is normalized on the group maximum (`rawScore / maxRaw`, `src/tools/ai.js:239`), so the best candidate almost always gets `1`, even when the query is ambiguous. "Build a secure API" produced `rule-platform-library` with confidence `1`. This is neither a probability nor an absolute confidence; the API should call it `relativeScore` or calibrate an absolute threshold with "unknown" fallback.

### 4.4 Incomplete multilingual support

The corpus and synonyms are predominantly English:

| Language | Backend security prompt                     | Route                  |
| -------- | ------------------------------------------- | ---------------------- |
| English  | rate limiting + secure headers              | `rule-backend-security` |
| Italian  | limitazione richieste + intestazioni sicure | `rule-backend`          |
| French   | limitation requêtes + en-têtes sécurisés    | `rule-backend`          |

The general domain is recognized, but specialization is lost. Multilingual aliases or a semantic normalization/classification phase is needed.

### 4.5 TLDR and search

`src/tools/skill.js:104` runs `search(query, 5)` and **then** filters by skill. If that skill is not in the top-five global results, TLDR returns "no relevant sections" even when the document contains useful material. With the canonical skill-name-based query, 30 skill-tools find no sections. The search must filter the corpus by skill before top-k.

### 4.6 `$HOME` contamination

In an isolated environment, 76 tools load. With the normal workstation `$HOME`, 11 external skills (`caveman-*`, `frontend-design`, etc.) are imported and the total rises to 87. `loadPluginJs()` additionally imports arbitrary JavaScript code from the plugin. Consequences:

- non-reproducible surface and behavior;
- local prompt/tool supply-chain;
- plugins executed with server privileges;
- build, test and production depend on the user's home content.

Plugin import must be opt-in, allowlisted and separated from the official corpus.

## 5. Blocking findings (P0)

### P0-01 - `prompts/get` is not MCP-compliant

- `src/server.js:150-154` returns `{ prompt }`;
- the official schema requires `{ description?, messages }` at top level;
- `src/prompts/index.js` uses `role: "system"`, but MCP allows `user` or `assistant`.

All five prompts fail `GetPromptResultSchema`. `prompts/list` passes; `prompts/get` does not.

**Fix:** return `description`/`messages` without wrapper and convert the initial message to `user` role.

### P0-02 - Build/release/Docker can delete all skills

`scripts/embed-skills.mjs:42` removes `skills/` before verifying the source. It copies exclusively `~/.agents/skills/rule-*`, excluding the central `pix_tool` skill; if no sources are found it creates only a placeholder directory without `SKILL.md`.

Reproduction in temporary clone with empty `HOME`:

```text
Embedding skills...
⚠ No rule skills found in ~/.agents/skills/. Creating placeholder.
Embedded 0 skills
SKILL_MD_COUNT=0
```

Impact:

- `prebuild`, `prepublishOnly`, release workflow and Docker run the script;
- a clean CI loses the versioned corpus;
- a developer's machine can publish unreviewed local content;
- the operation is neither atomic nor reproducible.

**Fix:** the repository must be the canonical source; write to a staging directory, validate hash/count, then atomically replace. Never read `$HOME` during build/release.

### P0-03 - Release pipeline not executable as declared

- `package.json` runs `node scripts/package.mjs`, but the file does not exist;
- `.github/workflows/ci.yml` and `release.yml` run `test/ai.test.mjs`, which does not exist;
- the Dockerfile copies `LICENSE`, which does not exist;
- `scripts/package.sh` overwrites universal installers with minimal stubs and masks `npm pack` failure;
- lint/format/audit in workflows use `|| echo`, so they don't block the pipeline;
- `eslint` and `prettier` are not declared dependencies.

The command `pnpm build`, run in a temporary copy to not destroy the repo, ends with `MODULE_NOT_FOUND scripts/package.mjs` after already emptying `skills/`.

### P0-04 - `rule_tool_check` is bypassable

`src/core/guardrails.js:93-100` accepts `previousPassed` from the caller and skips those checks without verifying a receipt, session or code hash. Passing all IDs, non-compliant code gets `allPass: true`.

Additional reproduced false negatives/positives:

| Input                                                      | Current result               | Expected                         |
| ---------------------------------------------------------- | ---------------------------- | -------------------------------- |
| CSS raw `.foo:hover { … }`                                 | Pass                         | Fail zero-class                  |
| React `style={{ color: "red" }}`                           | Pass                         | Fail no-inline-style             |
| CSS `.foo > span`, `.foo.bar`                              | Pass                         | Fail                             |
| `previousPassed` with all IDs + invalid code               | Pass                         | Run all checks or reject receipt |
| React `import "./Button.css"` with CSS included in payload | Fail external CSS            | Pass                             |
| Markdown file citing `.css`                                | Fail `css-comments-required` | Rule not applicable              |

Causes: `extractRealCSS()` ignores raw CSS; class regex only recognizes `.foo {`; inline style only looks for quoted HTML attributes; CSS import uses the literal string check `import .*.css`.

**Fix:** remove `previousPassed` from public input or emit a server-side signed receipt tied to `sha256(code + context + guardrailVersion)`. In any case, rerun all checks on the final pass.

### P0-05 - `rule_tool_fix` ignores dry-run and allows path traversal

In the `mode=generate` branch, `src/tools/fix.js:58-79` always writes and does not check `dryRun`. It also combines `path`, `baseDir` and generated files with `join()` without verifying the resolved path stays inside the root.

Tests in a temporary directory:

- `dryRun: true` created real files;
- `baseDir: "../outside"` wrote outside the root;
- existing files are overwritten without confirmation/backup.

**Fix:** `resolve`, `relative`, reject absolute/`..` paths, no symlink escape, truly read-only preview mode, atomic write and explicit collision policy.

### P0-06 - Local SSE without auth + CORS wildcard + mutating tools

`src/transport/sse.js:38` sets `Access-Control-Allow-Origin: *`; the daemon starts HTTP on `127.0.0.1:37999` without a token. A web page visited by the user can open SSE, read the session endpoint and send JSON-RPC to localhost. The chain becomes critical because `rule_tool_fix` and ADR write files, and `rule_tool_fix` allows path escape.

Other limits:

- POST body accumulated in memory without limit (`Buffer.concat`);
- a new SSE session closes previous ones;
- no origin allowlist, CSRF token or capability grant.

**Fix:** random bearer token at startup, CORS deny-by-default/allowlist, `Origin` validation, body limit, consent for mutating tools and stdio preference. Loopback binding reduces network exposure but doesn't protect from local browsers.

### P0-07 - `rule_tool_architect interview` is broken in the current snapshot

The tool looks for `skills/rule-architect/assets/context-server.mjs`, but the working tree deleted the entire asset tree. The new implementation is spread across `rule-architect-cli`/`rule-architect-web`, still untracked and not connected to the official tool. The 402-call matrix has a single operational error: `rule_tool_architect` in `check` mode, consistent with the incomplete migration.

**Fix:** complete a single atomic migration, update tool, tests, package files and documentation in the same commit; avoid two concurrent wizards.

### P0-08 - Generator and component templates are not a reliable source

`rule_tool_fix generate` declares Angular and Astro frameworks but `generateComponentFiles()` handles only React/Solid, Vue, Svelte and vanilla; Angular/Astro fall through to the custom element default. The custom element uses a dashless tag (`customElements.define("mycomponent", …)`), invalid for the platform.

`rule_tool_component` has complementary problems:

- React: 0/6 UI templates pass guardrails for missing JSDoc;
- Svelte: 0/6 pass `css-comments-required`;
- Angular, Astro and Solid receive generic HTML/CSS with `{{ label }}`, not valid framework components;
- the first code fence check can ignore the second CSS fence;
- modal without `dialog` semantics, focus management and accessible close label;
- `<button>` often without `type="button"`.

In multi-file mode, **98 out of 114 generated files** fail at least one declared project guardrail; 16 multi-file combinations return a direct error.

## 6. High findings (P1)

### P1-01 - The "fail-closed workflow" is advisory

`preprocessToolCall` and `postprocessToolResult` are useful and validate payloads/output, but exist only inside `callTool()`. They don't intercept final text, host-written files or responses without tools. Documentation and messages must avoid presenting it as an end-to-end guarantee.

### P1-02 - MCP completion is a dead capability

`src/server.js:100` checks `ref.type === "ref"` to complete tool arguments. The MCP `complete` schema supports prompt/resource references (`ref/prompt`, `ref/resource`), not tool argument completion and not the `ref` type. Schema-valid requests always return an empty list.

### P1-03 - Inconsistent resource list/read for plugins

`listResources()` uses all names from `getSkillNames()` and publishes e.g. `rule://caveman`; `readResource()`'s regex only accepts names starting with `pix_tool`, so the advertised resource returns "Resource not found". Additionally, `rule://skills` includes absolute paths and embedded/home duplicates, exposing filesystem details.

### P1-04 - Non-idempotent reload

`loadAllSkills(force = true)` does not clear `_tools`: a second call doubles the list from 76 to 152. The reload command can therefore produce duplicate names, ambiguity and memory growth. Registration must be keyed-map/idempotent and atomic.

### P1-05 - Auto-ADR produces unsolicited side effects and races

The wildcard hook in `src/tools/adr.js:327` creates ADRs for routing/detection/fix. The first four audit calls created ADRs 011–014 and modified the index without explicit request; they were removed at audit end. The "scan max + 1" numbering and index rewrite have no lock, so concurrent processes can collide.

**Fix:** default off, explicit per-session opt-in, lock/atomic rename and semantic deduplication.

### P1-06 - Installer can lose user configuration

`src/cli/install.js:137` transforms invalid JSON into `{}`; subsequent upserts rewrite the file erasing previous content. `backupFile()` exists but is not used. The uninstaller also has generic mappings that don't always match the special paths/configs used by the installer.

**Fix:** fail-closed parse, mandatory backup before every modification, atomic write and round-trip tests for all 23 agents.

### P1-07 - `skills install --all` is not non-interactive and the copier is broken

In a non-TTY shell:

```text
TypeError: stdin.setRawMode is not a function
```

`--all` pre-selects items but still calls the raw interface. Additionally, `copySkill()` combines `source` with already-absolute `Dirent.parentPath`, creating nonexistent/duplicate paths on Node 24. Current assets already show `assets/assets` directories in four skills.

### P1-08 - Unsafe secret handling in shell installer

`scripts/install.sh` reads API keys without silent mode, interpolates them unescaped into `.bashrc`/`.zshrc`, can duplicate them on each run and saves copies in files without explicit `chmod 600`. The MCP server does not need these keys for its own operation.

**Fix:** remove secret collection from the installer or use keychain/provider CLI; never write tokens to shell rc.

### P1-09 - New web wizard: XSS and exposed server

The untracked version in `skills/rule-architect-web/`:

- interpolates input and error messages into `innerHTML` without escaping;
- uses numerous inline `onclick`/`oninput` and one inline `style=`, violating its own principles;
- sets CORS `*`;
- accumulates request body without limit;
- uses `server.listen(PORT)` without host, therefore listens on all interfaces;
- writes configuration without authentication.

Must not be distributed before sanitization, external event listeners, loopback binding and session token.

### P1-10 - Inconsistent metadata/package

- package `1.0.0`, package in `server.json` `0.1.0`;
- GitHub repository with `"source": "gitlab"`;
- description "Zero npm dependencies" but SDK/Zod runtime dependencies;
- self-dependency `"rule-mcp": "link:"`, which creates a self-link and bin warning on clean install;
- README declares 71 tools, isolated runtime 76 and live 87.

### P1-11 - Sandbox timeout does not cancel work

The timeout returns an error to the caller, but the underlying Promise continues and can complete a write after the timeout. For mutating tools, `AbortSignal`, cooperative cancellation and transactions/rollback are needed.

### P1-12 - Incomplete handoff

The project name uses `package.json` of the cwd even when `projectDir` points elsewhere; the standard git diff does not include untracked files, precisely the most relevant ones in the current snapshot. Always use cwd=`projectDir`, include untracked status/names and apply limits/redaction before sending context to a model.

## 7. Medium and maintenance findings (P2)

- **Stale documentation:** extraction of `pix_*` tokens finds 32 names not present in the registry; excluding the server name and intentional examples, about 30 are obsolete aliases like `pix_react`, `pix_vue`, `pix_angular`, `pix_docker` and `rule_tool_testing`, mostly in `docs/01-product-architecture.md` and `docs/02-tools-operations.md`.
- **Internal API/documentation:** the scan detected 20 unused imports and 22 undocumented public symbols; `cli()` and `daemonCommand()` concentrate high responsibilities and complexity.
- **Cyclic dependencies:** registry, skill loader, resource/tool registration and auto-ADR form cyclic clusters that make import order and side effects hard to predict.
- **Naming/generation:** `formField` becomes `Formfield`, losing the word boundary; generated files/components mix `.js`, `.jsx`, `.ts` and barrels without an explicit TypeScript policy.
- **Insufficient health check:** `doctor` can return `ok: true` even when prompts, build, release and some agent configurations are invalid.
- **SSE port not CLI-configurable:** `serveCommand()` always passes `37999` and `src/index.js` does not forward `--port`; `serve --port 3004` still collided on 37999. This contributes to test/daemon fragility.
- **Missing tool annotations:** clients receive no `readOnlyHint`, `destructiveHint` or `idempotentHint`; read-only tools and mutating tools appear equivalent.

## 8. Test, lint, CI and release: real results

| Command/test                                     | Status           | Note                                                                |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------- |
| `node test/smoke.mjs`                            | Pass             | Very superficial smoke                                              |
| `pnpm run ci`                                    | **Fail**         | Stops on `rule-data-duckdb` missing `See also`                       |
| `pnpm test:all`                                  | **Fail**         | Runs Playwright suites with `node`                                  |
| manual batch, 19 files (`console-test` excluded) | 14 pass / 5 fail | daemon, docs, skill-docs, 2× Playwright                             |
| `pnpm lint`                                      | **Fail**         | `eslint` not declared; external audit finds 324 issues              |
| `pnpm format`                                    | **Fail**         | `prettier` not declared; external audit reports 292 files           |
| `pnpm audit --prod`                              | Pass             | 0 known vulnerabilities in registry at test time                    |
| `pnpm build` in temp clone                       | **Fail**         | embed deletes skills, then `package.mjs` missing                    |
| `pnpm pack` in temp clone                        | Partial Pass     | Pack possible, doesn't prove publish workflow correctness           |
| JSON/YAML/JS/Bash syntax                         | Pass             | PowerShell not verified                                             |
| Docker build                                     | Not run          | Docker absent; statically fails for `LICENSE` and embed             |
| `rule_tool_check` on this Markdown report         | **Fail 1/16**    | False positive `css-comments-required` because text mentions `.css` |

Operational note: with pnpm 11, `pnpm ci` is a built-in install command; to run the package script you need `pnpm run ci`.

### Test weaknesses

- `test:all` includes `add-once.test.mjs` and `architect-ui.test.mjs`, which require Playwright runner;
- Playwright uses hard-coded port 19000, already occupied during audit;
- GitHub CI calls a nonexistent file;
- the suite doesn't cover `previousPassed`, raw CSS, React style objects, path traversal, dry-run, malformed config, prompt schema or resource plugins;
- `doctor` returns `ok: true` even with broken build/prompt/release and unvalidated agent configs;
- CI masks lint/format/audit instead of using them as gates.

## 9. Skills and content audit

All 70 directories have:

- frontmatter name consistent with the directory;
- lowercase/hyphen names compatible with Agent Skills format;
- description present and under 1,024 characters;
- resolvable relative Markdown links;
- tools callable in declared modes, except the architect branch already described.

Cross-cutting gaps:

- `rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-sqlite` missing `See also` and break the suite;
- 30 canonical TLDR queries return no sections due to global top-k bug;
- `rule-architect-cli`, `rule-architect-web` and the three new data skills are untracked, therefore not part of a reproducible Git release;
- descriptions and APIs often describe enforcement stronger than actually achievable;
- many assets are duplicated (`assets/assets`) or generate code that doesn't satisfy guardrails.

The complete per-skill table is in Appendix A.

## 10. Tool audit

### 10.1 Skill-tools

For each of the 67 skill-tools, the following modes were called:

1. `full`;
2. `summary`;
3. `search`;
4. `guardrails`;
5. `check`;
6. `tldr`.

Total: **402 calls**. The transport and MCP shape are operational. This proves callability, not semantic correctness of every returned text. `rule_tool_architect check` is the runtime exception in the migration snapshot.

### 10.2 Deterministic tools

| Tool                       | Verdict                                                  |
| -------------------------- | -------------------------------------------------------- |
| `pix_tool`                 | Callable, but not mandatory; ranking needs correction    |
| `rule_tool_search`          | Callable; BM25 useful, relevance/top-k needs improvement |
| `rule_tool_check`           | **Blocked**: bypass and incomplete parsers               |
| `rule_tool_scaffold`        | Callable; returns text, doesn't write                    |
| `rule_tool_detect`          | Callable; classification too frontend-centric            |
| `rule_tool_component`       | **Blocked**: unreliable output for framework/guardrails  |
| `rule_tool_fix`             | **Blocked**: filesystem safety                           |
| `rule_tool_process_adr`     | Partial: side effects/concurrency                        |
| `rule_tool_process_handoff` | Partial: cwd/untracked/redaction                         |

The complete list of 76 isolated tools is in Appendix B.

## 11. Recommended architecture for real enforcement

### Phase 1 - block immediate risks

1. Disable `rule_tool_fix generate/fix` and mutating SSE until complete sandbox/auth.
2. Disable public `previousPassed`.
3. Fix MCP prompts, build, CI, Docker and installer.
4. Make plugins and auto-ADR opt-in.
5. Complete or retire the split wizard.

### Phase 2 - single gateway

Expose only a small core set by default:

```text
pix_route
pix_evidence
pix_validate
rule_tool_apply (explicit consent)
```

`pix_route` must internally perform routing + evidence loading, not just suggest the next tool to the model. The 67 skill tools can remain available in advanced mode but not all in the initial tool-choice budget.

### Phase 3 - verifiable receipt

`pix_validate` should produce:

```json
{
  "artifactSha256": "…",
  "skillVersion": "…",
  "guardrailVersion": "…",
  "allPass": true,
  "receipt": "server-signed-or-session-bound-token"
}
```

Every apply/write must require a valid receipt for exactly the same bytes. A host extension can additionally block the final response or write until a receipt exists; an MCP server alone cannot intercept the model's final text.

### Phase 4 - calibrated router

- classify domain first (backend/frontend/data/devops/process), then framework;
- use path/framework only within the relevant domain;
- introduce absolute score + "unknown" threshold;
- add IT/FR/ES aliases or controlled semantic embeddings;
- deduplicate registry and separate official/plugin skills;
- measure top-1/top-k on a versioned dataset, including negative/ambiguous prompts.

### Phase 5 - live conformance in CI

An optional suite, protected by secrets/budget, must run multiple runs per model/host and measure:

- percentage of `pix_tool` first call when instruction is present;
- correct route;
- loading of the indicated skill;
- check on final artifact hash;
- no tool calls for out-of-domain requests;
- no writes without consent.

Deterministic tests must remain the primary gate; live tests are a probabilistic metric, not an unreproducible requirement for every PR.

## 12. Remediation priorities

| Order | Action                                            | Acceptance gate                                                                         |
| ----: | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
|     1 | Sandbox `rule_tool_fix`; SSE auth/CORS             | No write outside root/symlink; zero side effect dry-run; hostile browser test red→green |
|     2 | Remove `previousPassed` bypass                    | Modified code forces all checks; adversarial CSS/JSX tests green                        |
|     3 | Make embed/build reproducible                     | Build with empty HOME preserves exactly the versioned skills                            |
|     4 | Fix `prompts/get` and remove fake completion tool | All responses pass official SDK schemas                                                 |
|     5 | Fix CI/release/package metadata                   | A single local command reproduces all gates; no `                                       |     | echo` |
|     6 | Fix generators/templates                          | Every framework output compiles and passes independent guardrails                       |
|     7 | Make installer lossless/idempotent                | Matrix of 23 agents install→reinstall→uninstall without loss                            |
|     8 | Gateway/orchestration and receipts                | Final artifact hash-equal to the validated one                                          |
|     9 | Calibrate router/multilingual                     | Agreed top-1 dataset, unknown threshold, path doesn't change domain                     |
|    10 | Update docs/manifest                              | Auto-generated counts/versions/source                                                   |

## 13. Compliance conclusion for `gpt-5.6-sol`

**Technical compatibility:** yes. Pi 0.80.6 exposes the server and `openai-codex/gpt-5.6-sol` generates valid tool calls, reads MCP output and composes useful responses.

**Workflow compliance:** no. The model can and often prefers to skip `pix_tool`; can call skill-tools directly, can deliver code different from what was checked, and there is no server-side gate on the final response.

**Overall MCP compliance:** partial. Tools and many resources work; prompts and completion are defective.

**Production/release approval:** denied until P0 closure. The problem is not the specific model: it's primarily about server contracts, trust boundaries and pipeline. The explicit `/rule-mcp` command noticeably improves model behavior, but does not replace verifiable enforcement.

## Appendix A - Per-skill structural and trigger audit

| Skill                           | Lines | MCP tool                             | Metadata/links              | TLDR canonical query | Result                                       |
| ------------------------------- | ----: | ------------------------------------ | --------------------------- | -------------------- | -------------------------------------------- |
| `pix_tool`                      |   254 | `pix_tool`                           | Pass                        | n/a                  | **Pass**                                     |
| `rule-architect`                 |   253 | `rule_tool_architect`                 | Pass                        | No result            | **Blocked: interview asset missing**         |
| `rule-architect-cli`             |    82 | `rule_tool_architect_cli`             | Pass                        | Result               | **Warning: untracked/WIP**                   |
| `rule-architect-web`             |    71 | `rule_tool_architect_web`             | Pass                        | Result               | **Blocked: untracked + UI/security defects** |
| `rule-backend`                   |    61 | `rule_tool_backend`                   | Pass                        | Result               | **Pass**                                     |
| `rule-backend-api-design`        |   158 | `rule_tool_backend_api_design`        | Pass                        | Result               | **Pass**                                     |
| `rule-backend-express`           |   147 | `rule_tool_backend_express`           | Pass                        | Result               | **Pass**                                     |
| `rule-backend-fastify`           |    82 | `rule_tool_backend_fastify`           | Pass                        | Result               | **Pass**                                     |
| `rule-backend-hono`              |    91 | `rule_tool_backend_hono`              | Pass                        | Result               | **Pass**                                     |
| `rule-backend-nestjs`            |    94 | `rule_tool_backend_nestjs`            | Pass                        | No result            | **Warning**                                  |
| `rule-backend-node`              |   214 | `rule_tool_backend_node`              | Pass                        | No result            | **Warning**                                  |
| `rule-backend-security`          |   174 | `rule_tool_backend_security`          | Pass                        | No result            | **Warning**                                  |
| `rule-data`                      |    39 | `rule_tool_data`                      | Pass                        | Result               | **Pass**                                     |
| `rule-data-duckdb`               |   234 | `rule_tool_data_duckdb`               | Warning: missing `See also` | Result               | **Warning**                                  |
| `rule-data-indexed-db`           |   317 | `rule_tool_data_indexed_db`           | Warning: missing `See also` | No result            | **Warning**                                  |
| `rule-data-mongodb`              |   743 | `rule_tool_data_mongodb`              | Pass                        | No result            | **Warning**                                  |
| `rule-data-mysql`                |   595 | `rule_tool_data_mysql`                | Pass                        | Result               | **Pass**                                     |
| `rule-data-postgresql`           |   649 | `rule_tool_data_postgresql`           | Pass                        | No result            | **Warning**                                  |
| `rule-data-sql`                  |   632 | `rule_tool_data_sql`                  | Pass                        | No result            | **Warning**                                  |
| `rule-data-sqlite`               |   242 | `rule_tool_data_sqlite`               | Warning: missing `See also` | Result               | **Warning**                                  |
| `rule-devops`                    |    42 | `rule_tool_devops`                    | Pass                        | Result               | **Pass**                                     |
| `rule-devops-docker`             |   128 | `rule_tool_devops_docker`             | Pass                        | No result            | **Warning**                                  |
| `rule-devops-gitlab-ci`          |    75 | `rule_tool_devops_gitlab_ci`          | Pass                        | Result               | **Pass**                                     |
| `rule-devops-testing`            |   300 | `rule_tool_devops_testing`            | Pass                        | No result            | **Warning**                                  |
| `rule-devops-version`            |   161 | `rule_tool_devops_version`            | Pass                        | No result            | **Warning**                                  |
| `rule-frontend`                  |    61 | `rule_tool_frontend`                  | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-angular`          |   504 | `rule_tool_frontend_angular`          | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-astro`            |   526 | `rule_tool_frontend_astro`            | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-meta-next`        |   201 | `rule_tool_frontend_meta_next`        | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-meta-nuxt`        |   181 | `rule_tool_frontend_meta_nuxt`        | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-meta-remix`       |   224 | `rule_tool_frontend_meta_remix`       | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-react`            |   688 | `rule_tool_frontend_react`            | Pass                        | No result            | **Warning**                                  |
| `rule-frontend-solidjs`          |   532 | `rule_tool_frontend_solidjs`          | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-svelte`           |   508 | `rule_tool_frontend_svelte`           | Pass                        | Result               | **Pass**                                     |
| `rule-frontend-vanilla-reactive` |   640 | `rule_tool_frontend_vanilla_reactive` | Pass                        | No result            | **Warning**                                  |
| `rule-frontend-vue`              |   522 | `rule_tool_frontend_vue`              | Pass                        | No result            | **Warning**                                  |
| `rule-platform`                  |    43 | `rule_tool_platform`                  | Pass                        | Result               | **Pass**                                     |
| `rule-platform-agent`            |   294 | `rule_tool_platform_agent`            | Pass                        | No result            | **Warning**                                  |
| `rule-platform-desktop`          |   542 | `rule_tool_platform_desktop`          | Pass                        | Result               | **Pass**                                     |
| `rule-platform-expo`             |   254 | `rule_tool_platform_expo`             | Pass                        | Result               | **Pass**                                     |
| `rule-platform-library`          |   259 | `rule_tool_platform_library`          | Pass                        | Result               | **Pass**                                     |
| `rule-platform-web`              |   241 | `rule_tool_platform_web`              | Pass                        | No result            | **Warning**                                  |
| `rule-process`                   |    43 | `pix_process`                        | Pass                        | Result               | **Pass**                                     |
| `rule-process-adr`               |    96 | `rule_tool_process_adr`               | Pass                        | n/a                  | **Pass**                                     |
| `rule-process-bmad`              |   422 | `rule_tool_process_bmad`              | Pass                        | Result               | **Pass**                                     |
| `rule-process-documentation`     |   201 | `rule_tool_process_documentation`     | Pass                        | No result            | **Warning**                                  |
| `rule-process-feature-workflow`  |   121 | `rule_tool_process_feature_workflow`  | Pass                        | Result               | **Pass**                                     |
| `rule-process-handoff`           |    97 | `rule_tool_process_handoff`           | Pass                        | n/a                  | **Pass**                                     |
| `rule-styleguide`                |    58 | `rule_tool_styleguide`                | Pass                        | Result               | **Pass**                                     |
| `rule-styleguide-a11y`           |   514 | `rule_tool_styleguide_a11y`           | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-css`            |   488 | `rule_tool_styleguide_css`            | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-html`           |   339 | `rule_tool_styleguide_html`           | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-javascript`     |   553 | `rule_tool_styleguide_javascript`     | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-json`           |   132 | `rule_tool_styleguide_json`           | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-markdown`       |   132 | `rule_tool_styleguide_markdown`       | Pass                        | Result               | **Pass**                                     |
| `rule-styleguide-naming`         |   228 | `rule_tool_styleguide_naming`         | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-patterns`       |   183 | `rule_tool_styleguide_patterns`       | Pass                        | No result            | **Warning**                                  |
| `rule-styleguide-validation`     |   472 | `rule_tool_styleguide_validation`     | Pass                        | No result            | **Warning**                                  |
| `rule-toolchain`                 |    69 | `rule_tool_toolchain`                 | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-biome`           |   101 | `rule_tool_toolchain_biome`           | Pass                        | No result            | **Warning**                                  |
| `rule-toolchain-eslint`          |    81 | `rule_tool_toolchain_eslint`          | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-husky`           |   116 | `rule_tool_toolchain_husky`           | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-parcel`          |   120 | `rule_tool_toolchain_parcel`          | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-pnpm`            |   114 | `rule_tool_toolchain_pnpm`            | Pass                        | No result            | **Warning**                                  |
| `rule-toolchain-project`         |   217 | `rule_tool_toolchain_project`         | Pass                        | No result            | **Warning**                                  |
| `rule-toolchain-turborepo`       |   108 | `rule_tool_toolchain_turborepo`       | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-typescript`      |   132 | `rule_tool_toolchain_typescript`      | Pass                        | Result               | **Pass**                                     |
| `rule-toolchain-vite`            |    93 | `rule_tool_toolchain_vite`            | Pass                        | No result            | **Warning**                                  |
| `rule-ui`                        |    79 | `rule_tool_ui`                        | Pass                        | Result               | **Pass**                                     |
| `rule-ui-design-system`          |   214 | `rule_tool_ui_design_system`          | Pass                        | No result            | **Warning**                                  |

Notes: all 70 names are Agent Skills-compatible (valid lowercase/hyphen names, unique, name matches directory, descriptions below 1,024 characters); all relative Markdown links resolve. "Pass" is structural/runtime, not independent factual certification of every framework/database statement.

## Appendix B - Packaged MCP tool inventory

Isolated package state: **76 tools**. Live workstation state: **87 tools** because 11 unrelated global Agent Skills are auto-imported as plugins.

| Tool                                 | Kind          | Exercised                                     | Finding                                 |
| ------------------------------------ | ------------- | --------------------------------------------- | --------------------------------------- |
| `pix_tool`                           | Router        | 60 curated + 69 self-description + live model | Partial: not mandatory; routing defects |
| `rule_tool_architect`                 | Skill         | 6 modes                                       | Blocked: interview missing              |
| `rule_tool_architect_cli`             | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_architect_web`             | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend`                   | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend_api_design`        | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend_express`           | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend_fastify`           | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend_hono`              | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_backend_nestjs`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_backend_node`              | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_backend_security`          | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_data`                      | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_data_duckdb`               | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_data_indexed_db`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_data_mongodb`              | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_data_mysql`                | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_data_postgresql`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_data_sql`                  | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_data_sqlite`               | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_devops`                    | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_devops_docker`             | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_devops_gitlab_ci`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_devops_testing`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_devops_version`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_frontend`                  | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_angular`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_astro`            | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_meta_next`        | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_meta_nuxt`        | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_meta_remix`       | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_react`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_frontend_solidjs`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_svelte`           | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_frontend_vanilla_reactive` | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_frontend_vue`              | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_platform`                  | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_platform_agent`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_platform_desktop`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_platform_expo`             | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_platform_library`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_platform_web`              | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `pix_process`                        | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_process_bmad`              | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_process_documentation`     | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_process_feature_workflow`  | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_styleguide`                | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_styleguide_a11y`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_css`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_html`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_javascript`     | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_json`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_markdown`       | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_styleguide_naming`         | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_patterns`       | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_styleguide_validation`     | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_toolchain`                 | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_biome`           | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_toolchain_eslint`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_husky`           | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_parcel`          | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_pnpm`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_toolchain_project`         | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_toolchain_turborepo`       | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_typescript`      | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_toolchain_vite`            | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_ui`                        | Skill         | 6 modes                                       | Modes callable                          |
| `rule_tool_ui_design_system`          | Skill         | 6 modes                                       | Partial: TLDR canonical query empty     |
| `rule_tool_search`                    | Deterministic | Integration/adversarial                       | Pass; relevance needs tuning            |
| `rule_tool_check`                     | Deterministic | Integration/adversarial                       | Blocked: trusted previousPassed bypass  |
| `rule_tool_scaffold`                  | Deterministic | Integration/adversarial                       | Pass (returns text only)                |
| `rule_tool_detect`                    | Deterministic | Integration/adversarial                       | Partial: frontend-only classification   |
| `rule_tool_process_adr`               | Deterministic | Integration/adversarial                       | Partial: races/auto-log pollution       |
| `rule_tool_fix`                       | Deterministic | Integration/adversarial                       | Blocked: dry-run/path escape            |
| `rule_tool_process_handoff`           | Deterministic | Integration/adversarial                       | Partial: project-name/diff gaps         |
| `rule_tool_component`                 | Deterministic | Integration/adversarial                       | Blocked: invalid/non-compliant outputs  |

## Appendix C - Executable source inventory

| File                                              | Lines | Static parse | Review note                                                          |
| ------------------------------------------------- | ----: | ------------ | -------------------------------------------------------------------- |
| `bin/rule-mcp.js`                           |    16 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `scripts/embed-skills.mjs`                        |    67 | Pass         | Destructive/non-reproducible skill embedding                         |
| `scripts/install-skills.sh`                       |    29 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `scripts/install.ps1`                             |   526 | Not run      | Not parsed: PowerShell unavailable                                   |
| `scripts/install.sh`                              |   785 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `scripts/package.sh`                              |    90 | Pass         | Overwrites installers; masks pack failure                            |
| `scripts/post-process.mjs`                        |   159 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `scripts/setup.sh`                                |    51 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `scripts/uninstall.ps1`                           |   499 | Not run      | Not parsed: PowerShell unavailable                                   |
| `scripts/uninstall.sh`                            |   696 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/commands.js`                             |   504 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/completions.js`                          |   250 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/daemon.js`                               |   813 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/doctor.js`                               |   383 | Pass         | Health result misses prompt/build/release failures                   |
| `src/cli/install.js`                              |   692 | Pass         | Malformed-config data loss; uninstall path mismatches                |
| `src/cli/paths.js`                                |    59 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/skills-install.js`                       |   261 | Pass         | Non-TTY crash; recursive copy path defect                            |
| `src/cli/tui.js`                                  |   163 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/cli/uninstall.js`                            |    36 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/core/bm25.js`                                |   292 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/core/detector.js`                            |   156 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/core/enforcement.js`                         |   135 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/core/file-tree.js`                           |   599 | Pass         | Framework fallback, invalid custom-element tag, naming drift         |
| `src/core/guardrail-defs.js`                      |   684 | Pass         | Regex blind spots; CSS/inline-style false passes                     |
| `src/core/guardrails.js`                          |   165 | Pass         | `previousPassed` bypass                                              |
| `src/core/skills.js`                              |   306 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/core/template-data.js`                       |   226 | Pass         | Accessibility/semantic/template defects                              |
| `src/core/templates.js`                           |   164 | Pass         | Framework fallback and non-compliant generation                      |
| `src/index.js`                                    |   428 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/prompts/index.js`                            |   182 | Pass         | Invalid MCP prompt role `system`                                     |
| `src/resources/index.js`                          |   179 | Pass         | Plugin resources advertised but unreadable; duplicate/path leak      |
| `src/server.js`                                   |   188 | Pass         | Invalid prompts/get and completion implementation                    |
| `src/tools/adr.js`                                |   329 | Pass         | Auto-log side effects and concurrency risk                           |
| `src/tools/ai.js`                                 |   269 | Pass         | Router scoring, confidence, path-bias defects                        |
| `src/tools/architect.js`                          |   112 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/tools/fix.js`                                |   197 | Pass         | Dry-run ignored in generate; path escape/overwrite                   |
| `src/tools/handoff.js`                            |   508 | Pass         | Project-name precedence and incomplete working tree                  |
| `src/tools/router.js`                             |   256 | Pass         | Registry/enforcement; force reload duplicates; plugin trust boundary |
| `src/tools/skill.js`                              |   318 | Pass         | TLDR top-5-before-filter defect                                      |
| `src/transport/cert.js`                           |   113 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `src/transport/sse.js`                            |   233 | Pass         | Unauthenticated wildcard-CORS loopback service                       |
| `src/utils/sandbox.js`                            |   145 | Pass         | Timeout does not cancel work; errors swallowed                       |
| `test/add-once.test.mjs`                          |    51 | Pass         | Playwright test incorrectly run with Node by test:all                |
| `test/agent-commands-install.test.mjs`            |    51 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/ai.test.mjs`                                |    80 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/architect-ui.test.mjs`                      |   114 | Pass         | Hard-coded shared port; stale wizard expectations                    |
| `test/cli-tui.test.mjs`                           |    55 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/console-test.mjs`                           |    42 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/daemon-wrapper.test.mjs`                    |    25 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/daemon.test.mjs`                            |    97 | Pass         | Environment-dependent native service assumptions                     |
| `test/detector.test.mjs`                          |   105 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/docs-architect.test.mjs`                    |   138 | Pass         | Runtime fail: deleted architect assets                               |
| `test/doctor-ui.test.mjs`                         |    78 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/enforcement.test.mjs`                       |   100 | Pass         | Does not test previousPassed or guardrail false negatives            |
| `test/fixtures/plugins/my-custom-rules/plugin.js` |    44 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/framework-routing.test.mjs`                 |    83 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/https.test.mjs`                             |   108 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/pi-install.test.mjs`                        |    33 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/repository-contract.test.mjs`               |    92 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/sandbox.test.mjs`                           |    92 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/skills-docs.test.mjs`                       |   100 | Pass         | Runtime fail: missing `See also` in new data skills                  |
| `test/smoke.mjs`                                  |   111 | Pass         | Parsed; no blocker isolated by automated scan                        |
| `test/sse.test.mjs`                               |   120 | Pass         | Parsed; no blocker isolated by automated scan                        |

## Appendix D - Artifacts and reproducibility

The raw audit artifacts are temporary and not included in the package:

- `/tmp/rule-mcp-static-audit.json` - inventory, metadata, templates and guardrails;
- `/tmp/rule-skill-mode-matrix.json` - 402 calls per mode;
- `/tmp/rule-audit-gpt56sol-a.jsonl` … `h.jsonl` - model/tool chat traces;
- `/tmp/rule-audit-tests.log` - per-file test batch;
- `/tmp/rule-audit-eslint.log` and `/tmp/rule-audit-prettier.log`;
- `/tmp/rule-audit-pnpm-run-ci.log`, `/tmp/rule-audit-pack.log` and isolated test logs.

Key commands, to be run with auto-ADR disabled and preferably in a temporary clone:

```bash
# Actual package suite (do not use `pnpm ci`, which in pnpm 11 installs)
RULE_MCP_DISABLE_AUTO_ADR=1 pnpm run ci

# Smoke and dependency audit
RULE_MCP_DISABLE_AUTO_ADR=1 pnpm test
pnpm audit --prod

# Tool inventory isolated from user home
HOME=/tmp/rule-clean-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node --input-type=module -e \
  'import {loadAllSkills} from "./src/core/skills.js"; import {listTools} from "./src/tools/router.js"; await loadAllSkills(); console.log(listTools().length)'

# JavaScript syntax verification
find src bin scripts test skills -type f \( -name "*.js" -o -name "*.mjs" \) \
  -print0 | xargs -0 -n1 node --check
```

`build`, `rule_tool_fix`, installer and ADR tests must remain in temporary directories until P0 findings are fixed.

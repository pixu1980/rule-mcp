# Execution plan — caveman compression on every server→model surface

Goal: every time this MCP server hands text to a model, that text passes through the
deterministic caveman compression pipeline (ported from `caveman-compress`, see
`docs/07-engineering-guides.md` + ADR 073). Converted JS lives in `src/core/text/`.
This plan audits every surface, closes the remaining gaps, adds an invariant test,
and documents the manifest of which documents get compressed.

## Facts established by measurement (this session)

| Surface                              | Size today             | Compression today                      | Win if compressed                          |
| ------------------------------------ | ---------------------- | -------------------------------------- | ------------------------------------------ |
| `tools/call` results (all 106 tools) | —                      | ✅ `finalize()` → `compressResult`     | —                                          |
| `resources/read` text bodies         | —                      | ✅ `_serve.js` → `compressSurfaceText` | —                                          |
| `prompts/get` messages               | —                      | ✅ `_prompt-handlers.js`               | —                                          |
| Handoff read → context (hooks)       | up to 8k chars/session | ❌ raw                                 | 2.3% on our own handoff; 17–42% on verbose |
| `tools/list` descriptions            | ~3,512 tok/turn        | ❌ raw                                 | ~0.7% (already terse; schema stays raw)    |
| `prompts/list` descriptions          | ~4,757 tok             | ❌ raw                                 | ~4.5%                                      |
| `resources/list` descriptions        | ~3,461 tok             | ❌ raw                                 | ~0.0% (already terse)                      |
| `completions/complete`               | vocab                  | n/a — skip                             | vocabulary, not prose                      |
| Banner (update notice)               | ~1 line                | ⚠️ added after `finalize`              | terse; run pass or accept                  |

## Already done (verify, do not redo)

- [x] **Python→JS port of the caveman-compress algorithms** in `src/core/text/`:
      `detect.py` → `_classify.js` + `_line-shape.js`; the sensitive-name denylist from
      `compress.py` → `_sensitive.js`; `validate.py` → `compress-guard/` (with a parity
      test that runs the real python CLI when installed, `_guard.test.mjs`); the benchmark
      → `scripts/reports/compression/` (`pnpm report:compression`); the LLM compression
      step is deliberately NOT ported (ADR 073: determinism + cache + zero-dep contract).
- [x] **Attribution / open-source credit** — ADR 073, `src/core/text/_caveman.js` header,
      `docs/07-engineering-guides.md` (§ ported rules): the caveman skill and its
      caveman-compress companion are credited as inspiration. To extend: README block (item 5).
- [x] **Levels + opt-outs** — `RULE_MCP_CAVEMAN_LEVEL=off|lite|full|ultra`,
      `RULE_MCP_NO_CAVEMAN=1`; part of the tool cache key.
- [x] `rule_tool_compress` exposes the same deterministic passes to any caller.

## Document categories the plan must cover (user requirement)

| Category                         | Where it enters the context                                                                     | Status                                            | Plan item |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------- |
| Markdown (handoffs, docs)        | handon tool result / resume hook block; docs served via `rule://` text resources                 | tool ✅, resources ✅, **hook ❌**                | 1         |
| Skills                           | `rule://<skill>` + `<skill>/summary` resources (text/markdown); evidence embedded in tool output | ✅ (guard holds)                                  | keep      |
| Resources                        | `resources/list` metadata + `resources/read` bodies                                             | read ✅, list ❌                                  | 2c        |
| Instructions (directives, hooks) | SessionStart/UserPromptSubmit `additionalContext`; agent-instruction files                      | directives already terse; resume block ❌         | 1, 4b     |
| Prompts                          | `prompts/list` (schema+descriptions) + `prompts/get` bodies                                     | get ✅, list ❌                                   | 2a        |
| Tools                            | `tools/list` (names/descriptions/schemas) + `tools/call` results                                | results ✅, list descriptions ❌                  | 2b        |
| Personas                         | plan/plan-docs outputs (finalize ✅); `src/roles/*.md` source files                             | served ✅; disk = source of truth, never compress | keep      |

Never compressed (data, not prose): `application/json` resource bodies, JSON tool
payloads, zod schemas, telemetry, `completions` vocabulary.

---

## Phase 1 — Close the handoff→context hook path (the named flow) — ITEM 1, ✅ executed

- [x] **1.1** Write failing test `src/core/session/resume/__tests__/_compression.test.mjs`:
      with a verbose handoff fixture, `resumeContext({ source: "resume" })` output is shorter
      than raw, still contains (heading, inline code, `Still true`, file name), and books
      telemetry source `caveman-resume`; opt-outs (`NO_RESUME_HANDON`, `NO_CAVEMAN`) still work.
- [x] **1.2** Implement: `handoffBlock()` in `src/core/session/resume/_context.js` runs
      `compressSurfaceText({ source: "caveman-resume" })` on the assembled block (guard +
      per-block rollback already inside the pipeline). Single choke point: covers the CLI
      `guard` hook injection AND `resumeAnnouncement` (tool banner).
- [x] **1.3** `node --test src/core/session/resume/__tests__/` + `src/core/text/__tests__/` green.
      Status: resume suite 7/7, handon 30/30, text 36/36, guard (incl. python parity) 11/11,
      router 14/14, resource-surface 5/5; eslint clean; pix_check (rule-backend-node) 56/56.
      Measured on the verbose fixture: compressed block < raw block, `caveman-resume` booked.

## Phase 2 — Cover the protocol list surfaces — ✅ executed

- [x] **2a prompts/list** — `_prompt-handlers.js` list handler: compress `description`
      and argument descriptions (names untouched). Test in `_surface-compression.test.mjs`.
      Books telemetry source `caveman-prompt-list`. Measured ~4.5% of descriptions.
- [x] **2b tools/list descriptions** — `listTools()`: compress each tool `description`
      (schema, names, annotations untouched); memo key extended with the caveman state.
      `_tool-budget.test.mjs` still passes (only helps); `_surface.test.mjs` fixtures use
      one-letter descriptions → unaffected. New test file
      `src/tools/router/__tests__/_surface-compression.test.mjs` + NO_CAVEMAN toggle.
- [x] **2c resources/list** — `compressResourceListing` (`src/resources/_listing.js`),
      wired in `src/server/index.js`; labels pass through (no-op on the real set,
      invariant-only). Tests in `src/resources/__tests__/_listing.test.mjs`.
- [x] Completions: skip (vocabulary, not prose) — recorded in **ADR 077**.

Verification: router 16/16, prompts 39/39, resources 16/16, transport 51/51, budget 7/7,
minimal-tools + reminder green; eslint clean; pix_check (rule-backend-node) 56/56 on
`_surface.js`, `_prompt-handlers.js`, `_listing.js`, `_context.js`.
ADR 077: document + record the prompts/list decision reversal.

## Phase 3 — Invariant + manifest — ✅ executed

- [x] **3.1** `src/core/text/_surfaces.js`: declarative list of every server→model surface
      (name, handler path, compressor, booked source; documented skips: error envelopes,
      completions, JSON). Test `src/core/text/__tests__/_surfaces.test.mjs` walks it: with
      caveman on, each prose surface's output on a verbose sample is shorter, JSON stays
      identical, structural guard errors = 0; skips say why. The last gap was closed so the
      manifest is truthful: banners now compress in `withBanner()` under `caveman-banner`.
- [x] **3.2** Docs: "Compression surfaces" section in `docs/07-engineering-guides.md`
      (the manifest table + the by-category answer).

Verification: text 36+4, router 16, prompts 39, resources 16, resume 7, self-update 28,
gateway 34, cli 55 (1 pre-existing skip) all green; eslint clean; pix_check (rule-backend-node)
56/56 on `_surfaces.js` and `_helpers.js`.

## Phase 4 — Write-time compression of artifacts the model reads later (double win)

- [ ] **4a** `rule_tool_process_handoff`: compress the generated handoff before writing
      `docs/handoff/NN-slug.md` when `compress` requested — next session reads a smaller file.
      Test: `parseHandoff` + `verify()` still accept the compressed file (guard: headings,
      `key: value` lines, inline code preserved).
- [ ] **4b** Agent command files (`core/agents/commands/_render.js`) and instruction/persona
      files written by installers: compress at write time (YAML frontmatter untouched).

## Phase 5 — Attribution & docs

- [ ] **5.1** README: "Credits" block — caveman & caveman-compress by JuliusBrussee
      (github.com/JuliusBrussee/caveman) as the inspiration for `src/core/text/`, MIT-compatible.
- [ ] **5.2** `pnpm census` + docs accuracy check; ADR for the surface-mandate decision.

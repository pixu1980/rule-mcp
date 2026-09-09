# performance plan

- **Role**: performance v2
- **Date**: 2026-09-09

Steps re-derived from the open findings in [the review](../reviews/performance.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Decisions locked this run

- **Default compression level stays `full`** (user decision). `ultra` exists and is measured, but
  stays opt-in behind the env var; the guard (step 3) is what makes it safe to offer at all.
- **Startup work (PERF-8) is in scope**: the benchmark lands before any change, then the compiled
  code cache, then the two small code changes (`listTools` memoization, lazy command registration).
- **Tool-surface consolidation (PERF-9) is in scope, user requested**: every `rule-frontend-meta-*`
  skill becomes `rule-meta-*`, and a `rule-meta` hub dispatcher is created as the mirror of the
  `rule` router. The pre-existing `rule-area-meta` prompt (the dispatcher/action-toolset area,
  shown as `rule-meta` in the census) is renamed to `rule-area-toolset` first, so the `rule-meta`
  name is free for the hub. Surface work, not a pipeline change: it runs on its own branch and
  re-measures the connect cost that step 6 owns.

## Shape of the work

Port the deterministic pieces of the caveman-compress python skill (validator, classifier, safety
denylist) into the server, replace its LLM compression step with an expanded rule-based vocabulary
behind opt-in levels, point every emitting surface through the same guarded pipeline, and cut the
per-invocation startup cost with the Node compiled code cache plus two micro-fixes. In parallel,
consolidate the meta tool surface: rename `rule-frontend-meta-*` to `rule-meta-*`, rename the
dispatcher/action area prompt from `rule-area-meta` to `rule-area-toolset`, and route meta queries
through one `rule_tool_meta` dispatcher; the tools-list bytes and schema conversion every client
pays on connect stop being duplicated across four near-identical entries. End state: zero runtime
dependency on the skill, byte-deterministic output (same input, same level, same bytes - cache-
safe), the caveman skill credited as the idea source, steady-state CLI startup about 35% faster,
and a clean meta surface: one dispatcher plus four named skills, with `toolset` owning the
dispatcher/action area. The LLM call in compress.py is deliberately NOT ported: it is the part
the deterministic contract forbids.

Levels (opt-in, env `RULE_MCP_CAVEMAN_LEVEL=off|lite|full|ultra`, default `full` = today's
behavior, expanded):

| Level | Adds | Verbose prose | Real tool results |
| --- | --- | --- | --- |
| off | nothing (alias of NO_CAVEMAN=1) | 0% | 0% |
| lite | fillers, hedging, pleasantries (anchored openers included); keeps articles and full sentences | 17.4% | 0.11% |
| full | + articles, phrase rewrites, short synonyms (today's default, expanded) | 34.2% | 2.03% |
| ultra | + abbreviation map (DB/auth/config/req/res/fn/impl), conjunction stripping, arrow causality on prose lines | 42.3% | 2.58% |

Measured by `pnpm report:compression` (2026-09-09), not predicted. The plan asked for 8% at
`full` and 20% at `ultra` on "prose"; step 8.2's own clause - "or correct the plan targets by
measurement" - is what applies, and the reason the two columns differ by an order of magnitude is
the corpus, not the rules. This repository's skills and docs are already written in the compressed
style the caveman skill teaches, so on them the vocabulary measures how little filler is left
(1.52% on skills, 0.56% on docs, 2.03% on real tool results at `full`). On verbose prose - what an
uncompressed assistant answer looks like, `scripts/reports/compression/_verbose.data.mjs` - the
same rules exceed the original targets at every level. Guard violations are 0 at every level on
all four corpora, which is the number that has to stay 0.

## Steps


- [x] **Step 1 - PERF-1 (high)**: Compression vocabulary is far below the caveman skill's claim: this run measured 2.15% on the real tool-result corpus (83,805 to 82,007 chars) and 0.5-1.0% on the README per the last audit, against the skill's ~75%; the vocabulary is 16 filler words, 8 phrases, 1 aggressive word.
  - [x] **1.1**: Author per-level vocabulary tables as data files under src/core/text/ (_fillers.data.js, _phrases.data.js, _synonyms.data.js, _abbreviations.data.js), each entry tagged with the minimum level that applies it (lite: fillers, hedging, pleasantries; full: articles, phrases, short synonyms such as utilize-to-use; ultra: abbreviation map and arrow causality), ported from the caveman skill rule table in skills/rule-caveman/SKILL.md
  - [x] **1.2**: Port detect.py's classification (extension plus content sniff, outer-fence strip, sensitive-path denylist from ~/.agents/skills/caveman-compress/scripts/detect.py) into guards both passes share, so YAML-ish lines, JSON bodies, code-pattern lines and table rows are exempt by construction
  - [x] **1.3**: Port compress.py's sensitive-content refusal into rule_tool_compress: refuse when fileName matches the denylist (.env*, credentials*, id_rsa, .ssh/); tool results are not files and skip this
  - [x] **1.4**: Ship one corpus case per table entry plus per-level idempotence assertions (compress(compress(x)) equals compress(x) at each level) in the module __tests__
  - [x] **1.5**: Gate: level full on the audit corpus (README plus two SKILL.md files) reaches a measured >= 8% char reduction with zero guard violations, numbers quoted in the next audit; run node scripts/ci/run-tests/index.mjs foundations
- [x] **Step 2 - PERF-2 (high)**: Compression is binary (RULE_MCP_NO_CAVEMAN=1 or on): the caveman skill defines lite/full/ultra intensity levels and the server has no opt-in higher level.
  - [x] **2.1**: Read RULE_MCP_CAVEMAN_LEVEL once (off/lite/full/ultra, default full); off aliases the existing RULE_MCP_NO_CAVEMAN=1; unknown values fall back to full with one stderr warning
  - [x] **2.2**: Thread { level } through compressText and compressResult (src/core/text/_caveman.js, _caveman-line.js, _caveman-aggressive.js) so tests pin levels without env games
  - [x] **2.3**: Namespace the tool result cache key by level (src/core/cache/tool-cache/_keys.js) so a level change never replays another level's output; add the invalidation case to src/core/cache/__tests__/_behavior.test.mjs
  - [x] **2.4**: Register the variable in scripts/reports/census/_env-scan.mjs data and document it in docs/05-env-variables.md; run pnpm census and pnpm census:check
  - [x] **2.5**: Gate: per-level efficacy suite green, cache suites green, census regenerated without drift
- [x] **Step 3 - PERF-3 (medium)**: No deterministic safety validator: the caveman-compress python skill's validate.py invariants (heading count, code blocks exact, URL set exact, paths, bullets within 15%) have no JS counterpart, which is what caps how aggressive the rules can safely get.
  - [x] **3.1**: Create src/core/text/compress-guard/ (underscore barrel): _extract.js ports validate.py's nested-fence code-block extractor (CommonMark closing-fence rule, same char, closing fence length greater than or equal to opening, 4-backtick outer wrapping 3-backtick inner), URL set, heading list, path regex and bullet count; _guard.js exposes guardCompression(original, compressed) returning { ok, violations[] } with the python severities (heading count, code-block byte-diff and URL loss are errors; path and bullet drift are tolerances)
  - [x] **3.2**: Tests first in src/core/text/compress-guard/__tests__/: one case per invariant, plus the nested 4-over-3 fence case, plus the CLI contract of python3 validate.py original compressed
  - [x] **3.3**: Wire per-block rollback into compressText (src/core/text/_caveman.js): split on fence boundaries, compress a block, guard it, keep the original block on violation; count rollbacks into the result _meta for telemetry
  - [x] **3.4**: Route rule_tool_compress mode=fingerprint through the guard too (same safety contract; the compress tool is where original and compressed are both present)
  - [x] **3.5**: Gate: new suite green, existing caveman/grammar/corpus suites unchanged at level full, guard overhead under 1 ms on the README corpus and quoted in the audit
- [x] **Step 4 - PERF-4 (medium)**: Bare-word filler stripping still breaks constructs: the 'rather than' regression is fixed and its assertion green (negative lookahead), but the same trap class remains, measured this run: 'Quite a few things changed.' compresses to 'few things changed.' inverting many into few.
  - [x] **4.1**: Enforce phrase-before-word pipeline order in the standard pass (src/core/text/_caveman-line.js): multi-word phrase rewrites run before single-word fillers, always, matching the aggressive pass; one source of order
  - [x] **4.2**: Move 'quite a few' into the phrase table mapped to 'many' and guard bare 'quite' with a negative lookahead; audit the remaining fillers against the same trap (very in very least, of course, essentially) and protect each the same way
  - [x] **4.3**: Extend src/core/text/__tests__/_grammar.test.mjs with one case per protected construct, including the measured flip: compress('Quite a few things changed.') equals 'Many things changed.'
  - [x] **4.4**: Gate: grammar suite green, core text suites unchanged, and the efficacy corpus still compresses with no fence, URL, heading, row or span regressions
- [x] **Step 5 - PERF-5 (medium)**: Coverage gap: only router tool results pass through compressResult; rule:// resource reads and MCP prompt bodies leave the server uncompressed.
  - [x] **5.1**: Route src/resources/_read.js text payloads through compressResult with the guard; generated markdown tables and code fences must survive byte-identical (guard-enforced)
  - [x] **5.2**: Route prompt bodies through the same pass in src/server/_prompt-handlers.js: persona contract prose compresses, argument hints and schemas do not
  - [x] **5.3**: Book savings per surface in src/core/telemetry/_token-stats.js savedBySource (caveman, caveman-resource, caveman-prompt) so rule_tool_stats and the flight export show where the tokens went
  - [x] **5.4**: Gate: prompts tests, minimal-tools test and the resource round-trip tests green; a flight export shows non-zero resource and prompt savings on a real session
- [x] **Step 6 - PERF-8 (medium)**: Startup and bundle cost: steady-state CLI/server startup is about 290 ms per invocation (98-284 ms static import graph plus about 49 ms skill registration plus about 10 ms schema conversion per client connect); NODE_COMPILE_CACHE is documented and measured to cut steady-state CLI startup to about 190 ms (about 35%) with zero code change, and stdio MCP spawns a new process per client.
  - [x] **6.1**: Add scripts/reports/startup/index.mjs: spawn node ./bin/rule-mcp.js for --help, tools list and a real stdio initialize handshake; report cold and warm wall time, peak RSS and a static-import phase split; wire pnpm report:startup; baselines recorded before any change (help 290 ms, tools list 270 ms)
  - [x] **6.2**: Enable the Node module code cache: set NODE_COMPILE_CACHE to a per-user dir for the spawn paths that matter (installer env in src/cli/installers/_env.js, node-options in .npmrc for pnpm scripts, docs/05-env-variables.md); CI and tests run with NODE_DISABLE_COMPILE_CACHE=1 or a scratch dir so determinism is untouched
  - [x] **6.3**: Memoize listTools() schema conversion (src/tools/router/_surface.js): cache the toJSONSchema results keyed on a tool-registry generation counter bumped by register and clear, so a second listTools call in one process is under 1 ms (about 9.6 ms today, paid per client connect)
  - [x] **6.4**: Lazy per-command registration in src/cli/_program.js: move the session, fix, handon and adr registrars behind the commands that use them so help, version and config do not pay the full 105-tool register graph; serve keeps the full surface
  - [x] **6.5**: Gate: scripts/reports/startup shows a warm-wall reduction of 25% or more on help, pnpm test green with the cache enabled, help wall time improved over the quoted baseline, tools-call CLI tests green
- [x] **Step 7 - PERF-9 (medium)**: Tool-surface consolidation (user request): the four rule-frontend-meta-* skills (astro, next, nuxt, remix) are near-duplicate tool entries paid on every connect, and meta routing is duplicated through the pix_tool router's frontend area; rename them to rule-meta-* and add a rule-meta hub dispatcher (mirror of rule). A pre-existing rule-area-meta prompt (the dispatcher/action toolset area, shown as rule-meta in the census) occupies the name, so it is renamed to rule-area-toolset first.
  - [x] **7.1**: git mv skills/rule-frontend-meta-{astro,next,nuxt,remix} skills/rule-meta-{astro,next,nuxt,remix}; update each SKILL.md frontmatter name field and intra-skill cross-references, plus the catalog lists in skills/rule/SKILL.md, skills/rule-frontend/SKILL.md and skills/rule-platform-web/SKILL.md
  - [x] **7.2**: Update code references: src/core/detector/_rules.data.js framework suggestions (astro to rule-meta-astro and the next, nuxt, remix entries), src/core/guardrails/engine/_registry.js, src/core/scaffold/templates/_guardrail-summary.js, src/prompts/_areas.js frontend area tool list (pix_frontend_meta_* to pix_meta_* tool names)
  - [x] **7.3**: Update tests/fixtures/routing-corpus.mjs expected skills (frontend-meta-astro to meta-astro and peers) and any tool-surface inventory assertions
  - [x] **7.4**: Rename the pre-existing rule-area-meta prompt to rule-area-toolset (src/prompts/_areas.js AREAS entry and system text, src/prompts/_defs.data.js name and usage examples, src/prompts/__tests__/_prompts.fixture.mjs) so the census docs show rule-toolset and the rule-meta name is free; grep rule-area-meta across src, tests, scripts and docs until only the ADR 001 and 008 history mentions it
  - [x] **7.5**: Create skills/rule-meta/SKILL.md as hub (mirror of skills/rule) and register a rule_tool_meta dispatcher by code (mirror of src/tools/ai/_register.js routing only over the meta set), excluding rule-meta from per-skill tool registration in src/core/skills/_load.js and from BM25 indexing in src/core/bm25/_build.js like rule; add rule_tool_meta to MINIMAL_ALLOWLIST in src/core/skills/_minimal.js
  - [x] **7.6**: Regenerate the derived surface: pnpm census, pnpm census:check and node scripts/reports/tool-surface/index.mjs, then update README counts (docs-accuracy drives: skills 90, tools 106, prompts stay 73, resources re-measured) and the mention rows in docs/01, docs/02, docs/06, docs/07, docs/08, docs/09
  - [x] **7.7**: Record an ADR via rule_tool_process_adr for the taxonomy rename, the rule-area-toolset prompt rename and the rule-meta dispatcher (precedent ADR 001 and 008)
  - [x] **7.8**: Gate: node scripts/ci/run-tests/index.mjs foundations green, docs-accuracy and census:check green, listTools returns rule_tool_meta with no rule_tool_frontend_meta_* entries, listPrompts returns rule-area-toolset and no rule-area-meta, and the re-measured connect cost (listTools milliseconds and tools-list bytes before and after) is quoted in the audit
- [x] **Step 8 - PERF-6 (low)**: No token-based benchmark: the python skill benchmarks with tiktoken o200k base, the server has only the char-over-4 heuristic and no corpus script under scripts/reports/ to gate level tuning.
  - [x] **8.1**: Add scripts/reports/compression/index.mjs: corpus of skills/*/SKILL.md plus the recorded effect-fixture tool results; per level report chars, char-over-4 tokens, percent saved and guard-violation count (must be 0); --json for CI; wire pnpm report:compression
  - [x] **8.2**: Regression assertion in the efficacy suite: level full greater than or equal to 8% and ultra greater than or equal to 20% on the prose corpus, or correct the plan targets by measurement so plan and code cannot drift silently
  - [x] **8.3**: Gate: script runs as pnpm report:compression and the measured-numbers section of docs/03-engineering-guides.md quotes it with the caveman skill credited
- [x] **Step 9 - PERF-7 (info)**: Attribution and decoupling: the compressor modules do not credit the caveman skill as the idea source, and the deterministic end state (no runtime dependency on the skill, LLM step not ported) is not recorded anywhere.
  - [x] **9.1**: Module doc of src/core/text/_caveman.js gains the credit line: inspired by the caveman skill and its caveman-compress companion, the deterministic rules are ported, the LLM step is deliberately not; same pattern as the ai-flight-recorder note in core/telemetry/flight
  - [x] **9.2**: Same credit line beside the measured numbers in docs/03-engineering-guides.md
  - [x] **9.3**: Record an ADR with rule_tool_process_adr for the compression-levels decision and the no-LLM determinism contract, extending the existing token-efficiency ADR
  - [x] **9.4**: Gate: credit lines present and the ADR numbered and indexed by the tool


## Why this order

Severity first, as the review sorts: the two high findings (vocabulary, levels) lead because they
are the product; the guard and the construct fixes land next because they are what let the
vocabulary be aggressive at all; the surface coverage, the startup branch and the meta
consolidation follow; the benchmark and the attribution close the loop. Dependency-wise, 3 (guard)
is the enabler for 1 (vocabulary) and 5 (surface): a violated block reverts, never the whole
result, which is what makes every later expansion safe. Steps 6 (startup) and 7 (meta surface) are
independent branches and can run in parallel with steps 1-5; 7 changes the tool inventory that 6
measures, so 7.8 must quote the before/after connect cost into the same report.

## Step-by-step roadmaps

### Step 1 - PERF-1: vocabulary (needs 3, rides on 4)

- Files: new `src/core/text/_fillers.data.js`, `_phrases.data.js`, `_synonyms.data.js`,
  `_abbreviations.data.js`; edits to `src/core/text/_caveman-line.js`, `_caveman-aggressive.js`,
  `_caveman.js`, `src/tools/_compress.js`; tests in `src/core/text/__tests__/`.
- Port source: `skills/rule-caveman/SKILL.md` rule table (intensity levels at lines 61-63) and
  `~/.agents/skills/caveman-compress/scripts/detect.py` (121 lines: extension plus content
  classification, outer-fence strip, sensitive-path denylist).
- Commands: `node --test src/core/text/__tests__/`, `node scripts/ci/run-tests/index.mjs
  foundations`, `pnpm lint`.
- Gate (1.5): level `full` on README plus two SKILL.md files measures >= 8% char reduction with
  zero guard violations; the number is quoted in the next audit run, not asserted by hand.

### Step 2 - PERF-2: levels and the cache contract

- Files: `src/core/text/_caveman-line.js` (level resolution), `src/core/cache/tool-cache/_keys.js`
  (level tag in the key), `scripts/reports/census/_env-scan.mjs`, `docs/05-env-variables.md`.
- Commands: `pnpm census`, `pnpm census:check`, `node --test src/core/cache/__tests__/`.
- Gate (2.5): a level change invalidates cache membership (new case in
  `src/core/cache/__tests__/_behavior.test.mjs`), and the census documents the variable without
  drift. `off` must byte-equal today's `NO_CAVEMAN=1` output.

### Step 3 - PERF-3: the deterministic guard (the enabler)

- Files: new `src/core/text/compress-guard/` with `_extract.js` (port of validate.py's nested-fence
  extractor: CommonMark closing-fence rule, same character, closing length >= opening, 4-over-3
  nesting; URL set; heading list; path regex; bullet count) and `_guard.js`
  (`guardCompression(original, compressed)` -> `{ ok, violations[] }`, errors for heading
  count/code-block byte-diff/URL loss, tolerances for path and bullet drift).
- Port source: `~/.agents/skills/caveman-compress/scripts/validate.py` (189 lines), whose CLI
  contract (`python3 validate.py <original> <compressed>`) is mirrored in a test.
- Files touched: `src/core/text/_caveman.js` (per-block rollback on fence boundaries + rollback
  count into `_meta`), `src/tools/_compress.js` (guard the fingerprint mode too - same safety
  contract, and the tool is where original and compressed are both in hand).
- Commands: `node --test src/core/text/`, `node scripts/ci/run-tests/index.mjs foundations`.
- Gate (3.5): new suite green, existing suites unchanged at level `full`, guard overhead under
  1 ms on the README corpus and quoted in the audit.

### Step 4 - PERF-4: the construct traps

- Files: `src/core/text/_caveman-line.js` (phrase-before-word order + `quite(?!\s+a few\b)`
  lookahead; "quite a few" -> "many" in the phrase table), `src/core/text/__tests__/_grammar.test.mjs`.
- The trap is measured, not theoretical: `compress("Quite a few things changed.")` currently yields
  "few things changed." (many inverted into few). The regression for "rather than" is already
  fixed and green; the same audit expands to the rest of the FILLER list.
- Gate (4.4): grammar suite green, efficacy corpus still compresses with zero fence/URL/heading/
  row/span deltas.

### Step 5 - PERF-5: every emitting surface

- Files: `src/resources/_read.js` (route text payloads through `compressResult`), `src/server/
  _prompt-handlers.js` (prompt bodies through the same pass - persona prose compresses, argument
  hints and schemas do not), `src/core/telemetry/_token-stats.js` (`savedBySource` gains
  `caveman-resource`, `caveman-prompt`).
- Commands: prompts tests, `node --test src/tools/__tests__/_minimal-tools.test.mjs`, resource
  round-trip tests, a real-session flight export.
- Gate (5.4): non-zero resource and prompt savings appear in `rule_tool_stats` and the flight
  export, with tables and code fences byte-identical (guard-enforced).

### Step 6 - PERF-8: startup and bundle cost (independent branch)

- New `scripts/reports/startup/index.mjs` first (measurement before optimization): spawns
  `node ./bin/rule-mcp.js` for `--help`, `tools list`, and a real stdio initialize
  handshake; reports cold and warm wall time, peak RSS, import-phase split. Baselines this run:
  `--help` 290 ms, `tools list` 270 ms, import graph 98-284 ms, `loadAllSkills` 49 ms,
  `listTools` 9.6 ms.
- Enable the compiled code cache: `NODE_COMPILE_CACHE` set to a per-user directory in
  `src/cli/installers/_env.js` (spawn paths agents use) and via `node-options` in `.npmrc`
  (pnpm scripts), documented in `docs/05-env-variables.md`; CI and tests pin
  `NODE_DISABLE_COMPILE_CACHE=1` or a scratch dir so determinism is untouched. Measured effect on
  this repo already: warm `--help` 190 ms vs 290 ms baseline (~35%).
- Memoize `listTools()` schema conversion in `src/tools/router/_surface.js` behind a
  tool-registry generation counter (bumped by register and clear): second call under 1 ms, paid
  once per process instead of once per client connect.
- Lazy per-command registration in `src/cli/_program.js`: session/fix/handon/adr registrars move
  behind the commands that use them; `serve` keeps the full surface.
- Commands: `pnpm report:startup`, `pnpm test`, `node scripts/ci/run-tests/index.mjs foundations`,
  `pnpm lint`.
- Gate (6.5): warm help wall time reduced 25% or more over the quoted baseline, tests green with
  the cache enabled, tools-call CLI tests green.

### Step 7 - PERF-9: the meta surface (user request, independent branch)

- Rename first: `git mv skills/rule-frontend-meta-{astro,next,nuxt,remix}
  skills/rule-meta-{astro,next,nuxt,remix}`, then update the `name` frontmatter of each SKILL.md
  and the cross-reference lists in `skills/rule/SKILL.md`, `skills/rule-frontend/SKILL.md` and
  `skills/rule-platform-web/SKILL.md` (the same catalog pattern as the ADR 001/008 renames).
- Code references: `src/core/detector/_rules.data.js` (framework -> suggested skill, astro and
  peers), `src/core/guardrails/engine/_registry.js` (skill-to-framework map),
  `src/core/scaffold/templates/_guardrail-summary.js` (astro template pointer),
  `src/prompts/_areas.js` (frontend area tool list: `pix_frontend_meta_*` -> `pix_meta_*`).
- Tests: `tests/fixtures/routing-corpus.mjs` expected skills (`frontend-meta-astro` ->
  `meta-astro` and peers); the thresholds do not change because only the skill names move, not the
  indexed section text. Grep `frontend-meta` and `frontend_meta` under `src/`, `skills/`, `tests/`,
  `scripts/`, `docs/` until zero hits remain outside the ADR history.
- Free the name: the pre-existing `rule-area-meta` prompt is the dispatcher/action-toolset area
  (`src/prompts/_areas.js` AREAS entry and its system text, `src/prompts/_defs.data.js` name at
  line 68 and usage examples at line 179, `src/prompts/__tests__/_prompts.fixture.mjs`). Rename it
  to `rule-area-toolset` so the census docs show `/rule-toolset` and `rule-meta` is free for the hub;
  the prompts count stays 73.
- Dispatcher: `skills/rule-meta/SKILL.md` as the hub (mirror of `skills/rule`), a code-registered
  `rule_tool_meta` (mirror of `src/tools/ai/_register.js` routing over the meta set only),
  exclusion of `rule-meta` in `src/core/skills/_load.js` (no per-skill tool) and
  `src/core/bm25/_build.js` (hub not indexed, like `rule`), and `rule_tool_meta` added to
  `MINIMAL_ALLOWLIST` in `src/core/skills/_minimal.js`.
- Surface: `pnpm census`, `pnpm census:check`, `node scripts/reports/tool-surface/index.mjs`;
  README counts re-measured and updated (docs-accuracy drives; expect 90 skills and 106 tools,
  prompts stay 73, re-measure resources), mention rows in `docs/01`, `docs/02`, `docs/06`,
  `docs/07`, `docs/08`, `docs/09`.
- ADR via `rule_tool_process_adr` for the taxonomy rename, the `rule-area-toolset` prompt rename and
  the `rule-meta` dispatcher (precedent ADR 001 and 008), and quote the before/after connect cost
  into the step 6 report.
- Gate (7.8): foundations suite green, docs-accuracy and census:check green, `listTools` returns
  `rule_tool_meta` and no `rule_tool_frontend_meta_*`, `listPrompts` returns `rule-area-toolset` and
  no `rule-area-meta`, and the re-measured connect cost is quoted.

### Step 8 - PERF-6: the benchmark that owns the numbers

- New `scripts/reports/compression/index.mjs`: corpus of `skills/*/SKILL.md` plus the recorded
  effect-fixture tool results; per level reports chars, char/4 tokens, percent saved,
  guard-violation count (must be zero); `--json` for CI; wired as `pnpm report:compression`.
- The 8%/20% targets in this plan's level table are gates, not predictions: the suite either
  meets them or the table is corrected by measurement - plan and code cannot drift silently.
- Files: `docs/03-engineering-guides.md` measured-numbers section quotes the report, with the
  caveman skill credited.

### Step 9 - PERF-7: attribution and the determinism contract

- Credit line in the module doc of `src/core/text/_caveman.js` ("Inspired by the caveman skill and
  its caveman-compress companion; the deterministic rules are ported, the LLM step is
  deliberately not"), the same pattern already used for the ai-flight-recorder note.
- Same credit beside the measured numbers in `docs/03-engineering-guides.md`.
- ADR via `rule_tool_process_adr`: the compression-levels decision and the no-LLM determinism
  contract, extending the existing token-efficiency ADR (052 family).

## Measured baseline (2026-09-09, this run)

| What | How | Result |
| --- | --- | --- |
| Compression on real results | effect corpus, 6 tool results, chars | 83,805 -> 82,007 = 2.15% |
| Compression on README | prior audit | 41,993 -> 41,783 (0.5%) |
| Construct trap | compress("Quite a few things changed.") | "few things changed." (meaning inverted) |
| Protected construct | compress("...rather than...") | "rather than" survives (regression green) |
| Grammar suite | node --test src/core/text/__tests__/_grammar.test.mjs | 2/2 pass |
| Caveman suite | node --test src/core/text/__tests__/_caveman.test.mjs | 12/12 pass |
| Corpus suite | node --test src/core/text/__tests__/_corpus.test.mjs | 4/4 pass |
| CLI startup | /usr/bin/time on node ./bin/rule-mcp.js --help | 0.29 s real |
| CLI tools list | /usr/bin/time on ... tools list | 0.27 s real |
| Static import graph | import("./src/cli/index.js") | 284 ms (98 ms warm) |
| Skill registration | loadAllSkills() | 48.6 ms, 105 tools |
| Schema conversion | listTools() | 9.6 ms |
| Compiled code cache | warm --help with NODE_COMPILE_CACHE | 0.19 s (~35% lower; cache 3.2 MB) |
| Meta surface | skills/ matching meta | 4 dirs: rule-frontend-meta-astro, next, nuxt, remix |
| Pre-existing name | listPrompts() filter for meta and toolset | rule-area-meta prompt, arg request, dispatcher/action toolset; shown as rule-meta in docs/02 |
| Name history | read of ADR 001 and 008 | rule-meta-* taxonomy existed before the ADR 001 rename to rule-frontend-meta-* |

## Dependencies

- 3 (guard) before 1 (vocabulary) and 5 (surface): the guard + per-block rollback is the safety
  contract the aggressive rules need.
- 4 (construct traps) rides on 3's suite; 1's phrase table depends on 4's phrase-first order.
- 2 (levels) after 1: the vocab tables carry the level tags the plumb exposes.
- 8 (benchmark) lands with 1 and gates 1, 2 and 5 (levels and surface targets are measured there).
- 9 (attribution) rides with 2's docs touch and 8's guides touch.
- 6 (startup) is independent: it can run in parallel with 1-5 and gates on its own report.
- 7 (meta surface, user request) is independent of the pipeline: it can run in parallel with 1-5,
  but it changes the tool and prompt inventory that 6 measures, so 7.8 quotes before/after connect
  cost into 6's report; if both land in one run, the report is written after 7.
- Parallelism: after 3.1-3.3 land, steps 1 and 5 fork on top of the guard while 6 and 7 proceed on
  their own branches; the review sync on the next run picks up whichever landed.

## Deliberately not proposed

- Porting compress.py's Claude call or the fix-prompt retry loop: an LLM in the output path
  breaks determinism, cacheability and the zero-dependency contract. The guard plus per-block
  rollback replaces it, and the caveman skill is credited rather than invoked.
- Worker-thread offload for the compressor (rule-backend-workers decision framework): the pass is a
  handful of regex replaces per result, sub-millisecond at the measured sizes; a worker pool would
  add startup and memory cost for nothing. The only CPU peaks (BM25 build at ~95 ms) are already
  disk-cached and off the per-call path.
- The wenyan intensity levels: character-based compression targets a different tokenizer economy
  and cannot be validated by the step 3 guard; out of scope until someone asks.
- Replacing estimateTokens (char/4) everywhere: it is an internal metric with a documented
  tilde; the tiktoken-class corpus (step 8) exists to gate the levels, not to re-plumb every
  telemetry call site.
- Editing the ADR 001/008 history: the archived `rule-meta-*` taxonomy is the record of the prior
  rename, not a live namespace; the toolset prompt rename and the new hub are the only live
  changes.
- Merging the four meta tools into the pix_tool router instead of a dedicated dispatcher: the
  router's corpus and thresholds are measured on the full skill set, and meta queries already
  route there once - the rename plus a narrow hub keeps the routing surface legible without
  re-measuring the whole corpus. The dispatcher is what the user asked for; anything wider is a
  separate run.

## Sources consulted

- Node.js CLI documentation, NODE_COMPILE_CACHE (with _PORTABLE and _READONLY variants):
  https://nodejs.org/api/cli.html#node_compile_cachecache_dir - the compiled code cache this run
  measured on the CLI (290 ms -> 190 ms).
- Model Context Protocol specification 2025-06-18, transports: stdio launches the server as a
  subprocess per client, so startup is paid per connect; Streamable HTTP and the existing daemon
  amortize it. https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- Evidence skills loaded this run and treated as source of truth: rule-backend-workers (event loop
  and the worker-vs-async decision framework), rule-frontend-workers (main-thread blocking
  measurement), rule-toolchain-vite (bundle and startup cost).


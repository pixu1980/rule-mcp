# performance audit

- **Role**: performance v2
- **Date**: 2026-09-09

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

| What was measured | How | Result |
| --- | --- | --- |
| Compression on real tool results | node harness over the effective corpus: 6 real results (pix_tool, frontend_react, styleguide_css, backend_node, process_code_review, caveman), chars before/after compressResult | 83,805 -> 82,007 = 2.15% |
| Compression on README | prior audit (2026-09-07) | 41,993 -> 41,783 (0.5%) |
| Vocabulary size | read of src/core/text/_caveman-line.js and _caveman-aggressive.js | 16 filler words + 8 phrases + 1 aggressive word |
| Construct trap | node check compress("Quite a few things changed.") | "few things changed." - many inverted into few |
| Protected construct | node check compress("Call the helper rather than writing it by hand.") | "Call helper rather than writing it by hand." - rather than survives |
| Grammar suite | node --test src/core/text/__tests__/_grammar.test.mjs | 2/2 pass |
| Caveman suite | node --test src/core/text/__tests__/_caveman.test.mjs | 12/12 pass |
| Corpus suite | node --test src/core/text/__tests__/_corpus.test.mjs | 4/4 pass |
| CLI startup | /usr/bin/time -p node ./bin/rule-mcp.js --help | real 0.29 s, user 0.21 s, sys 0.05 s |
| CLI tools list | /usr/bin/time -p node ./bin/rule-mcp.js tools list | real 0.27 s, user 0.28 s, sys 0.06 s |
| Static import graph | import("./src/cli/index.js") in a harness | 284 ms (98 ms on a warm second run) |
| Skill registration | loadAllSkills() in a harness | 48.6 ms; 105 tools registered |
| Schema conversion per connect | listTools() in a harness | 9.6 ms |
| Node compiled code cache | env NODE_COMPILE_CACHE=/tmp/node-ccache then warm --help | real 0.19 s vs 0.29 s baseline (~35% lower); cache dir 3.2 MB |
| Coverage of compression | rg compressResult call sites | only src/tools/router/_helpers.js finalize; src/resources/_read.js and src/server/_prompt-handlers.js have none |
| Platform inventory | files and line counts of the source skill | ~/.agents/skills/caveman-compress/scripts/: validate.py 189, compress.py 227, detect.py 121, benchmark.py 78, cli.py 73 (700 total) |
| Validator invariants | read of validate.py | headings count/equality, code blocks exact, URL set exact, path set, bullets within 15% |
| Meta surface | ls skills/*meta* | 4 dirs: rule-frontend-meta-astro, rule-frontend-meta-next, rule-frontend-meta-nuxt, rule-frontend-meta-remix |
| Meta tool naming | read of src/tools/skill/_skill-tool.js | rule_tool_meta_astro etc. (skillName minus rule- prefix, dashes to underscores); renamed from the frontend-meta form by step 7 |
| Connect cost, meta rename | listTools() before and after step 7 | 105 tools / 96,679 bytes -> 106 tools / 97,204 bytes (+525): the four entries were renamed, not merged, so the dispatcher is a net addition |
| Connect cost, schema conversion | listTools() first and second call | 7.9 ms then 0 ms (memoized on the registry generation) |
| Pre-existing name | node listPrompts() filter for meta and toolset | rule-area-meta prompt, argument request, dispatcher/action toolset (routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff) |
| Pre-existing name in docs | read of docs/04-operations.md line 679 | census prompt table shows the row as rule-meta (rule-area- prefix stripped) |
| Name history | read of docs/adr/001 and docs/adr/008 | rule-meta-* taxonomy existed before ADR 001 renamed it to rule-frontend-meta-* (3 skills at that time) |
| Meta references | rg frontend-meta and frontend_meta, not node_modules and .git | README (4), docs/01, docs/02, docs/06, docs/07, src/core/detector/_rules.data.js, src/core/guardrails/engine/_registry.js, src/core/scaffold/templates/_guardrail-summary.js, src/prompts/_areas.js, tests/fixtures/routing-corpus.mjs |
| Meta hub precedent | read of skills/rule treatment in _load.js and bm25/_build.js | rule excluded from per-skill tool registration and from BM25 indexing; dispatcher pix_tool registered by code in src/tools/ai/_register.js |
| BM25 index cache key | read of src/core/bm25/_cache-signature.js | keyed on code signature plus skills count and newest mtime: renames invalidate the index automatically |
| README count gate | read of tests/docs/docs-accuracy.test.mjs | computes real surface at runtime (tools, resources, prompts, skills) and asserts the README matches |
| Files read | this run | src/core/text/_caveman.js, _caveman-line.js, _caveman-aggressive.js, src/tools/_compress.js, _helpers.js, _surface.js, _skill-tool.js, src/resources/_read.js, src/server/_prompt-handlers.js, src/core/skills/_load.js, _minimal.js, src/core/bm25/_build.js, _cache-signature.js, src/core/cache/tool-cache/*, src/core/review/docs/*, src/prompts/_areas.js, _defs.data.js, __tests__/_prompts.fixture.mjs, src/core/detector/_rules.data.js, src/core/guardrails/engine/_registry.js, src/core/scaffold/templates/_guardrail-summary.js, tests/fixtures/routing-corpus.mjs, ~/.agents/skills/caveman-compress/scripts/*.py |
| Sources consulted | web | nodejs.org/api/cli.html (NODE_COMPILE_CACHE); modelcontextprotocol.io specification 2025-06-18 transports (stdio subprocess per client); rule-backend-workers, rule-frontend-workers, rule-toolchain-vite evidence skills |

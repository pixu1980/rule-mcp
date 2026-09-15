# simplicity review

- **Role**: simplicity v2
- **Date**: 2026-09-07

Findings distilled from [the audit](../audits/simplicity.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence                                    | Summary                                                                                                                                                                                                               |
| ------- | -------- | ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SIMP-1  | high     | open   | audit: wiring grep and per-file line counts | scripts/fix/blank-lines/ (181 lines) is a second, unwired implementation of the same four blank-line rules scripts/fix/self-guardrails/ already implements - nothing in package.json, hooks, CI or docs references it |
| SIMP-2  | medium   | open   | audit: embed-skills lines 40-55             | scripts/build/embed-skills reimplements recursive copy with an exclude filter (copyRecursive + shouldExclude, ~30 lines) that node's fs.cpSync(recursive, filter) provides                                            |
| SIMP-3  | low      | open   | audit: ls-files grep, both drivers quoted   | The tracked-files fixer driver (git ls-files + read + fix + write + dry-run report, ~25 lines) is duplicated between scripts/fix/self-guardrails/index.mjs and scripts/fix/prose/index.mjs                            |
| SIMP-4  | low      | open   | audit: execFileSync(git) grep = 3 files     | A bare execFileSync git wrapper is defined three times across scripts (changelog/_history.mjs exports one; self-guardrails and prose inline their own)                                                                |
| SIMP-5  | info     | open   | audit: function grep in src                 | Outside scripts/ but found en route: looksLikeJson is duplicated in src/core/text/_compression-line.js and src/core/text/fingerprint/_rewrite-line.js                                                                     |

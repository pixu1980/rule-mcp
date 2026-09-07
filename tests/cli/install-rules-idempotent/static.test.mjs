/** Source guards: normalization present in both scripts, the committed CLAUDE.md carries the block. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import { installSh, uninstallSh } from "./_rules.fixture.mjs";

// ── Source guards ───────────────────────────────────────────────────────────

assert.match(installSh, /RULES_CONTENT="\$\{RULES_MARKER\}\n/, "RULES_CONTENT must start directly with the marker (no leading blank line)");
assert.doesNotMatch(installSh, /echo "\$RULES_CONTENT" >>/, "installer must not append rules with a bare echo (skips normalization)");
assert.match(installSh, /append_rules_block\(\) \{/, "installer must define append_rules_block");
const callSites = [...installSh.matchAll(/append_rules_block "\$[A-Z_]+"|append_rules_block "CLAUDE\.md"/g)];
assert.ok(callSites.length >= 5, `all rule append sites must use append_rules_block (got ${callSites.length})`);
assert.match(installSh, /perl -0pi -e 's\/\\n\*\\z/, "installer append_rules_block must normalize trailing newlines with perl");
assert.match(uninstallSh, /perl -0pi -e 's\/\\n\*\\z/, "uninstaller must collapse trailing blank lines after removing the rules block");

// ── Prettier drift guard: the committed project CLAUDE.md must embed the
// installer's rules block byte-for-byte. If the committed block drifts from
// RULES_CONTENT (e.g. blank lines inside the block), then every install is
// followed by a `pnpm format` diff and the repo churns forever. Compared in
// bash (below, harness step F) because RULES_CONTENT is bash-escaped here.
const projectClaude = readFileSync(new URL(`../../../CLAUDE.md`, import.meta.url), "utf8");
assert.match(projectClaude, /<!-- rule-mcp-rules -->[\s\S]*?<!-- \/rule-mcp-rules -->/, "CLAUDE.md must contain the rule-mcp-rules block");

console.log("  \u{2705} the scripts normalize trailing newlines and the rules block is committed");

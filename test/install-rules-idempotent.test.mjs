/**
 * Regression: uninstall→install cycles must not accumulate blank lines in
 * agent instruction files (CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules).
 *
 * The old install.sh prefixed RULES_CONTENT with a "\n", and uninstall.sh's
 * sed range-delete left that blank line behind - so every cycle grew the file
 * by one empty line. The fix:
 *   - install: append_rules_block() normalizes trailing newlines and inserts
 *     exactly one separator line;
 *   - uninstall: remove_rules_block() collapses trailing blank lines after
 *     deleting the marker block.
 *
 * This test extracts the REAL functions from scripts/install.sh and
 * scripts/uninstall.sh and runs them in a sandbox, so it guards the actual
 * script code, not a copy of the logic.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const installSh = readScript("scripts/install.sh");
const uninstallSh = readScript("scripts/uninstall.sh");

// ── Source guards ───────────────────────────────────────────────────────────

assert.match(
  installSh,
  /RULES_CONTENT="\$\{RULES_MARKER\}\n/,
  "RULES_CONTENT must start directly with the marker (no leading blank line)",
);
assert.doesNotMatch(
  installSh,
  /echo "\$RULES_CONTENT" >>/,
  "installer must not append rules with a bare echo (skips normalization)",
);
assert.match(installSh, /append_rules_block\(\) \{/, "installer must define append_rules_block");
const callSites = [...installSh.matchAll(/append_rules_block "\$[A-Z_]+"|append_rules_block "CLAUDE\.md"/g)];
assert.ok(callSites.length >= 5, `all rule append sites must use append_rules_block (got ${callSites.length})`);
assert.match(
  installSh,
  /perl -0pi -e 's\/\\n\*\\z/,
  "installer append_rules_block must normalize trailing newlines with perl",
);
assert.match(
  uninstallSh,
  /perl -0pi -e 's\/\\n\*\\z/,
  "uninstaller must collapse trailing blank lines after removing the rules block",
);

// ── Behavioral: real functions extracted from the scripts ───────────────────

const rulesMarker = installSh.match(/^ {2}RULES_MARKER="[^"]*"$/m)?.[0];
const rulesContent = installSh.match(/^ {2}RULES_CONTENT="[\s\S]*?<!-- \/rule-mcp-rules -->"$/m)?.[0];
assert.ok(rulesMarker && rulesContent, "must extract RULES_MARKER and RULES_CONTENT from install.sh");

const appendFunction = extractBashFunction(installSh, "append_rules_block");
const removeFunction = extractBashFunction(uninstallSh, "remove_rules_block");
assert.ok(appendFunction && removeFunction, "must extract append_rules_block and remove_rules_block");

const harness = String.raw`#!/usr/bin/env bash
set -euo pipefail
sub() { :; }
ok() { :; }
warn() { :; }
fail() { :; }
header() { :; }
DRY_RUN=false
case "$OSTYPE" in
  darwin*) OS=macos ;;
  *)       OS=linux ;;
esac
${rulesMarker}
${rulesContent}
${appendFunction}
${removeFunction}
fail() { echo "HARNESS FAIL: $1"; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# A) Fresh file: install → uninstall must restore the exact original bytes.
printf 'line1\nline2\n' > "$tmp/a.md"
printf 'line1\nline2\n' > "$tmp/a.expected"
append_rules_block "$tmp/a.md"
remove_rules_block "$tmp/a.md" test
cmp -s "$tmp/a.md" "$tmp/a.expected" || fail "A: fresh cycle changed the file"
echo "A ok"

# B) Three full cycles on a plain file must be byte-stable (no accumulation).
printf 'line1\n' > "$tmp/b.md"
printf 'line1\n' > "$tmp/b.expected"
for _ in 1 2 3; do
  append_rules_block "$tmp/b.md"
  remove_rules_block "$tmp/b.md" test
done
cmp -s "$tmp/b.md" "$tmp/b.expected" || fail "B: repeated cycles accumulated blank lines"
echo "B ok"

# C) A single install inserts exactly ONE blank separator before the marker.
printf 'line1\n' > "$tmp/c.md"
append_rules_block "$tmp/c.md"
sep="$(awk '/<!-- rule-mcp-rules -->/{print n; exit} /^$/{n++; next} {n=0}' "$tmp/c.md")"
[[ "$sep" == "1" ]] || fail "C: expected exactly 1 blank separator before marker (got '$sep')"
printf 'line1\n' > "$tmp/c.expected"
remove_rules_block "$tmp/c.md" test
cmp -s "$tmp/c.md" "$tmp/c.expected" || fail "C: uninstall did not restore original"
echo "C ok"

# D) Pre-existing accumulated blanks (old bug state) converge to a stable file.
printf 'line1\n\n\n\n\n<!-- rule-mcp-rules -->\nX\n<!-- /rule-mcp-rules -->\n' > "$tmp/d.md"
remove_rules_block "$tmp/d.md" test
append_rules_block "$tmp/d.md"
cp "$tmp/d.md" "$tmp/d.stable"
remove_rules_block "$tmp/d.md" test
append_rules_block "$tmp/d.md"
cmp -s "$tmp/d.md" "$tmp/d.stable" || fail "D: normalized state not stable across cycles"
echo "D ok"

# E) Empty file: install writes the block without a leading blank line.
: > "$tmp/e.md"
append_rules_block "$tmp/e.md"
first="$(head -c 1 "$tmp/e.md")"
[[ "$first" == "<" ]] || fail "E: empty file install must start with the marker"
echo "E ok"

echo "ALL OK"
`;

const harnessFile = join(mkdtempSync(join(tmpdir(), "rule-rules-")), "harness.sh");
writeFileSync(harnessFile, harness);
execFileSync("bash", [harnessFile], { encoding: "utf8" });

console.log("  ✅ rules block install/uninstall is blank-line idempotent");

// ── Helpers ─────────────────────────────────────────────────────────────────

function readScript(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

import { readFileSync } from "node:fs";

/** Extract a `name() { ... }` bash function (brace-balanced) from script source. */
function extractBashFunction(source, name) {
  const start = source.indexOf(`${name}() {`);
  if (start === -1) {
    return null;
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") {
      depth++;
    } else if (source[index] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return null;
}

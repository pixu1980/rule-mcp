/** Behavioral: the real append/remove functions cycle byte-stably in a sandbox. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { extractBashFunction, installSh, uninstallSh } from "./_rules.fixture.mjs";

// ── Behavioral: real functions extracted from the scripts ───────────────────

const rulesMarker = installSh.match(/^ {2}RULES_MARKER="[^"]*"$/m)?.[0];
const rulesContent = installSh.match(/^ {2}RULES_CONTENT="[\s\S]*?<!-- \/rule-mcp-rules -->"$/m)?.[0];
assert.ok(rulesMarker && rulesContent, "must extract RULES_MARKER and RULES_CONTENT from install.sh");

const appendFunction = extractBashFunction(installSh, "append_rules_block");
const removeFunction = extractBashFunction(uninstallSh, "remove_rules_block");
assert.ok(appendFunction && removeFunction, "must extract append_rules_block and remove_rules_block");

const harness = String.raw`#!/usr/bin/env bash
set -euo pipefail; export PNPM_HOME="$(mktemp -d)/pnpm-sandbox"
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

# F) Prettier drift guard: the block install.sh appends must be byte-identical
# to the block committed in ./CLAUDE.md, so install/uninstall cycles never
# leave a backtick-pnpm-format-backtick diff behind.
: > "$tmp/f.md"
append_rules_block "$tmp/f.md"
sed -n '/<!-- rule-mcp-rules -->/,/<!-- \/rule-mcp-rules -->/p' "$tmp/f.md" > "$tmp/f.block"
sed -n '/<!-- rule-mcp-rules -->/,/<!-- \/rule-mcp-rules -->/p' "CLAUDE.md" > "$tmp/f.committed"
cmp -s "$tmp/f.block" "$tmp/f.committed" || fail "F: committed CLAUDE.md rules block differs from install.sh output"
echo "F ok"

echo "ALL OK"
`;

const harnessFile = join(mkdtempSync(join(tmpdir(), "rule-rules-")), "harness.sh");
writeFileSync(harnessFile, harness);
execFileSync("bash", [harnessFile], { encoding: "utf8" });

console.log("  ✅ rules block install/uninstall is blank-line idempotent");

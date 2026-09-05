#!/usr/bin/env node
/**
 * @module scripts/refresh-upstream-manifest
 *
 * Regenerates the hash manifest in docs/upstream/README.md after an upstream
 * re-import. The upstream directory is treated as immutable evidence: if a file
 * hash in the manifest stops matching the file on disk, someone edited the
 * record instead of re-importing, and the drift is visible in git.
 *
 * Run: `node scripts/refresh-upstream-manifest.mjs`
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = join(root, "docs", "upstream", "rule-mcp");
const manifest = join(root, "docs", "upstream", "README.md");

const rows = [];
for (const entry of walk(base)) {
  const hash = createHash("sha256").update(readFileSync(entry)).digest("hex").slice(0, 16);
  rows.push(`| ${entry.replace(root + "/", "")} | \`${hash}\` |`);
}

writeFileSync(
  manifest,
  [
    "# Upstream provenance: rule-mcp",
    "",
    "Source repository: `~/Projects/work/rule/ai/rule-mcp` (READ-ONLY reference).",
    "",
    "- Pinned commit: `12d60a9e0eb312010314e5b800e31cf71663d926`",
    "- Copied verbatim (no rebrand): ADR history, handoffs, audits, reviews, plans, security/threat model, privacy policy, and the product/tools/engineering/agent/environment docs",
    "",
    "These files are the immutable upstream record - the source of truth a future",
    "reader can diff the rule union against. The rule-native, live documents live in",
    "`docs/` at the repository root; anything here is historical evidence, not",
    "something to edit.",
    "",
    "A file-content manifest accompanies every import so a drift is detected by",
    "hash, not by memory. Refresh the manifest with `scripts/refresh-upstream-manifest.mjs`.",
    "",
    "| Path | SHA-256 |",
    "|------|---------|",
    ...rows,
    "",
  ].join("\n"),
);

console.log(`refreshed ${rows.length} upstream file hashes`);
console.log(`manifest: ${manifest.replace(root + "/", "")}`);

/** @param {string} dir @returns {string[]} files under dir, sorted */
function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files.sort();
}
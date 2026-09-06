#!/usr/bin/env node

/**
 * @module scripts/post-process
 *
 * Standalone file tree post-processing script.
 * Scans a project directory, validates the file tree against rule AI
 * conventions, and auto-fixes violations.
 *
 * Usage:
 *   node scripts/post-process.mjs                     # Lint mode (default)
 *   node scripts/post-process.mjs --fix               # Apply auto-fixes
 *   node scripts/post-process.mjs --dir ./my-project  # Custom project root
 *   node scripts/post-process.mjs --src-dir lib       # Custom source dir
 *   node scripts/post-process.mjs --dry-run           # Preview without writing
 *   node scripts/post-process.mjs --json              # JSON output (machine-readable)
 *   node scripts/post-process.mjs --help              # Show help
 *
 * Exit codes:
 *   0 - No issues found or all fixed
 *   1 - Issues found (lint mode) or errors during fix
 */

import { scanFileTree, autoFixFileTree } from "../../../src/core/file-tree/index.js";
import { printHelp } from "./_help.mjs";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const HELP = args.includes("--help") || args.includes("-h");
const FIX_MODE = args.includes("--fix");
const JSON_OUTPUT = args.includes("--json");
const DRY_RUN = !args.includes("--no-dry-run");

const DIR_IDX = args.indexOf("--dir");
const ROOT_DIR = DIR_IDX === -1 ? "." : args[DIR_IDX + 1];

const SRC_IDX = args.indexOf("--src-dir");
const SRC_DIR = SRC_IDX === -1 ? "src" : args[SRC_IDX + 1];

// ─── Help ────────────────────────────────────────────────────────────────────
if (HELP) {
  printHelp();
  process.exit(0);
}
// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (FIX_MODE) {
    const result = autoFixFileTree(ROOT_DIR, { srcDir: SRC_DIR, dryRun: DRY_RUN });

    if (JSON_OUTPUT) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.fixed.length > 0 && result.errors.length === 0 ? 0 : 1);
    }

    console.log(`\n# File Tree Post-Process: ${DRY_RUN ? "DRY RUN" : "FIX"}`);
    console.log(`  Project: ${ROOT_DIR}`);
    console.log(`  Source:  ${SRC_DIR}`);
    console.log("");

    if (result.fixed.length > 0) {
      console.log(`  ✅ Fixed: ${result.fixed.length}`);
      for (const f of result.fixed) {
        console.log(`     ${f.action}`);
      }
    }

    if (result.errors.length > 0) {
      console.log(`  ❌ Errors: ${result.errors.length}`);
      for (const e of result.errors) {
        console.log(`     ${e.path}: ${e.error}`);
      }
    }

    if (result.remaining.length > 0) {
      console.log(`  ⚠️  Remaining (unfixable): ${result.remaining.length}`);
      for (const r of result.remaining) {
        console.log(`     ${r.path}: ${r.message}`);
      }
    }

    if (result.fixed.length === 0 && result.errors.length === 0 && result.remaining.length === 0) {
      console.log("  ✅ No issues found. File tree is clean.");
    }

    console.log("");
    process.exit(result.errors.length > 0 ? 1 : 0);
  } else {
    // Lint mode
    const report = scanFileTree(ROOT_DIR, { srcDir: SRC_DIR });

    if (JSON_OUTPUT) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.pass ? 0 : 1);
    }

    console.log(`\n# File Tree Lint`);
    console.log(`  Project: ${ROOT_DIR}`);
    console.log(`  Source:  ${SRC_DIR}`);
    console.log(`  Files:   ${report.stats.totalFiles}`);
    console.log(`  Dirs:    ${report.stats.totalDirs}`);
    console.log("");

    if (report.pass) {
      console.log("  ✅ No issues found.");
      console.log("");
      process.exit(0);
    }

    console.log(`  ❌ ${report.issues.length} issue(s) found:\n`);

    for (const issue of report.issues) {
      const icon = issue.fixable ? "🔧" : "⚠️";
      console.log(`  ${icon} [${issue.type}]`);
      console.log(`     ${issue.path}`);
      console.log(`     ${issue.message}`);
      if (issue.fixAction) {
        console.log(`     → ${issue.fixAction}`);
      }
      console.log("");
    }

    console.log(
      `  Summary: ${report.stats.missingBarrel} missing barrels, ${report.stats.wrongPrefix} wrong prefixes, ${report.stats.bareFiles} bare files`,
    );
    console.log(`  Fixable: ${report.stats.fixable}/${report.issues.length}`);
    console.log(`  Run with --fix --no-dry-run to auto-fix.`);
    console.log("");
    process.exit(report.pass ? 0 : 1);
  }
}

main().catch((error) => {
  console.error(`FATAL: ${error.message}`);
  process.exit(1);
});

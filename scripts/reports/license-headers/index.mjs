#!/usr/bin/env node



/**
 * @module scripts/reports/license-headers
 *
 * SPDX headers for every tracked source file (OSS-17).
 *
 *   node scripts/reports/license-headers/index.mjs --check   exits 1 when a file lacks one
 *   node scripts/reports/license-headers/index.mjs --apply   inserts the missing headers
 *
 * The holder string is the single source fed by Step 18 (LICENSE, AUTHORS,
 * package.json): change it in one place, HOLDER below. Headers go after a
 * shebang when one exists, on top otherwise. Files that already carry an
 * SPDX-License-Identifier are left alone, so --apply is idempotent.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const HOLDER = "2025-2026 pixu1980";


function sourceFiles() {
  const tracked = execFileSync("git", ["ls-files", "src", "bin", "scripts"], { encoding: "utf8" }).split("\n");

  return tracked.filter((file) => /\.m?js$/u.test(file));
}

function missingHeader(file) {
  const text = readFileSync(file, "utf8");

  return !text.includes("SPDX-License-Identifier");
}

function stamp(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const at = lines[0]?.startsWith("#!") ? 1 : 0;

  lines.splice(at, 0, ...HEADER);
  writeFileSync(file, lines.join("\n"));
}

function check() {
  const missing = sourceFiles().filter(missingHeader);

  if (missing.length > 0) {
    for (const file of missing) {
      process.stderr.write(`license-headers: ${file} has no SPDX header.\n`);
    }

    process.exitCode = 1;

    return;
  }

  process.stdout.write("license-headers: every tracked source file carries an SPDX header.\n");
}

function apply() {
  const missing = sourceFiles().filter(missingHeader);

  for (const file of missing) {
    stamp(file);
  }

  process.stdout.write(`license-headers: stamped ${missing.length} file(s).\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [flag] = process.argv.slice(2);

  if (flag === "--check") {
    check();
  } else if (flag === "--apply") {
    apply();
  } else {
    process.stderr.write("usage: license-headers/index.mjs (--check|--apply)\n");
    process.exitCode = 1;
  }
}

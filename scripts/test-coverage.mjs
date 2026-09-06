#!/usr/bin/env node
/**
 * Native line/branch/function coverage over the unit-test batch.
 *
 * Reuses the exact file list of the `test:foundations` script so the coverage
 * measurement and the suite stay in sync (one source of truth for the batch).
 * Run: `pnpm test:coverage` — the trailing table prints per-file and aggregate
 * line % / branch % / funcs %. Exits non-zero when the batch fails.
 *
 * Note: subprocess-heavy tests (CLI, installer, daemon, transport) are not
 * visible to in-process instrumentation; a full cross-process number needs c8.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageRoot = new URL("../", import.meta.url);
const { scripts } = JSON.parse(readFileSync(new URL("package.json", packageRoot), "utf8"));

const batch = scripts["test:foundations"].replace(/^node --test /, "");
const args = ["--experimental-test-coverage", "--test", ...batch.split(/\s+/)];

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
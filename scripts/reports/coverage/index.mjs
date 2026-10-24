#!/usr/bin/env node
/**
 * Cross-process line/branch/function coverage over the whole test surface.
 *
 * c8 instruments through NODE_V8_COVERAGE, so the subprocess-heavy suites
 * (CLI, installer, daemon, transport) count - the native
 * --experimental-test-coverage runner could not see them. The suite under
 * measurement is the same glob-runner `all` suite CI runs; the branch floor is
 * a ratchet in ./_threshold.data.mjs that only rises until it reaches the
 * 95% target (execution plan, phase 7).
 *
 * Run: `pnpm test:coverage`. Exits non-zero when the suite fails or branch
 * coverage drops below the floor.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { BRANCH_FLOOR, BRANCH_TARGET } from "./_threshold.data.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const result = spawnSync(
  process.execPath,
  [
    "node_modules/c8/bin/c8.js",
    "--reporter",
    "text-summary",
    "--include",
    "src/**",
    "--include",
    "bin/**",
    "--exclude",
    "**/__tests__/**",
    "--check-coverage",
    "--branches",
    String(BRANCH_FLOOR),
    // Only the branch ratchet gates; c8 would otherwise apply its own default
    // thresholds for lines and statements on top of it.
    "--lines",
    "0",
    "--functions",
    "0",
    "--statements",
    "0",
    process.execPath,
    "scripts/ci/run-tests/index.mjs",
    "all",
  ],
  { cwd: root, stdio: "inherit", env: { ...process.env, RULE_MCP_COVERAGE: "1" } },
);

if (result.status === 0) {
  console.log(`\ncoverage: branch floor ${BRANCH_FLOOR}% held (target ${BRANCH_TARGET}%- raise the floor as tests land)`);
} else {
  console.error(`\ncoverage: the suite failed or branch coverage fell below the ${BRANCH_FLOOR}% floor`);
}

process.exit(result.status ?? 1);

#!/usr/bin/env node
/**
 * @module scripts/reports/startup
 *
 * What one invocation of this server costs before it does anything.
 *
 * stdio is the transport agents actually use, and it spawns the server as a
 * subprocess per client, so startup is paid on every connect - not once per
 * machine. That makes the import graph, the skill registration and the schema
 * conversion a per-connect tax, and this is the only place the size of that
 * tax comes from.
 *
 * Usage:
 *   node scripts/reports/startup/index.mjs           # report
 *   node scripts/reports/startup/index.mjs --json    # machine-readable
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 * @see https://nodejs.org/api/cli.html#node_compile_cachecache_dir
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BIN, handshake, phases, round, wall } from "./_measure.mjs";

const RUNS = 5;

/**
 * Telemetry and self-update off: this measures startup, not the network.
 *
 * The baseline also disables the compiled code cache explicitly. `bin/` turns
 * it on for every spawn, so without this the "without" column would measure
 * Node's default cache directory against an explicit one and report ~0.
 */
const baseEnv = { ...process.env, RULE_MCP_NO_TELEMETRY: "1", RULE_MCP_NO_AUTOUPDATE: "1", NODE_DISABLE_COMPILE_CACHE: "1" };

const cacheDir = mkdtempSync(join(tmpdir(), "rule-compile-cache-"));
const cachedEnv = { ...baseEnv, NODE_COMPILE_CACHE: cacheDir, NODE_DISABLE_COMPILE_CACHE: undefined };

// Prime the cache so the measurement is the steady state an installed agent
// sees, not the one run that wrote the cache.
spawnSync(process.execPath, [BIN, "--help"], { env: cachedEnv, stdio: "ignore" });

const report = {
  node: process.version,
  runs: RUNS,
  withoutCompileCache: {
    help: wall(["--help"], baseEnv, RUNS),
    toolsList: wall(["tools", "list"], baseEnv, RUNS),
    initializeMs: await handshake(baseEnv),
    phases: phases(baseEnv).phases,
  },
  withCompileCache: {
    help: wall(["--help"], cachedEnv, RUNS),
    toolsList: wall(["tools", "list"], cachedEnv, RUNS),
    initializeMs: await handshake(cachedEnv),
    phases: phases(cachedEnv).phases,
  },
};

report.helpWarmReductionPercent = round((1 - report.withCompileCache.help.warmMs / report.withoutCompileCache.help.warmMs) * 100);
rmSync(cacheDir, { recursive: true, force: true });

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, undefined, 2));
} else {
  console.log(`startup on ${report.node}, ${RUNS} runs each (cold = first, warm = median of the rest)\n`);
  console.log("                        no compile cache      with compile cache");

  for (const [label, key] of [
    ["--help", "help"],
    ["tools list", "toolsList"],
  ]) {
    const plain = report.withoutCompileCache[key];
    const cached = report.withCompileCache[key];
    console.log(
      `  ${label.padEnd(20)} cold ${String(plain.coldMs).padStart(6)} warm ${String(plain.warmMs).padStart(6)}   cold ${String(cached.coldMs).padStart(6)} warm ${String(cached.warmMs).padStart(6)}`,
    );
  }

  console.log(
    `  ${"stdio initialize".padEnd(20)}      ${String(report.withoutCompileCache.initializeMs).padStart(11)}        ${String(report.withCompileCache.initializeMs).padStart(11)}`,
  );
  console.log(`\nwarm --help with the compile cache: ${report.helpWarmReductionPercent} % lower\n`);
  console.log("phase split of a cold process (ms / RSS MB):");

  for (const [name, phase] of Object.entries(report.withoutCompileCache.phases ?? {})) {
    const cached = report.withCompileCache.phases?.[name];
    console.log(`  ${name.padEnd(16)} ${String(phase.ms).padStart(7)} ms  ${String(phase.rssMb).padStart(4)} MB     cached ${String(cached?.ms ?? "-").padStart(7)} ms`);
  }
}

/**
 * @module cli/cache
 *
 * `rule-mcp cache <stats|export|verify|clear>`.
 *
 * Four read surfaces over the deterministic cache, and one of them is the
 * reason the others can be trusted: `verify` recomputes what is stored and says
 * what no longer reproduces. A deterministic cache whose determinism nobody
 * checks is an assumption.
 *
 * @see module:core/cache/catalog - promotion, the file format, and priming
 */

import {
  buildCatalog,
  catalogPath,
  primeFromCatalog,
  readCatalog,
  verifyCache,
  writeCatalog,
  CATALOG_FILE,
  MIN_HITS,
} from "../core/cache/_catalog.js";
import {
  cacheClear,
  cacheEntries,
  cacheEnabled,
  normalizedTierEnabled,
  promotableEntries,
} from "../core/cache/_tool-cache.js";

const print = (value) => process.stdout.write(`${value}\n`);

/** The area a routed skill belongs to: `rule-styleguide-css` is styleguide. */
function areaOf(skill) {
  const [, area] = String(skill).split("-", 2);

  return area ?? "unknown";
}

/**
 * Recompute a call with the cache switched off for the duration.
 *
 * The comparison is against the deterministic core rather than the finished
 * result, because everything after the core, the reminder state, compression,
 * a banner, is expected to differ between two calls and says nothing about
 * whether the answer moved.
 *
 * @returns {(tool: string, args: object) => Promise<object>}
 */
async function makeRecompute() {
  const { loadAllSkills } = await import("../core/skills/_skills.js");
  const { recomputeCore, listTools } = await import("../tools/router/index.js");
  await loadAllSkills();
  const registered = new Set(listTools().map((tool) => tool.name));

  const recompute = async (tool, args) => {
    const previous = process.env.RULE_MCP_NO_CACHE;
    process.env.RULE_MCP_NO_CACHE = "1";
    try {
      return await recomputeCore(tool, args);
    } finally {
      if (previous === undefined) {
        delete process.env.RULE_MCP_NO_CACHE;
      } else {
        process.env.RULE_MCP_NO_CACHE = previous;
      }
    }
  };

  return { recompute, canRun: (tool) => registered.has(tool) };
}

/** What the local cache holds, which tier answered, and which areas still recompute. */
async function statsCommand(directory) {
  const entries = cacheEntries();
  const tokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
  const promotable = promotableEntries().length;

  print(`# rule cache\n`);
  print(`Enabled: ${cacheEnabled() ? "yes" : "no (RULE_MCP_NO_CACHE=1)"}`);
  print(`Tiers: exact${normalizedTierEnabled() ? " + normalized" : " only (RULE_MCP_CACHE_EXACT_ONLY=1)"}`);
  print(`Entries: ${entries.length}, about ${tokens} tokens stored`);
  print(`Promotable: ${promotable} call(s) reused ${MIN_HITS} times or more`);

  const catalog = readCatalog(directory);
  print(
    catalog
      ? `Catalog: ${catalog.entries.length} entries, generated ${catalog.generatedAt} by ${catalog.serverVersion}`
      : `Catalog: none at ${catalogPath(directory)}`,
  );

  const { readEvents } = await import("../core/telemetry/_store.js");
  const events = readEvents();

  if (events.length === 0) {
    print(`\nNo telemetry recorded, so hit rate and the areas still recomputing are unknown.`);

    return;
  }

  const tiers = {};
  const recomputingByArea = {};

  for (const event of events) {
    tiers[event.cacheTier ?? "miss"] = (tiers[event.cacheTier ?? "miss"] ?? 0) + 1;

    if (!event.cacheHit && event.routedSkill) {
      const area = areaOf(event.routedSkill);
      recomputingByArea[area] = (recomputingByArea[area] ?? 0) + 1;
    }
  }

  print(`\n## Which tier answered\n`);

  for (const [tier, count] of Object.entries(tiers).sort((a, b) => b[1] - a[1])) {
    print(`  ${String(count).padStart(5)}  ${tier}`);
  }

  const areas = Object.entries(recomputingByArea).sort((a, b) => b[1] - a[1]);

  if (areas.length > 0) {
    print(`\n## Areas still recomputing\n`);
    print(`Where the next canonical entry, or the next skill, would pay.\n`);

    for (const [area, count] of areas.slice(0, 10)) {
      print(`  ${String(count).padStart(5)}  ${area}`);
    }
  }
}

/** Promote what has earned it, prove it still reproduces, and write the file. */
async function exportCommand(directory) {
  const candidates = promotableEntries();

  if (candidates.length === 0) {
    print(`Nothing to export: no call has been reused ${MIN_HITS} times yet.`);

    return;
  }

  print(`Recomputing ${candidates.length} candidate(s) to check they still reproduce...`);
  const { catalog, promoted, dropped } = await buildCatalog(await makeRecompute());

  for (const entry of dropped) {
    print(`  dropped (${entry.reason}): ${entry.tool}`);
  }

  if (promoted.length === 0) {
    print(`Nothing promoted. The catalog was not written.`);

    return;
  }

  const file = writeCatalog(directory, catalog);
  print(`\nWrote ${file}`);
  print(`${promoted.length} promoted, ${dropped.length} dropped.`);
  print(`Read it, then commit it: what you commit is what your team inherits.`);
}

/** Recompute everything stored and report what moved. */
async function verifyCommand() {
  const stored = cacheEntries().filter((entry) => entry.tool !== undefined);

  if (stored.length === 0) {
    print("Nothing stored that can be re-run.");

    return;
  }

  print(`Recomputing ${stored.length} entr(ies)...`);
  const report = await verifyCache(await makeRecompute());

  print(`Checked ${report.checked}${report.skipped > 0 ? `, skipped ${report.skipped} not re-runnable` : ""}.`);

  for (const entry of report.drifted) {
    print(`  drifted: ${entry.tool} ${JSON.stringify(entry.args)}`);
  }

  for (const entry of report.failed) {
    print(`  failed:  ${entry.tool} (${entry.error})`);
  }

  if (report.drifted.length === 0 && report.failed.length === 0) {
    print("Every entry still reproduces.");

    return;
  }

  process.exitCode = 1;
}

/**
 * Run a `cache` subcommand.
 *
 * @param {string} subcommand - stats | export | verify | clear | prime
 * @param {{ dir?: string }} [options]
 */
export async function cacheCommand(subcommand = "stats", options = {}) {
  const directory = options.dir ?? process.cwd();

  switch (subcommand) {
    case "stats": {
      await statsCommand(directory);
      break;
    }

    case "export": {
      await exportCommand(directory);
      break;
    }

    case "verify": {
      await verifyCommand();
      break;
    }

    case "prime": {
      const { loaded, skipped } = primeFromCatalog(directory);

      print(`Loaded ${loaded} catalog entr(ies), skipped ${skipped}.`);
      break;
    }

    case "clear": {
      // The local cache only. The catalog is committed and belongs to the
      // repository, so removing it is a deliberate edit, not a maintenance
      // command that can be run by accident.
      cacheClear();
      print(`Local cache cleared. ${CATALOG_FILE} was not touched.`);
      break;
    }

    default: {
      print("Usage: rule-mcp cache <stats|export|verify|prime|clear> [--dir <path>]");
      process.exitCode = 1;
    }
  }
}

/** @module cli/cache/stats - the cache stats view */

import { catalogPath, readCatalog, MIN_HITS } from "../../core/cache/catalog/index.js";
import { cacheEntries, cacheEnabled, normalizedTierEnabled, promotableEntries } from "../../core/cache/tool-cache/index.js";
import { areaOf, print } from "./_helpers.js";

/** What the local cache holds, which tier answered, and which areas still recompute. */
export async function statsCommand(directory) {
  const entries = cacheEntries();
  const tokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
  const promotable = promotableEntries().length;

  print(`# rule cache\n`);
  print(`Enabled: ${cacheEnabled() ? "yes" : "no (RULE_MCP_NO_CACHE=1)"}`);
  print(`Tiers: exact${normalizedTierEnabled() ? " + normalized" : " only (RULE_MCP_CACHE_EXACT_ONLY=1)"}`);
  print(`Entries: ${entries.length}, about ${tokens} tokens stored`);
  print(`Promotable: ${promotable} call(s) reused ${MIN_HITS} times or more`);

  const catalog = readCatalog(directory);
  print(catalog ? `Catalog: ${catalog.entries.length} entries, generated ${catalog.generatedAt} by ${catalog.serverVersion}` : `Catalog: none at ${catalogPath(directory)}`);

  const { readEvents } = await import("../../core/telemetry/store/index.js");
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

/** @module cli/cache/export - export to and verify against the committed catalog */

import { buildCatalog, verifyCache, writeCatalog, MIN_HITS } from "../../core/cache/catalog/index.js";
import { cacheEntries, promotableEntries } from "../../core/cache/tool-cache/index.js";
import { makeRecompute, print } from "./_helpers.js";

/** Promote what has earned it, prove it still reproduces, and write the file. */
export async function exportCommand(directory) {
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
export async function verifyCommand() {
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

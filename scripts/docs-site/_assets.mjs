/**
 * @module scripts/docs-site/assets
 *
 * The three files every emitted page loads: one stylesheet and two scripts.
 * They are copied rather than bundled, so a page needs no build step to run
 * and the served bytes are the reviewed bytes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ASSETS = ["style.css", "prefs.js", "transitions.js"];

/**
 * @param {string} outDir
 * @param {string} projectDir
 */
export function copyAssets(outDir, projectDir) {
  const siteDir = join(projectDir, "scripts", "docs-site");

  for (const asset of ASSETS) {
    writeFileSync(join(outDir, asset), readFileSync(join(siteDir, asset), "utf8"));
  }
}

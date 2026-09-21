

/**
 * @module core/skills/reload
 *
 * The skill catalog's side of the reload port: it registers the loader.
 *
 * Importing this module is what arms the port, and `core/skills/index.js`
 * exports it, so any process that loads the catalog can be asked to reload it.
 * Nothing here imports self-update: the edge runs one way.
 */

import { registerReloadPort } from "./_reload-port.js";
import { loadAllSkills } from "./_load.js";

let reloading = false;

/** Re-register every tool from disk, best-effort: a failure leaves the catalog usable. */
async function reloadSkills() {
  reloading = true;

  try {
    await loadAllSkills(true);
  } catch {
    /* skills reload best-effort */
  } finally {
    reloading = false;
  }
}

registerReloadPort({ reloadSkills, isReloading: () => reloading });

/**
 * @module core/skills/reload-port
 *
 * The reload port: the one thing self-update may ask of the skill catalog.
 *
 * Self-update asks the catalog to reload through this seam. The catalog
 * imports the tool families, which import the router, which imports
 * self-update, so reaching for the loader directly closes that loop. This
 * module imports nothing: it is the seam that lets the catalog be wired in at
 * startup instead of reached for at run time.
 */

let implementation = null;

/**
 * Register the catalog's reload implementation.
 *
 * Called once at startup, where the skill catalog is loaded: importing
 * `core/skills/index.js` registers it. A process that never loads the catalog
 * leaves the port unregistered, and reloading is then a no-op rather than a
 * lazy import that would put the cycle back.
 *
 * @param {{ reloadSkills: () => Promise<void>, isReloading: () => boolean }} port
 */
export function registerReloadPort(port) {
  implementation = port;
}

/**
 * Whether the catalog is reloading right now.
 *
 * @returns {boolean}
 */
export function isReloading() {
  return implementation?.isReloading() ?? false;
}

/**
 * Reload the skill catalog after the tree changed, and resolve quietly when no
 * implementation is registered.
 *
 * @returns {Promise<void>}
 */
export async function reloadSkills() {
  await implementation?.reloadSkills();
}

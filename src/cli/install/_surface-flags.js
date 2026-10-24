/**
 * @module cli/install/surface-flags - the server surface a set of flags asks for
 *
 * The Surface step asks its own question, apart from the command files: one
 * spec string, one preset or one list. The installer writes the canonical
 * spec into the server env (see `core/skills/_surface.js`); absent touches
 * nothing, so a reinstall without the flag keeps the saved surface.
 */

import { SURFACE_VAR, parseSurface } from "../../core/skills/_surface.js";

export { SURFACE_VAR } from "../../core/skills/_surface.js";

/**
 * The surface a set of flags describes, or null when they describe none.
 *
 * @param {{ surface?: string }} options
 * @param {(text: string) => void} [warn]
 * @returns {{ preset?: string, areas?: string[], skills?: string[] }|null}
 */
export function surfaceOf(options = {}, warn = (text) => process.stderr.write(`${text}\n`)) {
  if (options.surface === undefined || options.surface === "") {
    return null;
  }

  const parsed = parseSurface(options.surface);

  if (!parsed) {
    warn(`install: unknown --surface "${options.surface}" - expected minimal, standard, full, areas:<a,b> or skills:<s,...>; leaving the surface alone.`);
  }

  return parsed;
}

/** The canonical spec string a surface answer serializes to. */
export function surfaceSpec(surface) {
  if (!surface) {
    return "";
  }

  if (surface.preset) {
    return surface.preset;
  }

  if (surface.areas?.length) {
    return `areas:${surface.areas.join(",")}`;
  }

  if (surface.skills?.length) {
    return `skills:${surface.skills.join(",")}`;
  }

  return "";
}

/**
 * The argv a surface answer asks for, for runs that repeat it.
 *
 * The inverse of `surfaceOf`, so the wizard's answer and a flagged install
 * reach the same command line rather than two that drifted.
 *
 * @param {{ preset?: string, areas?: string[], skills?: string[] }|null} [surface]
 * @returns {string[]}
 */
export function surfaceArgs(surface) {
  const spec = surfaceSpec(surface);

  return spec === "" ? [] : ["--surface", spec];
}

/**
 * Carry a surface answer into the process environment.
 *
 * The writers mirror the ambient value into the server config, so the answer
 * only has to arrive before the plan runs. Null touches nothing.
 *
 * @param {{ preset?: string, areas?: string[], skills?: string[] }|null} [surface]
 * @param {object} [env]
 */
export function applySurfaceEnv(surface, env = process.env) {
  if (!surface) {
    return;
  }

  env[SURFACE_VAR] = surfaceSpec(surface);
}

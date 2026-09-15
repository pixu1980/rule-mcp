

/**
 * @module core/tokensave/fallback
 *
 * The one branch every replacement uses: try TokenSave, fall back to the
 * JavaScript the server already ships.
 *
 * The contract is deliberately small. A `TokensaveUnavailableError` (or a
 * result the client marked `unavailable`) selects the JavaScript path; every
 * other error propagates, because a bug in the TokenSave answer must not be
 * hidden behind a silent fallback. The returned `path` makes the choice
 * visible to telemetry and tests.
 *
 * @see module:core/tokensave/client - the error and result this branches on
 */

import { TokensaveUnavailableError } from "./_client.js";

/** True when the thrown value means "the graph could not answer". */
function isUnavailableThrown(error) {
  return error instanceof TokensaveUnavailableError || error?.unavailable === true;
}

/**
 * Run the TokenSave path, else the JavaScript path.
 *
 * @param {string} _name - The capability name, reserved for telemetry
 * @param {() => Promise<unknown>} tokensaveFn - The TokenSave call
 * @param {() => unknown} jsFn - The JavaScript fallback
 * @returns {Promise<{ value: unknown, path: "tokensave"|"javascript" }>}
 */
export async function withFallback(_name, tokensaveFn, jsFn) {
  try {
    return { value: await tokensaveFn(), path: "tokensave" };
  } catch (error) {
    if (!isUnavailableThrown(error)) {
      throw error;
    }

    return { value: await jsFn(), path: "javascript" };
  }
}

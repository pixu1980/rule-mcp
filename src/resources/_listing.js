

/**
 * @module resources/listing
 *
 * The list-time compression pass for `resources/list`.
 *
 * Resource bodies are already compressed at read time (`./_serve.js`); the
 * listing labels are prose the model reads when it discovers what a `rule://`
 * URI can answer, so they go through the same pass. Measured: the real labels
 * are terse by design and the pass is a no-op on them (plan 2c) - the wiring
 * stays so the "every server→model surface is compressed" invariant holds.
 */

import { compressText } from "../core/text/_caveman.js";
import { cavemanEnabled } from "../core/text/_level.js";

/**
 * Compress every label of a `resources/list` payload. Urls and mimeTypes are
 * the protocol contract and are never touched; names pass through the caveman
 * pipeline (identity when already terse, guarded when not).
 *
 * @param {Array<{ uri: string, name: string, mimeType: string }>} resources
 * @returns {Array<{ uri: string, name: string, mimeType: string }>}
 */
export function compressResourceListing(resources) {
  const compress = cavemanEnabled();

  return (resources ?? []).map(({ name, ...rest }) => ({ ...rest, name: compress ? compressText(String(name ?? "")) : String(name ?? "") }));
}

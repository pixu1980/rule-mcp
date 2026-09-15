/**
 * @module resources/serve
 *
 * The way out of a `rule://` read.
 *
 * A resource body is prose the server emits and the model pays for, exactly
 * like a tool result, so it goes through the same compression pass and the
 * same structural guard. Only `text/*` payloads: an `application/json` body
 * is data, and compressing data corrupts it.
 */

import { compressSurfaceText, MIN_COMPRESS_LENGTH } from "../core/text/_compression.js";
import { recordToolCall } from "../core/telemetry/recorder/index.js";
import { serveResource } from "./_read.js";

/**
 * Read a resource by its URI: serve it, then compress every prose payload and
 * book what that saved under its own source.
 *
 * @param {string} uri
 * @returns {Promise<{ contents: Array<{ uri: string, mimeType: string, text: string }> }>}
 */
export async function readResource(uri) {
  const startedAt = Date.now();
  const served = await serveResource(uri);
  let saved = 0;

  const contents = (served.contents ?? []).map((item) => {
    if (typeof item?.text !== "string" || !String(item.mimeType ?? "").startsWith("text/") || item.text.length <= MIN_COMPRESS_LENGTH) {
      return item;
    }

    const compressed = compressSurfaceText(item.text, { source: "compression-resource" });
    saved += compressed.saved;

    return { ...item, text: compressed.text };
  });

  // Recorded as its own event so the flight export can answer which surface
  // saved what; a resource read never went through the router's telemetry.
  recordToolCall({
    tool: `resource:${uri}`,
    resource: true,
    durationMs: Date.now() - startedAt,
    resultBytes: contents.reduce((sum, item) => sum + (item.text?.length ?? 0), 0),
    saved: { "compression-resource": Math.ceil(saved / 4) },
  });

  return { ...served, contents };
}

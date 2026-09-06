/** @module core/enforcement/preprocess - the inbound half of the tool-call contract */

import { assertSafeValue, MAX_ARGUMENT_BYTES, normalizeArguments } from "./_input.js";

/**
 * Preprocess arguments before handler execution.
 *
 * @param {string} name - Tool name
 * @param {object} arguments_ - Raw arguments
 * @returns {object} preprocessed arguments
 */
export function preprocessToolCall(name, arguments_) {
  const serialized = JSON.stringify(arguments_ ?? {});

  if (Buffer.byteLength(serialized, "utf8") > MAX_ARGUMENT_BYTES) {
    throw new Error(`arguments exceed ${MAX_ARGUMENT_BYTES} bytes`);
  }

  assertSafeValue(arguments_ ?? {}, { keys: 0 });
  const normalized = normalizeArguments(arguments_ ?? {});

  if (name === "pix_tool" && !normalized.prompt) {
    throw new Error("pix_tool requires a non-blank prompt");
  }

  return normalized;
}

/** Receipt validation: the read path and the write path. */
import { createHash } from "node:crypto";
import { canonicalFilesDigest, openReceipt } from "./_receipts.js";

/**
 * Validate a receipt against current code.
 *
 * @param {string} token - Receipt from pix_gateway
 * @param {string} code - Code to validate against
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {{ valid: boolean, allPass?: boolean, reason?: string }}
 */
export function validateReceipt(token, code, now = Date.now()) {
  const { entry, error } = openReceipt(token, now);

  if (error) {
    return { valid: false, reason: error };
  }
  // A path-bound receipt must never be checked through the content-only route:
  // that would let the caller drop the destination binding at will.
  if (entry.binding === "files") {
    return { valid: false, reason: "Receipt is path-bound - validate it against the file set, not the raw code" };
  }

  const codeHash = createHash("sha256").update(code).digest("hex");

  if (codeHash !== entry.codeHash) {
    return { valid: false, reason: "Code hash mismatch - code was modified after check" };
  }

  if (!entry.allPass) {
    return { valid: false, allPass: false, reason: "Guardrails did not pass" };
  }

  return { valid: true, allPass: true };
}

/**
 * Validate a receipt for an actual write, i.e. against the file set that
 * pix_apply is about to put on disk. This is the only validation the write
 * path uses; it accepts both bindings and states which one carried the proof.
 *
 * - "files"   receipt: the ordered (path, content) tuples must match exactly.
 * - "content" receipt: single-file flow only. The gateway issues these
 *   from a bare `code` string, which cannot describe more than one destination,
 *   so a multi-file write requires the path-bound flow.
 *
 * @param {string} token - Receipt from pix_gateway
 * @param {Array<{ path: string, content: string }>} files - Files to be written
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {{ valid: boolean, binding?: "files"|"content", allPass?: boolean, reason?: string }}
 */
export function validateApply(token, files, now = Date.now()) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, reason: "No files to validate" };
  }

  const { entry, error } = openReceipt(token, now);

  if (error) {
    return { valid: false, reason: error };
  }

  if (entry.binding === "files") {
    if (canonicalFilesDigest(files) !== entry.codeHash) {
      return {
        valid: false,
        binding: "files",
        reason: "File set mismatch - paths, contents, order, or file count differ from what was checked",
      };
    }
  } else {
    if (files.length > 1) {
      return {
        valid: false,
        binding: "content",
        reason:
          "Content-only receipt cannot authorize a multi-file write - pass `files` to pix_gateway for a path-bound receipt",
      };
    }

    const codeHash = createHash("sha256")
      .update(String(files[0].content ?? ""))
      .digest("hex");

    if (codeHash !== entry.codeHash) {
      return { valid: false, binding: "content", reason: "Code hash mismatch - code was modified after check" };
    }
  }

  if (!entry.allPass) {
    return { valid: false, binding: entry.binding, allPass: false, reason: "Guardrails did not pass" };
  }

  return { valid: true, binding: entry.binding, allPass: true };
}

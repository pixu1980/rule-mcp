/**
 * @module tools/apply
 *
 * pix_apply - The ONLY tool that writes files to disk.
 *
 * Requires a valid receipt from pix_gateway proving that
 * the exact code being written passed all guardrails.
 *
 * Input:  { files: [{ path, content }], receipt }
 * Output: { written: [...], receiptValid: boolean }
 */

export { canonicalFilesDigest } from "../gateway/index.js";
export * from "./_roots.js";
export * from "./_target.js";
export * from "./_tool.js";

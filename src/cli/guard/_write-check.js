/**
 * @module cli/guard/_write-check
 *
 * The guardrail report on the whole file a Write, Edit or MultiEdit just
 * produced - the same engine `rule_tool_fix` runs, on every file that lands
 * instead of only on the ones the model chooses to hand over.
 *
 * It reports and never decides (ADR 129), so the composed file is read from
 * the payload and the disk after the tool call rather than before it.
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";

import { checkCode } from "../../core/guardrails/engine/index.js";
import { CHECKABLE, skillForPath } from "./_decide.js";

/** A package.json at any depth. */
const MANIFEST_FILE = /(?:^|\/)package\.json$/;

/** @param {string} path @returns {boolean} */
function isCheckable(path) {
  return CHECKABLE.has(extname(path)) || MANIFEST_FILE.test(path);
}

/**
 * The file on disk at `path`, or an empty string for one that cannot be read.
 *
 * @param {string} path
 * @returns {string}
 */
function onDisk(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

/**
 * The file the write produced.
 *
 * The hook runs after the tool call (ADR 129), so the file on disk is the
 * answer for Write, Edit and MultiEdit alike, and replaying the payload on top
 * of it would apply the same edit twice. `content` is the fallback for a path
 * that cannot be read back, which is the only case the payload knows better.
 *
 * @param {object} input - the hook's tool_input
 * @returns {string}
 */
export function composeFile(input) {
  const file = onDisk(String(input.file_path ?? ""));

  return file || (typeof input.content === "string" ? input.content : "");
}

/** An empty report: the file was not judged, and there is nothing to say about it. */
const NOTHING = { report: "" };

/**
 * What the guardrails have to say about the file that just landed.
 *
 * @param {object} input - the hook's tool_input
 * @returns {Promise<{ report: string, guardrailFailures?: number, guardrailRules?: Record<string, number> }>}
 */
export async function writeGuardrailReport(input = {}) {
  const path = String(input.file_path ?? "");

  if (!isCheckable(path)) {
    return NOTHING;
  }

  let result;

  try {
    const file = composeFile(input);

    if (!file) {
      return NOTHING;
    }

    result = checkCode(skillForPath(path), file, { fileName: path, filePath: path });
  } catch {
    return NOTHING;
  }

  if (result.allPass) {
    return NOTHING;
  }

  const lines = result.failed.slice(0, 10).map((rule) => `- ${rule.id}: ${rule.suggestion}`);

  return {
    report: [
      `${path || "This file"} fails ${result.failCount} guardrail(s) for ${result.skill}:`,
      ...lines,
      "",
      "Fix them in this file before moving on. Nobody is being asked to confirm anything.",
    ].join("\n"),
    guardrailFailures: result.failCount,
    guardrailRules: Object.fromEntries(result.failed.map((rule) => [rule.id, Number(rule.failCount) || 1])),
  };
}

/**
 * @module core/text/classify
 *
 * Is this text natural language (compressible) or code/config (leave alone)?
 *
 * Ported from the caveman-compress companion skill's `detect.py`
 * (`COMPRESSIBLE_EXTENSIONS`, `SKIP_EXTENSIONS`, `_is_json_content`,
 * `_is_yaml_content`, `detect_file_type`). The per-line shape guards live in
 * `./_line-shape.js` and the refusal list in `./_sensitive.js`.
 */

import { isCodeLine, YAML_KEY_RE } from "./_line-shape.js";

/** Extensions whose content is prose. */
export const COMPRESSIBLE_EXTENSIONS = new Set([".md", ".txt", ".markdown", ".rst"]);

/** Extensions whose content is code or configuration. */
export const SKIP_EXTENSIONS = new Set([
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".env",
  ".lock",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".lua",
  ".dockerfile",
  ".makefile",
  ".csv",
  ".ini",
  ".cfg",
]);

/** The subset of SKIP_EXTENSIONS that is configuration rather than code. */
const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env", ".lock"]);

/**
 * Is this text a JSON document (data, not prose)?
 *
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeJson(text) {
  const trimmed = text.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  try {
    JSON.parse(trimmed);

    return true;
  } catch {
    return false;
  }
}

/**
 * Does the head of this text read as YAML? Same 60 percent heuristic over the
 * first 30 lines as `detect.py`.
 *
 * @param {string[]} lines
 * @returns {boolean}
 */
export function looksLikeYaml(lines) {
  let indicators = 0;
  let nonEmpty = 0;

  for (const line of lines.slice(0, 30)) {
    const trimmed = line.trim();

    if (trimmed === "") {
      continue;
    }

    nonEmpty += 1;

    if (trimmed.startsWith("---") || YAML_KEY_RE.test(trimmed) || (trimmed.startsWith("- ") && trimmed.includes(":"))) {
      indicators += 1;
    }
  }

  return nonEmpty > 0 && indicators / nonEmpty > 0.6;
}

/**
 * Classify text, using the file name when there is one.
 *
 * @param {string} text
 * @param {string} [fileName]
 * @returns {"natural_language"|"code"|"config"|"unknown"}
 */
export function classifyText(text, fileName) {
  const extension = typeof fileName === "string" ? (/(\.[^./\\]+)$/.exec(fileName)?.[1] ?? "").toLowerCase() : "";

  if (COMPRESSIBLE_EXTENSIONS.has(extension)) {
    return "natural_language";
  }

  if (SKIP_EXTENSIONS.has(extension)) {
    return CONFIG_EXTENSIONS.has(extension) ? "config" : "code";
  }

  if (extension !== "") {
    return "unknown";
  }

  const lines = text.split("\n").slice(0, 50);

  if (looksLikeJson(text.slice(0, 10_000)) || looksLikeYaml(lines)) {
    return "config";
  }

  const nonEmpty = lines.filter((line) => line.trim() !== "");
  const codeLines = nonEmpty.filter((line) => isCodeLine(line));

  if (nonEmpty.length > 0 && codeLines.length / nonEmpty.length > 0.4) {
    return "code";
  }

  return "natural_language";
}



/** Transcript filesystem helpers: jsonl/json reads, listings, mtimes, project slugs. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Read a JSONL file into parsed objects, skipping anything unparseable.
 *
 * A transcript is appended to live, so the last line of the file the agent is
 * still writing is routinely half a line. That is not a corrupt transcript.
 *
 * @param {string} file
 * @returns {object[]}
 */
export function readJsonl(file) {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {string} file @returns {object|undefined} */
export function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return;
  }
}

/** @param {string} dir @returns {string[]} absolute paths of the entries, or none */
export function list(dir) {
  try {
    return readdirSync(dir).map((entry) => join(dir, entry));
  } catch {
    return [];
  }
}

/** @param {string} file @returns {number} mtime, or 0 for anything unreadable */
export function mtime(file) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Files under `dir`, newest first, recursing to `depth` levels of directories.
 *
 * @param {string} dir
 * @param {number} depth
 * @returns {string[]}
 */
export function filesUnder(dir, depth = 1) {
  if (!existsSync(dir)) {
    return [];
  }

  const found = [];
  const walk = (current, left) => {
    for (const entry of list(current)) {
      let directory;
      try {
        directory = statSync(entry).isDirectory();
      } catch {
        continue;
      }

      if (directory) {
        if (left > 0) {
          walk(entry, left - 1);
        }
      } else {
        found.push(entry);
      }
    }
  };

  walk(dir, depth);

  return found.sort((a, b) => mtime(b) - mtime(a));
}

/**
 * Whether a message body is a tool result rather than something a person typed.
 *
 * @param {unknown} content
 * @returns {boolean}
 */
export function isToolResult(content) {
  return Array.isArray(content) && content.some((block) => block?.type === "tool_result");
}

/**
 * How each agent encodes a project directory in its own paths, so a transcript
 * can be matched to the repository this server was recording.
 *
 * @param {string} projectDir
 * @returns {{ pi: string, claude: string }}
 */
export function slugsFor(projectDir) {
  return {
    // `--Users-me-Projects-app--`: separators become dashes, wrapped in a pair.
    pi: `--${projectDir.replace(/^\//, "").replaceAll("/", "-")}--`,
    // `-Users-me-Projects-app`: separators become dashes, leading one kept.
    claude: projectDir.replaceAll("/", "-"),
  };
}

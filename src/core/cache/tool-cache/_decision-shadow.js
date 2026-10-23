

/** The local JSONL record of what the decision-cache gate would replay. */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { cacheFile } from "./_config.js";

/** The shadow report lives beside the tool-cache file, in the state directory. */
export function shadowFile() {
  return join(dirname(cacheFile()), "decision-shadow.jsonl");
}

/** Append one shadow record. A metric is never worth breaking the call. */
export function recordShadow(event) {
  try {
    const file = shadowFile();

    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(event)}\n`);
  } catch {
    /* a shadow metric is never worth an outage */
  }
}

/** Read the records back for the report and the tests. */
export function readShadows() {
  try {
    if (!existsSync(shadowFile())) {
      return [];
    }

    return readFileSync(shadowFile(), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/** Drop the shadow history; the next observation starts clean. */
export function clearShadows() {
  try {
    rmSync(shadowFile(), { force: true });
  } catch {
    /* nothing to clear is not a failure */
  }
}

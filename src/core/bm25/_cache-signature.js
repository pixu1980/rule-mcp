/** @module core/bm25/cache-signature - the cache key, file and skills signature */

import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getRuntimePaths, getSkillsDirs as getSkillsDirectories } from "../../cli/paths/index.js";
import { codeSignature } from "../code-signature.js";

export function indexCacheKey() {
  return createHash("sha256").update(`${codeSignature()}:${skillsSignature()}`).digest("hex").slice(0, 12);
}

/** Where a built index is kept, keyed by the code and the skills that produced it. */
export function indexCacheFile() {
  return join(getRuntimePaths().stateDir, `bm25-${indexCacheKey()}.json.gz`);
}

/** The newest modification time and file count across every skills directory. */
export function skillsSignature() {
  let newest = 0;
  let count = 0;

  for (const dir of Object.values(getSkillsDirectories())) {
    const walk = (path) => {
      let entries;
      try {
        entries = readdirSync(path, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const child = join(path, entry.name);

        if (entry.isDirectory()) {
          walk(child);
        } else if (entry.name.endsWith(".md")) {
          count += 1;
          newest = Math.max(newest, statSync(child).mtimeMs);
        }
      }
    };
    walk(dir);
  }

  return `${count}:${newest}`;
}

/** Whether an index may be read from or written to disk at all. */
export function indexCacheEnabled() {
  return process.env.RULE_MCP_NO_CACHE !== "1";
}

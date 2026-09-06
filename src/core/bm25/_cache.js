/** On-disk index cache: read, write, signatures, stats. */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { getRuntimePaths, getSkillsDirs as getSkillsDirectories } from "../../cli/paths.js";
import { codeSignature } from "../code-signature.js";
import { _index, setIndex } from "./_state.js";

function indexCacheKey() {
  return createHash("sha256").update(`${codeSignature()}:${skillsSignature()}`).digest("hex").slice(0, 12);
}

/** Where a built index is kept, keyed by the code and the skills that produced it. */
function indexCacheFile() {
  return join(getRuntimePaths().stateDir, `bm25-${indexCacheKey()}.json.gz`);
}

/** The newest modification time and file count across every skills directory. */
function skillsSignature() {
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
function indexCacheEnabled() {
  return process.env.RULE_MCP_NO_CACHE !== "1";
}

/**
 * Load an index already built for this exact code and these skills.
 *
 * @returns {boolean} whether `_index` was restored
 */
function restoreIndex() {
  if (!indexCacheEnabled()) {
    return false;
  }

  try {
    const stored = JSON.parse(gunzipSync(readFileSync(indexCacheFile())).toString());

    setIndex({
      df: new Map(stored.df.map(([term, postings]) => [term, new Map(postings)])),
      docLength: new Map(stored.docLength),
      docs: stored.docs,
      totalDocs: stored.totalDocs,
      avgDocLength: stored.avgDocLength,
    });

    return true;
  } catch {
    return false;
  }
}

/** Write the built index out, best effort: a failure here only costs a rebuild. */
function persistIndex() {
  if (!indexCacheEnabled() || !_index) {
    return;
  }

  try {
    const stored = {
      df: [..._index.df].map(([term, postings]) => [term, [...postings]]),
      docLength: [..._index.docLength],
      docs: _index.docs,
      totalDocs: _index.totalDocs,
      avgDocLength: _index.avgDocLength,
    };
    const file = indexCacheFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, gzipSync(JSON.stringify(stored)));

    // One index is useful; the one from every previous code signature is not.
    // The current key is the only one that can ever be read.
    for (const name of readdirSync(dirname(file))) {
      if (name.startsWith("bm25-") && name.endsWith(".json.gz") && name !== basename(file)) {
        rmSync(join(dirname(file), name), { force: true });
      }
    }
  } catch {
    /* a cache that cannot be written is a cache that is not used */
  }
}

/**
 * Clear the BM25 index (called on `skills reload`).
 */
function clearIndex() {
  setIndex(null);
}

/**
 * Check if index is built.
 * @returns {boolean}
 */
function isIndexReady() {
  return _index !== null && _index.totalDocs > 0;
}

/**
 * Get index statistics.
 * @returns {{ totalDocs: number, avgDocLength: number, uniqueTerms: number } | null}
 */
function getIndexStats() {
  if (!_index) {
    return null;
  }

  return {
    totalDocs: _index.totalDocs,
    avgDocLength: Math.round(_index.avgDocLength * 10) / 10,
    uniqueTerms: _index.df.size,
  };
}

// ─── BM25 scoring ─────────────────────────────────────────────────

/**
 * Compute BM25 score for a single term against a document.
 *
 * @param {number} tf - Term frequency in document
 * @param {number} docLen - Document length in terms
 * @param {number} avgDocLen - Average document length
 * @param {number} N - Total number of documents
 * @param {number} n - Number of documents containing the term
 * @returns {number}
 */
export { indexCacheKey, indexCacheFile, skillsSignature, indexCacheEnabled, restoreIndex, persistIndex, clearIndex, isIndexReady, getIndexStats };

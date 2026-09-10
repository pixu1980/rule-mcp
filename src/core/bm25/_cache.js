

/** On-disk index cache: read, write, stats. */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { _index, setIndex } from "./_state.js";
import { indexCacheEnabled, indexCacheFile } from "./_cache-signature.js";

export { indexCacheEnabled, indexCacheFile, indexCacheKey, skillsSignature } from "./_cache-signature.js";

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

export { restoreIndex, persistIndex, clearIndex, isIndexReady, getIndexStats };

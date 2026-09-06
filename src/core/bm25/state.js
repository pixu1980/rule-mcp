// Auto-split from src/core/bm25.js - see ./bm25/index.js
/** Shared in-memory index state (built by build.js, restored/persisted by cache.js). */

export let _index = null;

export function setIndex(value) { _index = value; }



/**
 * Minimal Nyx adapter double for the cache-tier tests: no model, no network.
 * The tests point RULE_MCP_NYX_MODULE at this file.
 */

/** Text is about documents (adr/cache) or something else. */
const isDocument = (text) => /adr|cache/i.test(String(text));

/**
 * @returns {object} The subset of the Nyx adapter the cache tier uses.
 */
export function createMcpAdapter() {
  return {
    describe: () => ({ model: "stub", backends: ["heuristics"], embeddings: true, modes: [] }),
    embed: async (texts) => texts.map((text) => (isDocument(text) ? [1, 0] : [0, 1])),
    classify: async ({ text }) => ({ decision: { cacheGroup: isDocument(text) ? "docs|easy|plain" : "other|easy|plain" } }),
    shouldReplay: async ({ query, entry }) => {
      const cacheGroup = isDocument(query) ? "docs|easy|plain" : "other|easy|plain";

      if (cacheGroup !== entry.cacheGroup) {
        return { replay: false, reason: "labels-mismatch", similarity: 0.5 };
      }

      return { replay: true, tier: "semantic-gated", similarity: 0.99 };
    },
  };
}

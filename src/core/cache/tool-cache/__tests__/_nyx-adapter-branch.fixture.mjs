/**
 * Nyx adapter double for the similarity-tier miss branches: skip without embedding,
 * skip without stored prompt, replay then miss on cacheGet, and throw into the catch.
 */
export function createMcpAdapter() {
  return {
    describe: () => ({ model: "stub-branches", backends: ["heuristics"], embeddings: true, modes: [] }),
    embed: async (texts) => texts.map(() => [1, 0]),
    classify: async () => ({ decision: { cacheGroup: "docs|easy|plain" } }),
    shouldReplay: async ({ query }) => {
      if (String(query).includes("throw-please")) {
        throw new Error("forced similarity failure");
      }

      if (String(query).includes("no-replay")) {
        return { replay: false, reason: "labels-mismatch", similarity: 0.1 };
      }

      return { replay: true, tier: "semantic-gated", similarity: 0.99 };
    },
  };
}

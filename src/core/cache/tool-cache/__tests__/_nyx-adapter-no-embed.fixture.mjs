

/** Nyx adapter without embed: the similarity tier must treat it as a miss. */
export function createMcpAdapter() {
  return {
    describe: () => ({ model: "stub-no-embed", backends: [], embeddings: false, modes: [] }),
    classify: async () => ({ decision: { cacheGroup: "docs|easy|plain" } }),
  };
}

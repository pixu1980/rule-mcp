

/** @module tools/skill/search-tool */

import { z } from "zod/v4";
import { registerTool } from "../router/index.js";

/**
 * Register the pix_search tool for full-text search across ALL rule skills.
 */
export function registerSearchTool() {
  // Lazy imports
  let _bm25 = null;
  async function getBm25() {
    if (!_bm25) {
      _bm25 = await import("../../core/bm25/index.js");
    }

    return _bm25;
  }

  const SearchSchema = z.object({
    query: z.string().describe("Search query to find across all rule skills"),
    maxResults: z.number().int().min(1).max(100).default(10).describe("Maximum number of ranked results"),
  });
  registerTool({
    name: "rule_tool_search",
    description: "Semantic search across ALL rule skills using BM25 ranking. Returns scored, relevant sections.",
    zodSchema: SearchSchema,
    handler: async (arguments_) => {
      const { search, buildIndex, isIndexReady, getIndexStats } = await getBm25();
      // Ensure index is built
      if (!isIndexReady()) {
        buildIndex();
      }
      // Stats line for diagnostics
      const stats = getIndexStats();
      const results = search(arguments_.query, arguments_.maxResults || 10);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results for "${arguments_.query}".${stats ? ` (${stats.totalDocs} sections indexed, ${stats.uniqueTerms} terms)` : ""}`,
            },
          ],
        };
      }
      // Format ranked results
      const lines = [
        `# Search: "${arguments_.query}"`,
        `Found ${results.length} results across ${new Set(results.map((r) => r.skill)).size} skills`,
        `Index: ${stats ? `${stats.totalDocs} sections, ${stats.uniqueTerms} unique terms, avg ${stats.avgDocLength} terms/doc` : ""}`,
        "",
      ];

      for (const r of results) {
        const snippet = r.snippet.length > 150 ? r.snippet.slice(0, 150) + "..." : r.snippet;

        lines.push(`### ${r.skill} \u{2192} ${r.section} _(score: ${r.score})_`, "", `${snippet}`, "");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  });
}

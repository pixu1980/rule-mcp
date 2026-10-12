

/** Label and embed the candidate prompts a tool already stored, for the Nyx similarity tier. */
import { NORMALIZABLE } from "./_state.js";
import { entriesStore } from "./_persistence.js";

// One embedding batch per candidate tool, capped: a cold cache must not turn a
// miss into an unbounded request.
const MAX_CANDIDATES = 200;

/**
 * The prompt-shaped argument of a tool, from the cache's own allowlist. A tool
 * without one can never reach the similarity tier, by construction.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {string|null}
 */
export function promptOf(toolName, args) {
  for (const field of NORMALIZABLE.get(toolName) ?? []) {
    const value = args?.[field];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

/**
 * Annotate every candidate prompt of this tool in one embedding batch, once.
 *
 * @param {import("nyx/mcp").McpAdapter} adapter
 * @param {string} toolName
 */
export async function annotateMissing(adapter, toolName) {
  const store = entriesStore();
  const pending = [];

  for (const [key, entry] of store.entries()) {
    if (pending.length >= MAX_CANDIDATES) {
      break;
    }

    if (entry.tool !== toolName || entry.nyx?.embedding) {
      continue;
    }

    const text = promptOf(toolName, entry.args);

    if (text) {
      pending.push({ key, entry, text });
    }
  }

  if (pending.length === 0) {
    return;
  }

  const embeddings = await adapter.embed(pending.map((item) => item.text));

  for (const [index, item] of pending.entries()) {
    const embedding = embeddings[index];

    if (!embedding) {
      continue;
    }

    const decision = await adapter.classify({ text: item.text, scope: "cache" });

    item.entry.nyx = { cacheGroup: decision.decision.cacheGroup, embedding };
    store.set(item.key, item.entry);
  }
}

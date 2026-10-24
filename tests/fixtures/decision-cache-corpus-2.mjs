/**
 * @module tests/fixtures/decision-cache-corpus-2
 *
 * The second leave-one-out slice: twelve more groups and five more unseeded
 * negatives. The first slice stays untouched; the corpus plan merges both.
 *
 * @type {Array<{ id: string, seed: string, paraphrases: string[] }>}
 */
export const CACHE_GROUPS = [
  {
    id: "node-stream",
    seed: "Node.js stream backpressure",
    paraphrases: ["handle backpressure in a Node stream", "Node stream pipeline backpressure"],
  },
  {
    id: "express-middleware",
    seed: "Express middleware order",
    paraphrases: ["order of Express middleware", "Express middleware runs twice"],
  },
  {
    id: "postgres-pool",
    seed: "Postgres connection pooling",
    paraphrases: ["pool Postgres connections", "Postgres pool size"],
  },
  {
    id: "sqlite-wal",
    seed: "SQLite WAL mode",
    paraphrases: ["enable WAL in SQLite", "SQLite write-ahead logging"],
  },
  {
    id: "otel-http",
    seed: "OpenTelemetry trace for an HTTP call",
    paraphrases: ["trace an HTTP request with OpenTelemetry", "OpenTelemetry spans"],
  },
  {
    id: "css-container",
    seed: "CSS container query for a card",
    paraphrases: ["container query a card", "responsive card with container queries"],
  },
  {
    id: "boolean-naming",
    seed: "naming convention for a boolean",
    paraphrases: ["how should I name a boolean", "boolean naming"],
  },
  {
    id: "readme-structure",
    seed: "README structure for a library",
    paraphrases: ["what goes in a library README", "write a README"],
  },
  {
    id: "sw-cache",
    seed: "service worker cache strategy",
    paraphrases: ["cache assets with a service worker", "service worker caching"],
  },
  {
    id: "spacing-tokens",
    seed: "design tokens for spacing",
    paraphrases: ["spacing design tokens", "token scale for spacing"],
  },
  {
    id: "vite-alias",
    seed: "Vite alias for a src folder",
    paraphrases: ["configure a Vite alias", "Vite resolve alias"],
  },
  {
    id: "nuxt-server",
    seed: "Nuxt server route",
    paraphrases: ["add a server route in Nuxt", "Nuxt API route"],
  },
];

/**
 * Unseeded negatives for the second slice; the first slice's negatives remain.
 *
 * @type {Array<{ id: string, prompt: string }>}
 */
export const CACHE_NEGATIVES = [
  { id: "duckdb-parquet", prompt: "DuckDB read parquet" },
  { id: "graphql-dataloader", prompt: "GraphQL dataloader batching" },
  { id: "astro-content", prompt: "Astro content collections" },
  { id: "desktop-update", prompt: "Tauri auto-update" },
  { id: "rspack-cache", prompt: "rspack persistent cache" },
];

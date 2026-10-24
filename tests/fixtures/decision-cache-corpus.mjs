/**
 * @module tests/fixtures/decision-cache-corpus
 *
 * The paraphrase corpus for the L3 decision-cache gate.
 *
 * Each group is one cached call (the seed) and the live phrasings that should
 * reuse it. The benchmark computes each prompt's gold route with the live
 * `rule_tool` call, so the corpus never asserts a route by hand. The negatives
 * are live prompts whose skill has no seed: any candidate is a wrong replay,
 * and `none` is the only safe choice.
 *
 * @type {Array<{ id: string, seed: string, paraphrases: string[] }>}
 */
export const CACHE_GROUPS = [
  {
    id: "react-button",
    seed: "I need a React button component",
    paraphrases: ["How do I create a React button component?", "React button component with a loading state", "reusable button component in React"],
  },
  {
    id: "vue-component",
    seed: "Vue 3 component with Composition API",
    paraphrases: ["Vue component using setup and ref", "how do I write a Vue 3 single-file component"],
  },
  {
    id: "typescript-enum",
    seed: "should I use enum or a union type",
    paraphrases: ["typescript enum versus union", "enum or union in TypeScript"],
  },
  {
    id: "html-boilerplate",
    seed: "html boilerplate for a new page",
    paraphrases: ["document boilerplate for a page", "what goes in the head of a document"],
  },
  {
    id: "test-first",
    seed: "how do I test my code",
    paraphrases: ["how should I test my code", "write a failing test for this", "how do I write a test that fails first"],
  },
  {
    id: "compact-context",
    seed: "should I compact or start a fresh context",
    paraphrases: ["compact the context or start fresh", "when should I compact my agent context"],
  },
  {
    id: "mcp-granularity",
    seed: "how granular should my mcp tools be",
    paraphrases: ["how many tools should an mcp server expose", "tool granularity at the api boundary"],
  },
  {
    id: "jwt-verify",
    seed: "Verify JWT token best practices",
    paraphrases: ["JWT verification best practices", "how do I validate a JWT"],
  },
  {
    id: "slow-sql",
    seed: "why is my query slow",
    paraphrases: ["how do I make this SQL query faster", "slow SQL query"],
  },
  {
    id: "docker-multistage",
    seed: "multi-stage Dockerfile for Node",
    paraphrases: ["build a small Node image with a multi-stage Dockerfile", "docker multi-stage build for node", "multi-stage build to shrink a Node image"],
  },
  {
    id: "focus-visible",
    seed: "keyboard focus visible outline",
    paraphrases: ["visible focus ring accessibility", "keyboard focus styles"],
  },
  {
    id: "tdd-cycle",
    seed: "write the test first",
    paraphrases: ["TDD red green refactor", "test first before the implementation"],
  },
  {
    id: "express-errors",
    seed: "Express route with error handling",
    paraphrases: ["handle errors in an Express route", "Express error middleware"],
  },
  {
    id: "fastify-schema",
    seed: "Fastify schema validation",
    paraphrases: ["validate a Fastify request body", "Fastify JSON schema for the body"],
  },
  {
    id: "postgres-index",
    seed: "Postgres index for a slow query",
    paraphrases: ["speed up this Postgres query", "add an index in Postgres"],
  },
  {
    id: "vitest-mock",
    seed: "Vitest mock a module",
    paraphrases: ["mock a module in Vitest", "spy on a function with Vitest"],
  },
  {
    id: "react-hook-form",
    seed: "React Hook Form validation",
    paraphrases: ["validate a form with React Hook Form", "show form errors in React"],
  },
  {
    id: "code-review",
    seed: "code review checklist",
    paraphrases: ["what should I check in a code review", "review this pull request"],
  },
  {
    id: "adr",
    seed: "write an ADR",
    paraphrases: ["record an architecture decision", "ADR template"],
  },
  {
    id: "i18n",
    seed: "translate the UI into Italian",
    paraphrases: ["add Italian translations", "localize the interface"],
  },
  {
    id: "passkey",
    seed: "passkey registration flow",
    paraphrases: ["WebAuthn registration", "add a passkey to login"],
  },
  {
    id: "next-server",
    seed: "Next.js server action",
    paraphrases: ["call the database from a Next.js action", "Next.js app router action"],
  },
];

/**
 * Live prompts whose skill has no seed, so the gate has nothing safe to replay.
 *
 * @type {Array<{ id: string, prompt: string }>}
 */
export const CACHE_NEGATIVES = [
  { id: "mongo-aggregation", prompt: "MongoDB aggregation pipeline with unwind" },
  { id: "pnpm-workspace", prompt: "pnpm workspace protocol dependency" },
  { id: "desktop-tauri", prompt: "desktop app packaging with Tauri" },
  { id: "astro-island", prompt: "Astro island that hydrates on visible" },
  { id: "svelte-store", prompt: "Svelte store for shared state" },
  { id: "mysql-index", prompt: "MySQL composite index" },
  { id: "rspack-federation", prompt: "rspack module federation config" },
  { id: "graphql-subscription", prompt: "GraphQL subscription with websockets" },
];

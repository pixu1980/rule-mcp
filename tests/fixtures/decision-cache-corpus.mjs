

/**
 * @module tests/fixtures/decision-cache-corpus
 *
 * The paraphrase corpus for the L3 decision-cache gate.
 *
 * Each group is one cached call (the seed) and the live phrasings that should
 * reuse it. The benchmark computes each prompt's gold route with the live
 * `pix_tool` call, so the corpus never asserts a route by hand. The negatives
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
    paraphrases: ["how should I test my code", "write a failing test for this"],
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
    paraphrases: ["build a small Node image with a multi-stage Dockerfile", "docker multi-stage build for node"],
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
];

/**
 * Live prompts whose skill has no seed, so the gate has nothing safe to replay.
 *
 * @type {Array<{ id: string, prompt: string }>}
 */
export const CACHE_NEGATIVES = [
  { id: "passkey-auth", prompt: "passkey registration flow for a web app" },
  { id: "mongo-aggregation", prompt: "MongoDB aggregation pipeline with unwind" },
  { id: "next-server-action", prompt: "Next.js app router server action" },
  { id: "pnpm-workspace", prompt: "pnpm workspace protocol dependency" },
  { id: "i18n-italian", prompt: "translate the interface into Italian" },
];

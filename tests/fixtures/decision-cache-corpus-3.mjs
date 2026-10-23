

/**
 * @module tests/fixtures/decision-cache-corpus-3
 *
 * The third leave-one-out slice: three more groups and three more unseeded
 * negatives. The corpus plan merges all three slices.
 *
 * @type {Array<{ id: string, seed: string, paraphrases: string[] }>}
 */
export const CACHE_GROUPS = [
  {
    id: "remix-loader",
    seed: "Remix loader data",
    paraphrases: ["load data in a Remix route", "Remix loader and action"],
  },
  {
    id: "hono-auth",
    seed: "Hono auth middleware",
    paraphrases: ["auth middleware in Hono", "Hono route guard"],
  },
  {
    id: "angular-signal",
    seed: "Angular signal input",
    paraphrases: ["Angular input signal", "signal-based input in Angular"],
  },
];

/**
 * Unseeded negatives for the third slice.
 *
 * @type {Array<{ id: string, prompt: string }>}
 */
export const CACHE_NEGATIVES = [
  { id: "git-rebase", prompt: "git interactive rebase" },
  { id: "npm-provenance", prompt: "npm provenance publish" },
  { id: "library-publish", prompt: "publish a TypeScript library" },
];

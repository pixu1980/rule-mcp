

/**
 * @module test/fixtures/semantic-guardrail-corpus
 *
 * The good/bad pairs for the semantic rule. The reader has to agree with the
 * label from the message alone: a good message names the next action, a bad
 * one says only that something failed.
 *
 * @type {Array<{ label: "good" | "bad", why: string, code: string }>}
 */
export const CORPUS = [
  {
    label: "good",
    why: "the message names the variable and the next action",
    code: 'throw new Error("Set DATABASE_URL to the Postgres connection string before starting the server.");\n',
  },
  {
    label: "good",
    why: "the message names the file, the expected shape and where to read more",
    code: 'throw new Error("config.json must contain a numeric port; see README.md.");\n',
  },
  {
    label: "bad",
    why: "the message says only that it failed",
    code: 'throw new Error("Failed");\n',
  },
  {
    label: "bad",
    why: "the message repeats the function name and names no next step",
    code: 'throw new Error("loadConfig failed");\n',
  },
];

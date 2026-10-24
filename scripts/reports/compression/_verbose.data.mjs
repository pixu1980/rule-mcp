

/**
 * @module scripts/reports/compression/verbose.data
 *
 * Synthetic verbose prose: the corpus the level table is actually about.
 *
 * This project's own skills and docs are already written in the compressed
 * style the compression skill teaches, so measuring the vocabulary on them
 * measures how little filler is left, not what the rules can do. The paragraphs
 * below are what an uncompressed assistant answer looks like - pleasantries,
 * hedging, throat-clearing, long-form connectives - and they are labeled
 * synthetic everywhere the number is quoted.
 *
 * @see skills/rule-mcp-process-compression/SKILL.md - every construct here appears in its rule table
 */

/** @type {Array<{ name: string, text: string }>} */
export const VERBOSE_CORPUS = [
  {
    name: "answer/pleasantries",
    text: [
      "Sure! I would be happy to help you with that. It is worth noting that the",
      "authentication middleware is basically just checking the token expiry, and in",
      "order to fix it you will essentially need to modify the comparison operator.",
      "Of course, at the end of the day, this is really quite a straightforward change.",
    ].join("\n"),
  },
  {
    name: "answer/hedging",
    text: [
      "Please note that there are quite a few additional configuration parameters that",
      "are currently utilized by the implementation. As a result, due to the fact that",
      "the database request is asynchronous, you will need to take into account",
      "approximately the same performance characteristics. Needless to say, the",
      "documentation should demonstrate the modifications as well as the numerous",
      "dependencies that are required.",
    ].join("\n"),
  },
  {
    name: "answer/connectives",
    text: [
      "In my opinion, it seems that the majority of the specifications are able to be",
      "simplified. Furthermore, the repository has an extensive set of directories,",
      "which leads to a large number of frequently modified environment parameters.",
      "Prior to the release, and in the event that the deployment fails, you should",
      "definitely make a decision about the rollback on a regular basis.",
    ].join("\n"),
  },
  {
    name: "answer/mixed-with-structure",
    text: [
      "# The authentication fix",
      "",
      "As you can see, the implementation of the token comparison is obviously wrong.",
      "It should be noted that the following code demonstrates the required change:",
      "",
      "```js",
      "// The very first check: an expiry exactly on the boundary is still valid.",
      "if (token.expiresAt <= Date.now()) {",
      "  return refresh(token);",
      "}",
      "```",
      "",
      "- Keep in mind that the additional parameters are approximately the same",
      "- See https://example.com/auth and ./src/core/auth/_expiry.js for the details",
      "",
      "| Field | The default value |",
      "| --- | --- |",
      "| expiry | 3600 |",
    ].join("\n"),
  },
];

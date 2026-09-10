

/** Shape tests for inline code spans: branch, path, command. */
import { TRUNKS } from "./_constants.js";

/** Every inline code span in a body, in order, deduplicated. */
export function codeSpans(body) {
  return [...new Set([...body.matchAll(/`([^`\n]+)`/g)].map((match) => match[1].trim()))];
}

/**
 * A branch prefix and a directory name are the same word.
 *
 * `test/tool-surface-budget.test.mjs` opens with a branch prefix and is a file,
 * so the extension check is what separates them - without it a handoff naming
 * test files reports three branches that never existed.
 */
export const looksLikeBranch = (text) =>
  !/\.[a-z]{1,5}$/i.test(text) && (/^(?:feat|fix|chore|docs|refactor|test|perf|ci|hotfix|release|spike)\/[\w.-]+$/.test(text) || TRUNKS.has(text));

/**
 * A glob is not a path. `src/core/telemetry*.js` matched nothing on disk and was
 * reported as deleted, which is a fabricated fact from a real handoff.
 */
export const looksLikePath = (text) => !text.includes(" ") && !/[*?[\]]/.test(text) && text.includes("/") && /\.[a-z]{1,5}$/i.test(text) && !looksLikeBranch(text);

export const looksLikeCommand = (text) => /^(?:pnpm|npm|pnpx|node|bash|git|sh)\s+\S/.test(text);

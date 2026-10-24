/** Shape tests for inline code spans: branch, path, command. */
import { TRUNKS } from "./_constants.js";

/** A line that opens or closes a fenced code block. */
const FENCE = /^[ \t]*(?:`{3,}|~{3,})/;

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

/** A shell-out a handoff claims to have run: one of the runners this project uses. */
export const looksLikeCommand = (text) => /^(?:pnpm|npm|pnpx|node|bash|git|sh)\s+\S/.test(text);

/**
 * The line indexes that sit inside a fenced code block, fences included.
 *
 * A handoff quotes as much as it writes: command output, a diff, the prompt the
 * next session is handed. A checkbox or a numbered list inside a quote is the
 * quoted document talking, not the handoff's own list, and reading it as one
 * hands the next session the previous one's leftovers. An unterminated fence
 * runs to the end, which is how markdown renders it.
 *
 * @param {string[]} lines
 * @returns {Set<number>}
 */
export function fencedLines(lines) {
  const inside = new Set();
  let open = "";

  for (const [index, line] of lines.entries()) {
    const fence = line.match(FENCE);

    if (open === "") {
      if (fence) {
        open = fence[0].trim();
        inside.add(index);
      }

      continue;
    }

    inside.add(index);

    if (fence) {
      open = "";
    }
  }

  return inside;
}

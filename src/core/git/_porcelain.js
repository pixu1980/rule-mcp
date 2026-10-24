/**
 * @module core/git/porcelain - parsing `git status --porcelain`.
 *
 * The output is two status columns per line and nothing else, so a leading
 * space carries meaning: `" M path"` is an unstaged change, `"M  path"` a
 * staged one. Reading it through a trimmed string destroys the first column of
 * the first line, which is why the caller reads the raw stdout and this module
 * never trims.
 */

/**
 * The destination of a rename/copy porcelain line, or the line itself.
 *
 * @param {string} raw
 * @returns {string}
 */
function renameTarget(raw) {
  const arrow = raw.indexOf(" -> ");

  return arrow === -1 ? raw : raw.slice(arrow + 4);
}

/**
 * Split porcelain output into staged, unstaged and untracked.
 *
 * @param {string} text
 * @returns {{ staged: Array<{ status: string, path: string }>, unstaged: Array<{ status: string, path: string }>, untracked: string[] }}
 */
export function parsePorcelain(text) {
  const staged = [];
  const unstaged = [];
  const untracked = [];

  for (const line of text.split("\n")) {
    if (!line) {
      continue;
    }

    if (line.startsWith("?? ")) {
      untracked.push(renameTarget(line.slice(3)));
      continue;
    }

    const [index, worktree] = line;
    const path = renameTarget(line.slice(3));

    if (index !== " ") {
      staged.push({ status: index, path });
    }

    if (worktree !== " ") {
      unstaged.push({ status: worktree, path });
    }
  }

  return { staged, unstaged, untracked };
}

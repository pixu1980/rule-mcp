/**
 * @module cli/setup/git-hook
 *
 * The post-commit hook block, and the text surgery that adds and removes it.
 *
 * The block is sentinel-delimited for one reason: a line-wise delete of
 * everything matching "rule-mcp" strips the `if` and its body but leaves
 * the closing `fi`, and every later commit then dies on a shell syntax
 * error. `repairOrphanFi` cleans up after any earlier uninstall that already
 * did that damage.
 */

/** Opening sentinel of the managed block. */
export const HOOK_START = "# >>> rule-mcp >>>";

/** Closing sentinel of the managed block. */
export const HOOK_END = "# <<< rule-mcp <<<";

const HOOK_BLOCK = [HOOK_START, "# auto-sync after commit", "if command -v rule-mcp >/dev/null 2>&1; then", "  rule-mcp doctor >/dev/null 2>&1 &", "fi", HOOK_END].join(
  "\n",
);

/** Whether the hook text already carries the managed block. */
export const hasHook = (text) => String(text ?? "").includes(HOOK_START);

/**
 * Append the block. A hook that does not exist yet gets a shebang; appending
 * to an existing hook must never inject a second interpreter line.
 */
export function withHook(text) {
  const existing = String(text ?? "");
  const base = existing.trim() === "" ? "#!/bin/sh\n" : `${existing.replace(/\n*$/, "")}\n`;

  return `${base}\n${HOOK_BLOCK}\n`;
}

/**
 * Drop any `fi` that has no still-open `if` above it.
 *
 * The JS port of the awk repair pass: depth counting over whole lines, which
 * is enough for hooks written by this installer and conservative enough not
 * to touch a hook that balances correctly.
 */
export function repairOrphanFi(text) {
  let depth = 0;

  return String(text ?? "")
    .split("\n")
    .filter((line) => {
      if (/^\s*if(\s|$)/.test(line)) {
        depth++;

        return true;
      }

      if (/^\s*fi\s*$/.test(line)) {
        if (depth > 0) {
          depth--;

          return true;
        }

        return false;
      }

      return true;
    })
    .join("\n");
}

/** Remove the managed block, then repair damage an older uninstall may have left. */
export function withoutHook(text) {
  const lines = String(text ?? "").split("\n");
  const kept = [];
  let inside = false;

  for (const line of lines) {
    if (!inside && line.trim() === HOOK_START) {
      inside = true;

      // The block is appended after a blank separator line; take it back out.
      if (kept.at(-1) === "") {
        kept.pop();
      }

      continue;
    }

    if (inside) {
      if (line.trim() === HOOK_END) {
        inside = false;
      }

      continue;
    }

    kept.push(line);
  }

  const remaining = repairOrphanFi(kept.join("\n"));

  return remaining.trim() === "" ? "" : `${remaining.replace(/\n*$/, "")}\n`;
}

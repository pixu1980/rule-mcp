/** @module core/text/block-spacing/fix - insert the blank lines the classification demands */

import { readFileSync, writeFileSync } from "node:fs";
import { classifyBlock, findBlocks } from "./_detect.js";

/**
 * Fix blank lines around all blocks in a file.
 */
export function fixBlockSpacing(filePath) {
  let code = readFileSync(filePath, "utf8");
  const orig = code;
  const lines = code.split("\n");

  const blocks = findBlocks(lines);

  // Sort by closeLine descending so we can insert without offset issues
  blocks.sort((a, b) => b.closeLine - a.closeLine);

  for (const block of blocks) {
    const type = classifyBlock(block, blocks, lines);

    // Check line above (blank before block opening)
    if (block.openLine > 0) {
      const previousLine = lines[block.openLine - 1];
      const previousTrimmed = previousLine.trim();
      const isNeedsAbove = type === "end" || type === "middle" || type === "start_end";

      if (
        isNeedsAbove &&
        previousTrimmed !== "" &&
        !previousTrimmed.startsWith("//") &&
        !previousTrimmed.startsWith("/*") &&
        !previousTrimmed.startsWith("*") &&
        !previousTrimmed.endsWith("{") &&
        !previousTrimmed.endsWith("(")
      ) {
        // Insert blank line before the block
        lines.splice(block.openLine, 0, "");
        // Adjust subsequent block positions since we inserted
        for (const other of blocks) {
          if (!(other.openLine >= block.openLine) || other === block) {
            continue;
          }

          other.openLine++;
          other.closeLine++;
        }

        block.closeLine++; // our block's close also moved
      }
    }

    // Check line below (blank after closing brace)
    if (block.closeLine < lines.length - 1) {
      const nextLine = lines[block.closeLine + 1];
      const nextTrimmed = nextLine.trim();
      const isNeedsBelow = type === "start" || type === "middle" || type === "start_end";

      if (
        isNeedsBelow &&
        nextTrimmed !== "" &&
        !nextTrimmed.startsWith("//") &&
        !nextTrimmed.startsWith("/*") &&
        !nextTrimmed.startsWith("*") &&
        !nextTrimmed.startsWith(")") &&
        !nextTrimmed.startsWith("]") &&
        !nextTrimmed.startsWith(",") &&
        !/^\s*(catch|else|finally|case|default)/.test(nextLine) &&
        !nextTrimmed.endsWith("{") &&
        !nextTrimmed.startsWith("(")
      ) {
        // Insert blank line after the block
        lines.splice(block.closeLine + 1, 0, "");

        for (const other of blocks) {
          if (!(other.openLine > block.closeLine)) {
            continue;
          }

          other.openLine++;
          other.closeLine++;
        }
      }
    }
  }

  // Rule: blank line between consecutive multi-line exports
  // (but NOT between single-line barrel re-exports like export { X } from '...')
  for (let index = lines.length - 1; index >= 0; index--) {
    const current = lines[index].trim();
    const next = index + 1 < lines.length ? lines[index + 1].trim() : "";

    if (next === "};") {
      continue;
    } // skip - handled by block rules
    // If current line closes a multi-line export body and next line is another export
    if (
      (current === "};" || current.startsWith("}")) &&
      next.startsWith("export ") &&
      !next.startsWith("export {") &&
      index + 1 < lines.length &&
      lines[index + 1].trim() !== ""
    ) {
      lines.splice(index + 1, 0, "");
    }
  }

  // Clean up triple+ blank lines
  const result = lines.join("\n").replaceAll(/\n{3,}/g, "\n\n");

  if (result !== orig) {
    writeFileSync(filePath, result, "utf8");

    return true;
  }

  return false;
}

/**
 * Run block spacing fixer on multiple files.
 */
export function fixBlockSpacingOnFiles(files) {
  let count = 0;

  for (const file of files) {
    try {
      if (fixBlockSpacing(file)) {
        count++;
      }
    } catch {
      // skip files that can't be read/written
    }
  }

  return count;
}

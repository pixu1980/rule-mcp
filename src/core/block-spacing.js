// ═══════════════════════════════════════════════════════════════════════════════
//  Block spacing fixer - deterministic blank-line enforcement
//  ═══════════════════════════════════════════════════════════════════════════════
//  Rules:
//    Case 1 - block at START of parent → blank line BELOW only
//    Case 2 - block at END of parent   → blank line ABOVE only
//    Case 3 - block in middle          → blank line ABOVE AND BELOW
//
//  A "block" is any {…} containing ≥2 lines of code.
//  Runs after Prettier so indentation is canonical.
//  ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from "node:fs";

/**
 * Find the indentation of a line (leading whitespace).
 */
function indentOf(line) {
  const m = line.match(/^(\s*)/);
  return m ? m[1] : "";
}

/**
 * Scan an array of lines and return the line numbers (0-indexed)
 * that are block boundaries: `if () {`, `}`, etc.
 */
function findBlocks(lines) {
  const blocks = [];
  const stack = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // eslint-disable-next-line no-unused-vars
    const trimmed = line.trim();

    // Opening brace (not including object literals like { key: val })
    if (
      /^\s*(if|for|while|switch|try|catch|finally|else\s*if|else)\s*\([^)]*\)\s*\{\s*$/.test(line) ||
      /^\s*(if|for|while|switch|try|catch|finally|else)\s*\{\s*$/.test(line) ||
      /^\s*\)\s*\{\s*$/.test(line) ||
      /^\s*=>\s*\{\s*$/.test(line) ||
      /^\s*(?:export\s+)?(?:async\s+)?function\s+(?:\w+)?\s*\([^)]*\)\s*\{\s*$/.test(line) ||
      /^\s*(?:export\s+)?(?:async\s+)?function\s*\{\s*$/.test(line) ||
      /^\s*(?:export\s+)?class\s+\w+\s*(?:extends\s+\w+)?\s*\{\s*$/.test(line) ||
      (/^\s*(?:\w+|\w+\.prototype)\s*\([^)]*\)\s*\{\s*$/.test(line) &&
        !/^\s*(if|for|while|switch)\s*\(/.test(line) &&
        !/^\s*(export|import)\s/.test(line)) ||
      /^\s*constructor\s*\([^)]*\)\s*\{\s*$/.test(line)
    ) {
      stack.push({ openLine: index, indent: indentOf(line) });
    }

    // Closing brace - pop from stack and record the block
    if (/^\s*\}\s*$/.test(line) && stack.length > 0) {
      const block = stack.pop();
      block.closeLine = index;

      // Only consider blocks with ≥1 inner code line
      const innerLines = lines
        .slice(block.openLine + 1, block.closeLine)
        .filter((l) => l.trim() !== "" && !/^\s*\/\//.test(l) && !/^\s*\/\*/.test(l));

      if (innerLines.length > 0) {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

/**
 * Determine if a block is at the start, end, or middle of its parent.
 *
 * At start: the block's opening brace is the first non-blank line
 *   after the parent's opening brace.
 * At end:   the block's closing brace is the last non-blank line
 *   before the parent's closing brace.
 * Middle:   neither.
 */
function classifyBlock(block, allBlocks, lines) {
  // Find parent block: the nearest ancestor whose openLine < block.openLine
  // and closeLine > block.closeLine
  let parent = null;
  for (const other of allBlocks) {
    if (
      other.openLine < block.openLine &&
      other.closeLine > block.closeLine &&
      (!parent || other.openLine > parent.openLine)
    ) {
      parent = other;
    }
  }

  if (!parent) {
    return "middle";
  } // no parent → toplevel → always middle

  // Check if block is at start of parent
  let isAtStart = true;
  for (let index = parent.openLine + 1; index < block.openLine; index++) {
    if (
      lines[index].trim() !== "" &&
      !lines[index].trimStart().startsWith("//") &&
      !lines[index].trimStart().startsWith("/*") &&
      !lines[index].trimStart().startsWith("*")
    ) {
      isAtStart = false;
      break;
    }
  }

  // Check if block is at end of parent
  let isAtEnd = true;
  for (let index = block.closeLine + 1; index < parent.closeLine; index++) {
    if (
      lines[index].trim() !== "" &&
      !lines[index].trimStart().startsWith("//") &&
      !lines[index].trimStart().startsWith("/*") &&
      !lines[index].trimStart().startsWith("*")
    ) {
      isAtEnd = false;
      break;
    }
  }

  if (isAtStart && isAtEnd) {
    return "start_end";
  } // only child → both
  if (isAtStart) {
    return "start";
  }
  if (isAtEnd) {
    return "end";
  }
  return "middle";
}

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

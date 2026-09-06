/** @module core/text/block-spacing/detect - find and classify the blocks of a file */

/**
 * Find the indentation of a line (leading whitespace).
 */
export function indentOf(line) {
  const m = line.match(/^(\s*)/);

  return m ? m[1] : "";
}

/**
 * Scan an array of lines and return the line numbers (0-indexed)
 * that are block boundaries: an `if` opener and its closing brace, etc.
 */
export function findBlocks(lines) {
  const blocks = [];
  const stack = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

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
export function classifyBlock(block, allBlocks, lines) {
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

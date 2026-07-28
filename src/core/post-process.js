// ═══════════════════════════════════════════════════════════════════════════════
//  Post-processing: format JS files with Prettier + blank-line rules
//  ═══════════════════════════════════════════════════════════════════════════════
//  Called after pix_apply writes files. Ensures ALL files match rule-styleguide.
//  Order: Prettier (syntax) → blank-line fixer (semantic)
//  ═══════════════════════════════════════════════════════════════════════════════

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fixBlockSpacing } from "./block-spacing.js";

/**
 * Post-process an array of written files.
 * Runs Prettier + blank-line fixer on all .js files.
 *
 * Operates on each result's real absolute path (`absPath`, set by pix_apply
 * from the resolved in-project target) — never on a path resolved against the
 * server's own source tree.
 *
 * @param {Array<{path: string, status: string, absPath?: string}>} results
 */
export function postProcessFiles(results) {
  const jsFiles = results
    .filter((r) => r.status === "written" && r.absPath && r.path.endsWith(".js"))
    .map((r) => r.absPath);

  if (jsFiles.length === 0) return;

  // Step 1: Prettier — handles quotes, semicolons, indentation, multi-line blocks.
  // execFileSync (argv, no shell) so file paths can never be interpreted as shell
  // syntax — an attacker-crafted filename cannot inject commands.
  try {
    execFileSync("pnpx", ["prettier", "--write", ...jsFiles], {
      stdio: "pipe",
      timeout: 15000,
    });
  } catch (e) {
    // Prettier may exit non-zero if it can't parse files after our changes — ignore
  }

  // Step 2: Blank-line fixer — handles semantic spacing rules
  for (const file of jsFiles) {
    fixBlankLines(file);
    fixBlockSpacing(file);
  }
}

/**
 * Fix blank-line rules that Prettier doesn't handle:
 * 1. Blank line before every `return` (unless first statement in block)
 * 2. Blank line between class methods
 * 3. Blank line after `const`/`let`/`var` declarations before next statement
 */
function fixBlankLines(filePath) {
  let code = readFileSync(filePath, "utf8");
  const orig = code;
  const lines = code.split("\n");
  const newLines = [];
  let prevLine = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Rule: blank line before return
    if (
      (trimmed.startsWith("return ") || trimmed === "return;") &&
      i > 0 &&
      prevLine !== "" &&
      !prevLine.endsWith("{") &&
      !prevLine.endsWith("(") &&
      !prevLine.startsWith("//") &&
      !prevLine.startsWith("/*") &&
      !prevLine.endsWith("?")
    ) {
      newLines.push("");
    }

    newLines.push(line);
    prevLine = line.trimEnd();
  }

  code = newLines.join("\n");

  // Rule: blank line between class methods
  code = code.replace(/^(\s*)\}\n(\s*)(\w+\s*\()/gm, "$1}\n\n$2$3");

  // Rule: blank line after const/let/var declarations before next statement
  code = code.replace(
    /((?:const|let|var)\s+\w+\s*=\s*[^;]+;)\n(\s*)([a-zA-Z])/g,
    "$1\n\n$2$3"
  );

  // Remove double blank lines
  code = code.replace(/\n{3,}/g, "\n\n");

  if (code !== orig) {
    writeFileSync(filePath, code, "utf8");
  }
}

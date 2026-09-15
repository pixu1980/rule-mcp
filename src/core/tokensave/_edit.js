

/**
 * @module core/tokensave/edit
 *
 * The edit adapter: TokenSave's write primitives first, a direct filesystem
 * write as the fallback.
 *
 * TokenSave can edit an existing file (`str_replace`) but cannot create one, so
 * a new file always takes the fallback path. The adapter decides only *how* the
 * bytes land; the caller keeps the containment check and the receipt, which is
 * the contract `rule_tool_apply` exists to enforce.
 *
 * @see module:core/tokensave/client-sync - the synchronous CLI call
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, sep } from "node:path";

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/** Project-relative, forward-slash path for the TokenSave tools. */
function relativeTo(projectDir, absolutePath) {
  return relative(projectDir, absolutePath).split(sep).join("/");
}

/** The fallback write. */
function defaultWrite(absolutePath, content) {
  writeFileSync(absolutePath, content, "utf8");
}

/**
 * Write `content` to `absolutePath`, preferring the TokenSave edit primitive.
 *
 * @param {string|null} projectDir - Project root; a null root always falls back
 * @param {string} absolutePath - Destination, already contained by the caller
 * @param {string} content - The new file content
 * @param {{ probe?: Function, client?: Function, write?: Function }} [options]
 * @returns {{ changed: boolean, source: "tokensave" | "javascript" }}
 */
export function applyEdit(projectDir, absolutePath, content, { probe = probeFilesystem, client = callToolSync, write = defaultWrite } = {}) {
  if (!projectDir || !probe(projectDir).available || !existsSync(absolutePath)) {
    write(absolutePath, content);

    return { changed: true, source: "javascript" };
  }

  const oldContent = readFileSync(absolutePath, "utf8");

  if (oldContent === content) {
    return { changed: false, source: "tokensave" };
  }

  const result = client("str_replace", { path: relativeTo(projectDir, absolutePath), old_str: oldContent, new_str: content, project_root: projectDir }, { projectDir });

  if (result.ok) {
    return { changed: true, source: "tokensave" };
  }

  write(absolutePath, content);

  return { changed: true, source: "javascript" };
}

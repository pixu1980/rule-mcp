/** The rules rule-mcp-styleguide-file-tree owns, in canonical order. */
import { barrelExportsMatchFiles } from "./_barrel-exports-match-files.js";
import { barrelFileTree } from "./_barrel-file-tree.js";
import { componentExportCheck } from "./_component-export-check.js";
import { componentFilePrefix } from "./_component-file-prefix.js";
import { componentFolderBarrel } from "./_component-folder-barrel.js";

export const GUARDRAILS = [barrelExportsMatchFiles, barrelFileTree, componentExportCheck, componentFilePrefix, componentFolderBarrel];

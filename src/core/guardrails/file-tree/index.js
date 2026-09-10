

/** File-tree guardrail family: barrel and naming rules, one per file. */
import { componentFolderBarrel } from "./_component-folder-barrel.js";
import { componentFilePrefix } from "./_component-file-prefix.js";
import { componentExportCheck } from "./_component-export-check.js";
import { barrelExportsMatchFiles } from "./_barrel-exports-match-files.js";

/** The family, in canonical order. */
export const FILE_TREE_GUARDRAILS = [componentFolderBarrel, componentFilePrefix, componentExportCheck, barrelExportsMatchFiles];

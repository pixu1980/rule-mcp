

/** @module tools/apply/tool - the rule_tool_apply registration and handler */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { postProcessFiles } from "../../core/index.js";
import { applyEdit } from "../../core/tokensave/_edit.js";
import { validateApply } from "../gateway/index.js";
import { renderApplyResult } from "./_render.js";
import { resolveProjectRoot } from "./_roots.js";
import { resolveWriteTarget } from "./_target.js";

/**
 * Register the pix_apply write tool.
 */
export async function registerApplyTool() {
  const { registerTool } = await import("../router/index.js");
  const { z } = await import("zod");

  const ApplySchema = z.object({
    files: z
      .array(
        z.object({
          path: z.string().describe("Relative file path within the project"),
          content: z.string().describe("File content to write"),
        }),
      )
      .describe("Array of files to create/write"),
    receipt: z.string().describe("Receipt token from rule_tool_gateway that validated this exact code"),
    path: z.string().optional().default(".").describe("Project root directory"),
    dryRun: z.boolean().optional().default(true).describe("Preview without writing (default: true)"),
  });

  registerTool({
    name: "rule_tool_apply",
    description:
      "Write files to disk after rule_tool_gateway validation. Requires a valid receipt from rule_tool_gateway " +
      "proving that the code passed all guardrails. The receipt is tied to the exact code hash - " +
      "modified code will be rejected. Use dryRun=true (default) to preview without writing.",
    zodSchema: ApplySchema,
    handler: async (arguments_) => {
      const { files, receipt, path: rootPath = ".", dryRun } = arguments_;
      const results = [];

      // ── Step 0: Validate the project root itself ──
      // The root is caller-supplied, so it is the first thing to distrust: a
      // root of "/" would make every destination "inside the project".
      let rootDir;
      try {
        rootDir = resolveProjectRoot(rootPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `# pix_apply: Project root REJECTED\n\n**Root:** ${rootPath}\n**Error:** ${error.message}\n\n` +
                `Pass the project directory you are working in - pix_apply never writes outside it.`,
            },
          ],
          _meta: { pixApply: { receiptValid: false, rootError: error.message, filesWritten: 0 } },
        };
      }

      // ── Step 1: Validate the receipt against the exact file set ──
      // The receipt binds (path, content) tuples when pix_gateway received
      // `files`; a content-only receipt still covers a single file.
      const receiptCheck = validateApply(receipt, files);

      if (!receiptCheck.valid) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `# pix_apply: Receipt validation FAILED\n\n**Reason:** ${receiptCheck.reason || "Invalid receipt"}\n\n` +
                `The receipt must be obtained from pix_gateway after ALL guardrails pass. ` +
                `If you modified the code after pix_gateway, run pix_gateway again with the updated code.`,
            },
          ],
          _meta: { pixApply: { receiptValid: false, reason: receiptCheck.reason, filesWritten: 0 } },
        };
      }

      // ── Step 2: Validate each file path ──
      const resolvedPaths = [];

      for (const file of files) {
        try {
          const resolved = resolveWriteTarget(rootDir, file.path);

          resolvedPaths.push({ file, resolved });
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `# pix_apply: Path validation FAILED\n\n**File:** ${file.path}\n**Error:** ${error.message}`,
              },
            ],
            _meta: { pixApply: { receiptValid: true, pathError: error.message, filesWritten: 0 } },
          };
        }
      }

      // ── Step 3: Write files (or dry-run) ──
      for (const { file, resolved } of resolvedPaths) {
        if (dryRun) {
          results.push({ path: file.path, status: "dry-run", note: "Not written (dryRun=true)" });
        } else {
          try {
            mkdirSync(dirname(resolved), { recursive: true });
            applyEdit(rootDir, resolved, file.content);
            results.push({ path: file.path, status: "written", absPath: resolved });
          } catch (error) {
            results.push({ path: file.path, status: "error", error: error.message });
          }
        }
      }

      // Post-process written files (Prettier + blank-line fixer)
      if (!dryRun) {
        try {
          postProcessFiles(results);
        } catch {
          // Post-processing is best-effort - don't block the response
        }
      }

      return renderApplyResult({ dryRun, receiptCheck, rootDir, results });
    },
  });
}

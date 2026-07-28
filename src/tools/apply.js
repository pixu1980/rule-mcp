/**
 * @module tools/apply
 *
 * pix_apply — The ONLY tool that writes files to disk.
 *
 * Requires a valid receipt from pix_gateway proving that
 * the exact code being written passed all guardrails.
 *
 * Input:  { files: [{ path, content }], receipt }
 * Output: { written: [...], receiptValid: boolean }
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { validateReceipt } from "./gateway.js";
import { postProcessFiles } from "../core/post-process.js";

/**
 * Assert that a path stays inside the project root.
 * Throws if path traversal is detected.
 */
function assertInsideProject(rootDir, targetPath) {
  const resolved = resolve(rootDir, targetPath);
  const rel = relative(rootDir, resolved);
  if (rel.startsWith("..") || rel === "") {
    throw new Error(`Path traversal blocked: "${targetPath}" escapes project root "${rootDir}".`);
  }
  return resolved;
}

/**
 * Register the pix_apply write tool.
 */
export async function registerApplyTool() {
  const { registerTool } = await import("./router.js");
  const { z } = await import("zod");

  const ApplySchema = z.object({
    files: z.array(z.object({
      path: z.string().describe("Relative file path within the project"),
      content: z.string().describe("File content to write"),
    })).describe("Array of files to create/write"),
    receipt: z.string().describe("Receipt token from pix_gateway that validated this exact code"),
    path: z.string().optional().default(".").describe("Project root directory"),
    dryRun: z.boolean().optional().default(true).describe("Preview without writing (default: true)"),
  });

  registerTool({
    name: "pix_apply",
    description:
      "Write files to disk after pix_gateway validation. Requires a valid receipt from pix_gateway " +
      "proving that the code passed all guardrails. The receipt is tied to the exact code hash — " +
      "modified code will be rejected. Use dryRun=true (default) to preview without writing.",
    zodSchema: ApplySchema,
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "Relative file path" },
              content: { type: "string", description: "File content" },
            },
            required: ["path", "content"],
          },
        },
        receipt: { type: "string", description: "Receipt from pix_gateway" },
        path: { type: "string", default: ".", description: "Project root" },
        dryRun: { type: "boolean", default: true, description: "Preview without writing" },
      },
      required: ["files", "receipt"],
    },
    handler: async (args) => {
      const { files, receipt, path: rootPath = ".", dryRun } = args;
      const rootDir = resolve(rootPath);
      const results = [];
      let allValid = true;

      // ── Step 1: Validate receipt against ALL file contents ──
      // Concatenate all file contents and validate once
      const combinedContent = files.map(f => f.content).join("\n---FILE---\n");
      const receiptCheck = validateReceipt(receipt, combinedContent);

      if (!receiptCheck.valid) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `# pix_apply: Receipt validation FAILED\n\n**Reason:** ${receiptCheck.reason || "Invalid receipt"}\n\n` +
              `The receipt must be obtained from pix_gateway after ALL guardrails pass. ` +
              `If you modified the code after pix_gateway, run pix_gateway again with the updated code.`,
          }],
          _meta: { pixApply: { receiptValid: false, reason: receiptCheck.reason, filesWritten: 0 } },
        };
      }

      // ── Step 2: Validate each file path ──
      const resolvedPaths = [];
      for (const file of files) {
        try {
          const resolved = assertInsideProject(rootDir, file.path);
          resolvedPaths.push({ file, resolved });
        } catch (err) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `# pix_apply: Path validation FAILED\n\n**File:** ${file.path}\n**Error:** ${err.message}`,
            }],
            _meta: { pixApply: { receiptValid: true, pathError: err.message, filesWritten: 0 } },
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
            writeFileSync(resolved, file.content, "utf8");
            results.push({ path: file.path, status: "written", absPath: resolved });
          } catch (err) {
            results.push({ path: file.path, status: "error", error: err.message });
            allValid = false;
          }
        }
      }

      // Post-process written files (Prettier + blank-line fixer)
      if (!dryRun) {
        try {
          postProcessFiles(results);
        } catch (e) {
          // Post-processing is best-effort — don't block the response
        }
      }

      const lines = [
        `# pix_apply: ${dryRun ? "DRY RUN (preview)" : "FILES WRITTEN"}`,
        "",
        dryRun ? "> This is a preview. Set `dryRun: false` to write files." : "",
        "",
        `Receipt: **valid** ✅`,
        `Files: ${results.length}`,
        "",
        ...results.map(r => `- ${r.status === "written" ? "✅" : r.status === "dry-run" ? "📋" : "❌"} ${r.path}${r.note ? ` (${r.note})` : ""}${r.error ? ` — ${r.error}` : ""}`),
        "",
        dryRun ? "Run again with `dryRun: false` to apply changes." : `Wrote ${results.filter(r => r.status === "written").length} files.`,
      ].filter(Boolean);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        _meta: {
          pixApply: {
            receiptValid: true,
            dryRun: !!dryRun,
            filesWritten: results.filter(r => r.status === "written").length,
            filesPreviewed: results.filter(r => r.status === "dry-run").length,
          },
        },
      };
    },
  });
}

/**
 * @module tools/apply
 *
 * pix_apply - The ONLY tool that writes files to disk.
 *
 * Requires a valid receipt from pix_gateway proving that
 * the exact code being written passed all guardrails.
 *
 * Input:  { files: [{ path, content }], receipt }
 * Output: { written: [...], receiptValid: boolean }
 */

import { writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve, relative, parse, sep, isAbsolute } from "node:path";
import { validateApply } from "./gateway.js";
import { postProcessFiles } from "../core/post-process.js";

export { canonicalFilesDigest } from "./gateway.js";

/**
 * Directories that are never a project. An earlier guard accepted any root the
 * caller named, so `path: "/"` made every destination "inside the project" and
 * the traversal check could not fail. Refusing implausible roots is what puts
 * a floor under the containment check.
 */
const SYSTEM_ROOTS = [
  "/etc",
  "/usr",
  "/bin",
  "/sbin",
  "/var",
  "/opt",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/System",
  "/Library",
  "/Applications",
  "/private/etc",
  "/private/var",
  String.raw`C:\Windows`,
  String.raw`C:\Program Files`,
];

/**
 * Path segments that are never a legitimate write destination: writing there is
 * code execution (git hooks, agent plugins) or credential theft, whatever the
 * content passed. Guardrails validate WHAT is written; this validates WHERE.
 */
const PROTECTED_SEGMENTS = new Set([".git", ".ssh", ".gnupg", ".agents", ".claude", "node_modules"]);

/** File names that are never part of a project tree. */
const PROTECTED_NAMES = new Set([
  ".zshrc",
  ".zshenv",
  ".zprofile",
  ".bashrc",
  ".bash_profile",
  ".profile",
  ".cshrc",
  ".kshrc",
  "authorized_keys",
  "known_hosts",
  "id_rsa",
  "id_ed25519",
]);

/** Resolve a path to its real location when it exists, else leave it as-is. */
const realOrSelf = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/** Is `candidate` the same path as `base`, or inside it? */
const isWithin = (candidate, base) => candidate === base || candidate.startsWith(base + sep);

/**
 * Validate and resolve the project root a write is anchored to.
 * Throws when the root is not a plausible project directory.
 *
 * @param {string} rootPath - caller-supplied project root
 * @returns {string} the resolved root
 */
export function resolveProjectRoot(rootPath) {
  const root = resolve(rootPath || ".");

  if (root === parse(root).root) {
    throw new Error(`Refused: "${root}" is the filesystem root, not a project root.`);
  }

  if (root === realOrSelf(homedir()) || root === resolve(homedir())) {
    throw new Error(`Refused: "${root}" is the home directory, not a project root.`);
  }

  // Temp directories are legitimate scaffolding targets even though they sit
  // under /var on macOS, so they are checked before the system-root denylist.
  const temporaryRoots = [resolve(tmpdir()), realOrSelf(tmpdir())];

  if (temporaryRoots.some((temporary) => isWithin(root, temporary))) {
    return root;
  }

  const real = realOrSelf(root);

  for (const system of SYSTEM_ROOTS) {
    if (isWithin(root, system) || isWithin(real, system)) {
      throw new Error(`Refused: "${root}" is a system directory, not a project root.`);
    }
  }

  return root;
}

/**
 * Resolve a single write destination inside `rootDir`.
 *
 * Rejects, in order: unusable paths, absolute paths, `..` traversal, symlinked
 * escapes (checked against the real filesystem, not by string math), and
 * destinations that grant code execution or hold credentials.
 *
 * @param {string} rootDir - already validated by resolveProjectRoot
 * @param {string} targetPath - relative path supplied by the caller
 * @returns {string} the absolute path to write
 */
export function resolveWriteTarget(rootDir, targetPath) {
  if (typeof targetPath !== "string" || targetPath.trim() === "") {
    throw new Error("Refused: empty file path.");
  }

  if (targetPath.includes("\0")) {
    throw new Error(`Refused: invalid NUL byte in path "${targetPath}".`);
  }

  if (isAbsolute(targetPath) || /^[A-Za-z]:[\\/]/.test(targetPath)) {
    throw new Error(`Refused: "${targetPath}" is an absolute path - file paths must be relative to the project root.`);
  }

  const resolved = resolve(rootDir, targetPath);
  const relativePath = relative(rootDir, resolved);

  if (relativePath === "" || relativePath.startsWith("..")) {
    throw new Error(`Path traversal blocked: "${targetPath}" escapes project root "${rootDir}".`);
  }

  // Sensitive destinations are judged on the normalized path, so "src/../.git"
  // is refused for the same reason as ".git".
  const segments = relativePath.split(sep).filter(Boolean);

  for (const segment of segments) {
    if (PROTECTED_SEGMENTS.has(segment)) {
      throw new Error(`Refused: "${targetPath}" writes into the protected directory "${segment}".`);
    }
  }

  if (PROTECTED_NAMES.has(segments.at(-1))) {
    throw new Error(`Refused: "${targetPath}" is a protected file (${segments.at(-1)}).`);
  }

  // path.resolve is string math: a symlinked directory inside the project still
  // resolves to a path that "looks" contained. Ask the filesystem instead, via
  // the deepest ancestor that actually exists.
  const realRoot = realOrSelf(rootDir);
  let ancestor = resolved;

  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);

    if (parent === ancestor) {
      break;
    }

    ancestor = parent;
  }

  if (!isWithin(realOrSelf(ancestor), realRoot)) {
    throw new Error(`Refused: "${targetPath}" escapes the project root through a symlink.`);
  }

  return resolved;
}

/**
 * Register the pix_apply write tool.
 */
export async function registerApplyTool() {
  const { registerTool } = await import("./router/index.js");
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
    receipt: z.string().describe("Receipt token from pix_gateway that validated this exact code"),
    path: z.string().optional().default(".").describe("Project root directory"),
    dryRun: z.boolean().optional().default(true).describe("Preview without writing (default: true)"),
  });

  registerTool({
    name: "rule_tool_apply",
    description:
      "Write files to disk after pix_gateway validation. Requires a valid receipt from pix_gateway " +
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
            writeFileSync(resolved, file.content, "utf8");
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

      const lines = [
        `# pix_apply: ${dryRun ? "DRY RUN (preview)" : "FILES WRITTEN"}`,
        "",
        dryRun ? "> This is a preview. Set `dryRun: false` to write files." : "",
        "",
        `Receipt: **valid** ✅ (${receiptCheck.binding === "files" ? "path-bound" : "content-only, single file"})`,
        `Root: \`${rootDir}\``,
        `Files: ${results.length}`,
        "",
        ...results.map(
          (r) =>
            `- ${r.status === "written" ? "✅" : r.status === "dry-run" ? "📋" : "❌"} ${r.path}${r.note ? ` (${r.note})` : ""}${r.error ? ` - ${r.error}` : ""}`,
        ),
        "",
        dryRun
          ? "Run again with `dryRun: false` to apply changes."
          : `Wrote ${results.filter((r) => r.status === "written").length} files.`,
      ].filter(Boolean);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        _meta: {
          pixApply: {
            receiptValid: true,
            receiptBinding: receiptCheck.binding,
            root: rootDir,
            dryRun: !!dryRun,
            filesWritten: results.filter((r) => r.status === "written").length,
            filesPreviewed: results.filter((r) => r.status === "dry-run").length,
          },
        },
      };
    },
  });
}

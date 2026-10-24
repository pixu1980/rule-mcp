

/** @module tools/fix/generate - mode=generate: create a component file tree */
import { errorResult } from "../../shared/index.js";
/** @module tools/fix/generate - mode=generate: create a component file tree */

/**
 * Handle mode=generate.
 *
 * @param {object} arguments_
 * @returns {Promise<object>} an MCP tool result
 */
export async function generateMode(arguments_) {
  const { generateComponentFiles } = await import("../../core/file-tree/index.js");
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname, resolve, relative } = await import("node:path");

  if (!arguments_.name) {
    return errorResult("mode=generate requires a `name` argument (PascalCase).");
  }

  const isDryRun = arguments_.dryRun !== false;
  const rootDir = resolve(arguments_.path || ".");
  const baseDir = arguments_.baseDir || "src/components";

  // Validate: no path traversal in name or baseDir
  const sanitizedBase = relative(rootDir, resolve(rootDir, baseDir));

  if (sanitizedBase.startsWith("..") || sanitizedBase === "") {
    return errorResult(`baseDir "${baseDir}" escapes project root "${rootDir}". Refusing to generate.`);
  }

  const files = generateComponentFiles({
    name: arguments_.name,
    framework: arguments_.framework || "vanilla",
    baseDir,
  });

  const preview = [];

  for (const file of files) {
    const fullPath = resolve(rootDir, file.path);
    // Block path traversal: resolved path must stay inside rootDir
    const rel = relative(rootDir, fullPath);

    if (rel.startsWith("..") || rel === "") {
      preview.push(`${file.path} - BLOCKED: path escapes project root`);
      continue;
    }

    if (isDryRun) {
      preview.push(`${file.path} (dry-run, not written)`);
      continue;
    }

    try {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content, "utf8");
      preview.push(file.path);
    } catch (error) {
      preview.push(`${file.path} - ERROR: ${error.message}`);
    }
  }

  const lines = [
    `# rule_tool_fix: Generated ${arguments_.name}`,
    "",
    isDryRun ? "> This is a preview. Run with `dryRun=false` to write files." : "",
    "",
    `${isDryRun ? "Would create" : "Created"} ${preview.length} files:`,
    "",
    ...preview.map((p) => `  ✓ ${p}`),
    "",
    "File tree:",
    `  ${baseDir}/${arguments_.name}/`,
    ...files.map((f) => `    ${f.path.split("/").pop()}`).filter(Boolean),
  ].filter(Boolean);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

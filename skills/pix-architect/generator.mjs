// pix-architect generator — .context/ file generation engine
// Pure logic, no DOM, no server. Used by both pix-architect-cli and pix-architect-web.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_PATH = join(__dirname, "templates.json");

/**
 * Generate .context/ files from wizard answers + wizard-spec.
 * @param {object} answers  - collected field values
 * @param {object} spec     - wizard-spec.json content
 * @param {string} targetDir - output directory
 * @returns {{ files: Array<{path, content, filled, unfilled}>, target: string }}
 */
export function generateContext(answers, spec, targetDir) {
  // Resolve templates.json relative to this module (pix-architect/ directory)
  const templatesPath = TEMPLATES_PATH;
  if (!existsSync(templatesPath)) throw new Error("templates.json not found at " + templatesPath);
  const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));

  const ctxDir = join(targetDir, ".context");
  mkdirSync(ctxDir, { recursive: true });

  const generated = [];
  for (const tmpl of templates) {
    let content = tmpl.content;
    let filledCount = 0;
    let unfilledCount = 0;

    for (const [key, val] of Object.entries(answers)) {
      const placeholder = `[${key}]`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, val || "");
        filledCount++;
      }
    }

    content = content.replace(/\[([A-Z_0-9]+)\]/g, (match) => {
      unfilledCount++;
      return `**${match}**`;
    });

    const outPath = tmpl.output || tmpl.path.replace(/^templates\//, "");
    const fullPath = join(ctxDir, outPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");

    generated.push({ path: outPath, content, filled: filledCount, unfilled: unfilledCount });
  }

  return { files: generated, target: ctxDir };
}

/**
 * Generate .context/ file contents in-memory (no disk write).
 * @returns {Array<{path, content, filled, unfilled}>}
 */
export function generateContextContent(answers, spec) {
  // Resolve templates.json relative to this module (pix-architect/ directory)
  const templatesPath = TEMPLATES_PATH;
  if (!existsSync(templatesPath)) throw new Error("templates.json not found at " + templatesPath);
  const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));

  return templates.map(tmpl => {
    let content = tmpl.content;
    let filledCount = 0;
    let unfilledCount = 0;

    for (const [key, val] of Object.entries(answers)) {
      const placeholder = `[${key}]`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, val || "");
        filledCount++;
      }
    }

    content = content.replace(/\[([A-Z_0-9]+)\]/g, (match) => {
      unfilledCount++;
      return `**${match}**`;
    });

    const outPath = tmpl.output || tmpl.path.replace(/^templates\//, "");
    return { path: outPath, content, filled: filledCount, unfilled: unfilledCount };
  });
}

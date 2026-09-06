import { readdirSync, writeFileSync } from "node:fs";
import { join, extname, basename, dirname, parse } from "node:path";
import { COMPONENT_EXTENSIONS, isBarrelFile } from "./_conventions.js";

/** The `_PascalCase` component names present among a directory's files. */
function componentExportsIn(files) {
  const names = [];

  for (const file of files) {
    const componentMatch = file.name.match(/^_([A-Z][a-zA-Z0-9]*)\.\w+$/);

    if (componentMatch) {
      names.push(componentMatch[1]);
    }
  }

  return names;
}

/** The barrel header every generated index.js starts with. */
function barrelHeader(folderName) {
  return `/**\n * @module ${folderName}\n * @description Component barrel\n */\n\n`;
}

/**
 * Fix phase 2: create the missing barrel files, re-exporting what the folder holds.
 *
 * @param {import("./_conventions.js").FileTreeIssue[]} issues
 * @param {boolean} isDryRun
 * @param {Array<{ path: string, action: string }>} fixed - appended in place
 * @param {Array<{ path: string, error: string }>} errors - appended in place
 */
export function createMissingBarrels(issues, isDryRun, fixed, errors) {
  for (const issue of issues) {
    if (!(issue.type === "missing-barrel" && issue.fixable)) {
      continue;
    }

    const dir = issue.path;
    const folderName = basename(dir);

    let entries;

    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      errors.push({ path: dir, error: `Cannot read directory: ${error.message}` });
      continue;
    }

    const files = entries.filter((e) => e.isFile());
    const componentExports = componentExportsIn(files);

    let barrelContent;

    if (componentExports.length > 0) {
      const esm = componentExports.map((c) => `export { ${c} } from './_${c}';\n`).join("");

      barrelContent = `${barrelHeader(folderName)}${esm}`;
    } else {
      // No underscore-prefixed files found; try to build from what's available
      const jsFiles = files.filter((f) => COMPONENT_EXTENSIONS.has(extname(f.name)) && !isBarrelFile(f.name));

      if (jsFiles.length > 0) {
        const firstFile = parse(jsFiles[0].name).name;
        const componentName = firstFile.startsWith("_") ? firstFile.slice(1) : firstFile;

        barrelContent = `${barrelHeader(folderName)}export { ${componentName} } from './_${componentName}';\n`;
      } else {
        barrelContent = barrelHeader(folderName);
      }
    }

    const barrelPath = join(dir, "index.js");

    if (isDryRun) {
      fixed.push({ path: barrelPath, action: `[DRY RUN] Create index.js` });
    } else {
      try {
        writeFileSync(barrelPath, barrelContent, "utf8");
        fixed.push({ path: barrelPath, action: "Created index.js" });
      } catch (error) {
        errors.push({ path: barrelPath, error: `Cannot write: ${error.message}` });
      }
    }
  }
}

/**
 * Fix phase 3: populate empty barrels from the components beside them.
 *
 * @param {import("./_conventions.js").FileTreeIssue[]} issues
 * @param {boolean} isDryRun
 * @param {Array<{ path: string, action: string }>} fixed - appended in place
 * @param {Array<{ path: string, error: string }>} errors - appended in place
 */
export function populateEmptyBarrels(issues, isDryRun, fixed, errors) {
  for (const issue of issues) {
    if (!(issue.type === "empty-barrel" && issue.fixable)) {
      continue;
    }

    const dir = dirname(issue.path);
    const folderName = basename(dir);

    let entries;

    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const componentExports = componentExportsIn(entries.filter((e) => e.isFile()));

    if (componentExports.length === 0) {
      continue;
    }

    const content = componentExports.map((c) => `export { ${c} } from './_${c}';\n`).join("");

    if (isDryRun) {
      fixed.push({ path: issue.path, action: "[DRY RUN] Populate barrel with exports" });
    } else {
      try {
        writeFileSync(issue.path, `${barrelHeader(folderName)}${content}`, "utf8");
        fixed.push({ path: issue.path, action: "Populated barrel with exports" });
      } catch (error) {
        errors.push({ path: issue.path, error: error.message });
      }
    }
  }
}

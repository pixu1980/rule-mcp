import { readFileSync } from "node:fs";
import { join, extname, parse } from "node:path";
import { COMPONENT_EXTENSIONS, isBarrelFile, isPrefixedComponent, isBareComponent } from "./_conventions.js";

/** Barrel presence and underscore prefixes inside one component folder. */
export function componentFolderIssues(files, currentPath, dirName) {
  const issues = [];
  const hasBarrel = files.some((f) => isBarrelFile(f.name));
  const componentFiles = files.filter((f) => COMPONENT_EXTENSIONS.has(extname(f.name)) && !isBarrelFile(f.name));

  if (!hasBarrel && componentFiles.length > 0) {
    issues.push({
      type: "missing-barrel",
      path: currentPath,
      message: `Component folder "${dirName}" is missing an index.js barrel file.`,
      fixable: true,
      fixAction: `Create index.js re-exporting all components`,
      suggestion: `Create ${join(currentPath, "index.js")} with:\nexport { ${dirName} } from './_${dirName}.js';`,
    });
  }

  for (const file of componentFiles) {
    if (isPrefixedComponent(file.name)) {
      continue;
    }

    const correctName = `_${file.name}`;

    issues.push({
      type: "wrong-prefix",
      path: join(currentPath, file.name),
      message: `Component file "${file.name}" should be prefixed with underscore: "${correctName}".`,
      fixable: true,
      fixAction: `Rename to ${correctName}`,
      suggestion: `Rename "${file.name}" to "${correctName}".`,
    });
  }

  return issues;
}

/** Component-looking files sitting outside any PascalCase component folder. */
export function bareFileIssues(files, currentPath) {
  const issues = [];

  for (const file of files) {
    if (isBareComponent(file.name)) {
      issues.push({
        type: "bare-file",
        path: join(currentPath, file.name),
        message: `Bare component file "${file.name}" is not inside a PascalCase component folder.`,
        fixable: true,
        fixAction: `Create folder and move file, or add underscore prefix if it's a utility`,
        suggestion: `Create a PascalCase folder and move "${file.name}" inside it, renaming to "_${file.name}".`,
      });
    }
  }

  return issues;
}

/** Underscore-prefixed stylesheets with no matching component file. */
export function orphanCssIssues(files, currentPath) {
  const issues = [];

  for (const css of files.filter((f) => extname(f.name) === ".css")) {
    if (!css.name.startsWith("_")) {
      continue;
    }

    const baseName = css.name.replace(extname(css.name), "");
    const matchingComponent = files.some((f) => parse(f.name).name === baseName && f.name !== css.name);

    if (!matchingComponent) {
      issues.push({
        type: "orphan-css",
        path: join(currentPath, css.name),
        message: `Orphan CSS file "${css.name}" has no matching component file.`,
        fixable: false,
        suggestion: `Remove "${css.name}" or create the matching component file.`,
      });
    }
  }

  return issues;
}

/** Barrels that are empty or export nothing. */
export function staleBarrelIssues(files, currentPath) {
  const issues = [];

  for (const file of files) {
    if (!isBarrelFile(file.name)) {
      continue;
    }

    const fullPath = join(currentPath, file.name);

    try {
      const content = readFileSync(fullPath, "utf8").trim();

      if (content.length === 0) {
        issues.push({
          type: "empty-barrel",
          path: fullPath,
          message: `Barrel file "${file.name}" is empty. It should re-export components.`,
          fixable: true,
          fixAction: `Add re-export statements based on sibling files`,
          suggestion: `Add export statements to ${fullPath}.`,
        });
      } else if (!content.includes("export ") && !content.includes("module.exports")) {
        issues.push({
          type: "empty-barrel",
          path: fullPath,
          message: `Barrel file "${file.name}" has no exports.`,
          fixable: true,
          fixAction: `Add re-export statements`,
          suggestion: `Add export { ... } from '...' or export * from '...' to ${fullPath}.`,
        });
      }
    } catch {
      // skip unreadable
    }
  }

  return issues;
}

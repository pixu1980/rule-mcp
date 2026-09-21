// @ts-check

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildComponentFiles } from "./_build.mjs";
import { copyTree, fileExists, findExistingDecorator } from "./_fs.mjs";
import { SHARED_PACKAGE_FILES, SHARED_PACKAGE_NAME, SHARED_SOURCES } from "./_shared.mjs";

/**
 * @typedef {import("./_args.mjs").ScaffoldOptions} ScaffoldOptions
 */

/**
 * @typedef {{
 *   componentDir: string;
 *   sharedLibraryPath: string;
 *   sharedLibraryInstalled: boolean;
 *   sharedImportPath: string;
 *   writtenFiles: string[];
 *   dryRun: boolean;
 *   nextSteps: string[];
 * }} ScaffoldResult
 */

/**
 * @param {ScaffoldOptions} options
 * @returns {Promise<ScaffoldResult>}
 */
export const scaffoldComponent = async (options) => {
  const targetRoot = path.resolve(options.target);
  const componentDir = path.join(targetRoot, options.componentsDir, options.name);

  // 1. resolve shared library - find existing or install
  let sharedLibraryPath = await findExistingDecorator(targetRoot);
  let sharedLibraryInstalled = false;
  /** @type {string[]} */
  const sharedWritten = [];

  if (sharedLibraryPath) {
    // sharedLibraryPath points at the decorator dir; the library root is its parent
    sharedLibraryPath = path.dirname(sharedLibraryPath);
  } else if (options.installShared) {
    sharedLibraryPath = path.join(targetRoot, options.sharedDir);

    if (!options.dryRun) {
      for (const source of SHARED_SOURCES) {
        if (source.optional && !(await fileExists(source.sourceRoot))) continue;
        const dest = path.join(sharedLibraryPath, source.targetFolder);
        const written = await copyTree(source.sourceRoot, dest, options.force, source.skipEntries);
        sharedWritten.push(...written);
      }

      for (const [relativePath, content] of Object.entries(SHARED_PACKAGE_FILES)) {
        const targetPath = path.join(sharedLibraryPath, relativePath);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, "utf8");
        sharedWritten.push(targetPath);
      }
    } else {
      for (const source of SHARED_SOURCES) {
        sharedWritten.push(path.join(sharedLibraryPath, source.targetFolder, "<copied>"));
      }

      for (const relativePath of Object.keys(SHARED_PACKAGE_FILES)) {
        sharedWritten.push(path.join(sharedLibraryPath, relativePath));
      }
    }

    sharedLibraryInstalled = true;
  } else {
    throw new Error(
      [
        "No existing `componentDecorator` found in the project.",
        "Re-run with `--install-shared` to install the shared library once at",
        `\`${path.join(options.sharedDir)}\` (override with --shared-dir).`,
      ].join(" "),
    );
  }

  const componentEntryFile = path.join(componentDir, `${options.tag}.js`);
  const sharedImportPath = SHARED_PACKAGE_NAME;

  // template-engine tagged runtime is present only when the sibling
  // rule-template-engine skill was installed into the shared library.
  const hasTemplateEngine = await fileExists(path.join(sharedLibraryPath, "template-engine", "index.js"));

  // 2. build component files
  const files = buildComponentFiles(options, sharedImportPath, hasTemplateEngine);

  // 3. conflict detection
  if (!options.force) {
    for (const relPath of Object.keys(files)) {
      const abs = path.join(componentDir, relPath);
      if (await fileExists(abs)) {
        throw new Error(`Refusing to overwrite ${abs} without --force.`);
      }
    }
  }

  // 4. write files
  /** @type {string[]} */
  const componentWritten = [];

  if (!options.dryRun) {
    for (const [relPath, content] of Object.entries(files)) {
      const abs = path.join(componentDir, relPath);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
      componentWritten.push(abs);
    }
  } else {
    for (const relPath of Object.keys(files)) {
      componentWritten.push(path.join(componentDir, relPath));
    }
  }

  return {
    componentDir,
    sharedLibraryPath,
    sharedLibraryInstalled,
    sharedImportPath,
    writtenFiles: [...sharedWritten, ...componentWritten],
    dryRun: options.dryRun,
    nextSteps: [
      `Import the component module from your app entry: import '${path.relative(targetRoot, componentEntryFile).split(path.sep).join("/")}';`,
      sharedLibraryInstalled
        ? 'Confirm the bundler resolves component CSS imports as raw text (for esbuild use `loader: { ".css": "text", ".svg": "text" }`).'
        : "Reusing existing shared library - no bundler change needed.",
      options.extendsElement
        ? `Customized built-ins (\`is="${options.tag}"\`) require the @ungap/custom-elements polyfill on Safari.`
        : "Autonomous element - no Safari polyfill needed.",
    ],
  };
};

// @ts-check

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { DECORATOR_MARKER } from "./_shared.mjs";

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export const fileExists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Walk `root` looking for any JS/MJS file that declares
 * `export function componentDecorator`. Returns the path of its containing folder
 * (i.e. the `decorator/` directory), or null when nothing is found.
 *
 * @param {string} root
 * @returns {Promise<string | null>}
 */
export const findExistingDecorator = async (root) => {
  /** @type {string[]} */
  const skipDirs = ["node_modules", "dist", "build", ".git", ".next", ".parcel-cache"];

  /** @param {string} dir */
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) continue;
        const found = await walk(path.join(dir, entry.name));
        if (found) return found;
        continue;
      }

      if (!entry.isFile()) continue;
      if (!/\.m?js$/.test(entry.name)) continue;

      const filePath = path.join(dir, entry.name);
      const content = await readFile(filePath, "utf8").catch(() => "");
      if (content.includes(DECORATOR_MARKER)) {
        return path.dirname(filePath);
      }
    }

    return null;
  };

  return walk(root);
};

/**
 * Recursively copy a directory tree to a target path.
 *
 * @param {string} sourceRoot
 * @param {string} targetRoot
 * @param {boolean} force
 * @param {string[]} [skipEntries=[]]
 * @returns {Promise<string[]>} list of files written
 */
export const copyTree = async (sourceRoot, targetRoot, force, skipEntries = []) => {
  /** @type {string[]} */
  const written = [];

  /**
   * @param {string} src
   * @param {string} dest
   */
  const copy = async (src, dest) => {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      if (skipEntries.includes(entry.name)) continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copy(srcPath, destPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const exists = await fileExists(destPath);
      if (exists && !force) {
        throw new Error(`Refusing to overwrite ${destPath} without --force.`);
      }

      const content = await readFile(srcPath, "utf8");
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, content, "utf8");
      written.push(destPath);
    }
  };

  await copy(sourceRoot, targetRoot);
  return written;
};

// @ts-check

import path from "node:path";
import { fileURLToPath } from "node:url";

// Same root the former monolith used: the scripts/ directory.
export const SKILL_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SHARED_SOURCE_ROOT = path.join(SKILL_ROOT, "..", "examples"); // decorator/ and events/ subfolders
export const SHARED_PACKAGE_NAME = "@pix-galaxy/pix-core";

export const DEFAULTS = {
  target: process.cwd(),
  componentsDir: "src/components",
  sharedDir: "packages/pix-core",
  installShared: false,
  force: false,
  dryRun: false,
};

export const SHARED_SOURCES = [
  { sourceRoot: path.join(SHARED_SOURCE_ROOT, "decorator"), targetFolder: "decorator", skipEntries: [] },
  { sourceRoot: path.join(SHARED_SOURCE_ROOT, "events"), targetFolder: "events", skipEntries: [] },
  // Template-engine tagged runtime is installed when the sibling
  // pix-template-engine skill is present; otherwise it is skipped.
  {
    sourceRoot: path.resolve(SKILL_ROOT, "..", "..", "pix-template-engine", "assets", "tagged-runtime"),
    targetFolder: "template-engine",
    skipEntries: [],
    optional: true,
  },
];

export const DECORATOR_MARKER = "export function componentDecorator";

export const SHARED_PACKAGE_FILES = Object.freeze({
  "package.json": `${JSON.stringify(
    {
      name: SHARED_PACKAGE_NAME,
      private: true,
      type: "module",
      exports: {
        "./decorator/index.js": "./decorator/index.js",
        "./events/index.js": "./events/index.js",
        "./template-engine/index.js": "./template-engine/index.js",
      },
    },
    null,
    2,
  )}\n`,
  "README.md": "# @pix-galaxy/pix-core\n\nShared runtime helpers for pix-galaxy component packages.\n",
});

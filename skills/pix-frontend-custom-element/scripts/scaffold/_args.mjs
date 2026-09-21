// @ts-check

import path from "node:path";

import { DEFAULTS } from "./_shared.mjs";

/**
 * @typedef {{
 *   target: string;
 *   name: string;
 *   tag: string;
 *   componentsDir: string;
 *   sharedDir: string;
 *   extendsElement: string;
 *   attributes: string[];
 *   events: string[];
 *   installShared: boolean;
 *   force: boolean;
 *   dryRun: boolean;
 * }} ScaffoldOptions
 */

/**
 * Read a CLI flag value (`--flag value`) with a fallback.
 *
 * @param {string[]} argv
 * @param {string} flag
 * @param {string} fallback
 * @returns {string}
 */
const getArg = (argv, flag, fallback = "") => {
  const index = argv.findIndex((entry) => entry === flag);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
};

/**
 * Parse a comma-separated list, stripping whitespace and empty entries.
 *
 * @param {string} raw
 * @returns {string[]}
 */
const parseList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

/**
 * @param {string} str
 * @returns {string}
 */
const toKebabCase = (str) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/**
 * @param {string} str
 * @returns {string}
 */
const toPascalCase = (str) =>
  str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/**
 * Validate and normalise a class name into its custom-element tag.
 *
 * @param {string} name
 * @returns {{ name: string, tag: string }}
 */
const resolveName = (name) => {
  if (!name) {
    throw new Error('Missing required --name flag (PascalCase, e.g. "PixCard").');
  }

  const pascal = toPascalCase(name);
  const tag = toKebabCase(pascal);

  if (!tag.includes("-")) {
    throw new Error(
      `Class name "${name}" produces tag "${tag}" without a hyphen. Custom element names must contain a hyphen - use a class with at least two PascalCase words (e.g. "PixCard").`,
    );
  }

  return { name: pascal, tag };
};

/**
 * @param {string[]} argv
 * @returns {ScaffoldOptions}
 */
export const parseArgs = (argv) => {
  const tagFlag = getArg(argv, "--tag", "");
  const { name, tag: defaultTag } = resolveName(getArg(argv, "--name", ""));

  return {
    target: path.resolve(getArg(argv, "--target", DEFAULTS.target)),
    name,
    tag: tagFlag || defaultTag,
    componentsDir: getArg(argv, "--components-dir", DEFAULTS.componentsDir),
    sharedDir: getArg(argv, "--shared-dir", DEFAULTS.sharedDir),
    extendsElement: getArg(argv, "--extends", ""),
    attributes: parseList(getArg(argv, "--attributes", "")),
    events: parseList(getArg(argv, "--events", "")),
    installShared: argv.includes("--install-shared"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
};

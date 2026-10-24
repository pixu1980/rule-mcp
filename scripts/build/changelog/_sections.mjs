/** @module scripts/build/changelog/sections - the Keep a Changelog mapping */

/**
 * Which Keep a Changelog section each conventional type belongs to.
 *
 * `null` means the type is deliberately not an entry: a reader installing this
 * package gains nothing from a dependency bump or a test being added, and a
 * changelog that lists everything is one nobody reads.
 */
export const SECTION_FOR_TYPE = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  docs: "Documentation",
  revert: "Removed",
  style: null,
  test: null,
  chore: null,
  build: null,
  ci: null,
};

/** The order sections appear in, when present. */
export const SECTION_ORDER = ["Added", "Changed", "Fixed", "Removed", "Documentation"];

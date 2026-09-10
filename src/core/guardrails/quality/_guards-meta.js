

/** TypeScript and manifest-policy helpers consulted by the quality checks. */
export { TS_EXTENSION, TS_SYNTAX, isTypeScriptFile as isTypeScript } from "../../../shared/index.js";

/** Strip strings, template literals and comments so prose never trips a rule. */
function stripLiterals(code) {
  return code
    .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
    .replaceAll(/\/\/[^\n]*/g, " ")
    .replaceAll(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replaceAll(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replaceAll(/`(?:[^`\\]|\\.)*`/g, "``");
}

// ─── Manifest helpers (the pkg-* rules) ───

/** A manifest, wherever it sits in a workspace. */
const MANIFEST_FILE = /(?:^|\/)package\.json$/;

/** The groups that describe an install. `peerDependencies` deliberately absent. */
const INSTALLED_GROUPS = ["dependencies", "devDependencies", "optionalDependencies"];

/** Specifiers that name a source rather than a range: protocol, path, repository. */
const NOT_A_RANGE = /^(?:workspace:|catalog:|file:|link:|portal:|git\+|git:|github:|gitlab:|bitbucket:|https?:)/;

/** One version and no room to resolve a different one. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

/**
 * The parsed manifest, or undefined when this is not one. Unparseable JSON is
 * undefined too: a guardrail is not a linter for syntax it cannot read, and
 * reporting a range in a file with no ranges would be a false positive.
 */
function manifestOf(code, context) {
  if (!MANIFEST_FILE.test(context?.fileName ?? "")) {
    return;
  }

  try {
    const parsed = JSON.parse(code);

    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return;
  }
}

/**
 * Whether a specifier can resolve to only one version.
 */
function isPinned(spec) {
  // An alias still installs a version, so the version still has to be exact.
  if (spec.startsWith("npm:")) {
    return EXACT_VERSION.test(spec.slice(spec.lastIndexOf("@") + 1));
  }

  if (NOT_A_RANGE.test(spec)) {
    return true;
  }

  return EXACT_VERSION.test(spec);
}

// ─── Quality guardrails (every skill) ───
// TypeScript strictness, the fingerprint family, manifest hygiene, simplicity
// rules, flex-first layout and comment hygiene. Mirrors the upstream SHARED
// composition: these run everywhere.

export { stripLiterals, MANIFEST_FILE, INSTALLED_GROUPS, NOT_A_RANGE, EXACT_VERSION, manifestOf, isPinned };

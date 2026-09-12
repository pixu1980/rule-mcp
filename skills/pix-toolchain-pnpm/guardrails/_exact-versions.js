import { INSTALLED_GROUPS, isPinned, manifestOf } from "../../../src/core/guardrails/quality/_guards-meta.js";

/** Guardrail `pkg-exact-versions`: Dependencies are pinned exactly */
export const pkgExactVersions = {
  id: "pkg-exact-versions",
  label: "Dependencies are pinned exactly",
  description:
    "Every dependency, devDependency and optionalDependency is an exact version: no ^, ~, comparator, alternation, wildcard, x-range or dist-tag. A range leaves the subdependency tree free to change between two installs of the same commit. peerDependencies are exempt: a peer range states compatibility, it does not install anything.",
  check: (code, context) => {
    const manifest = manifestOf(code, context);

    if (!manifest) {
      return { pass: true, note: "Not a package.json, skipping" };
    }

    const ranged = [];

    for (const group of INSTALLED_GROUPS) {
      const entries = manifest[group];

      if (!entries || typeof entries !== "object") {
        continue;
      }

      for (const [name, spec] of Object.entries(entries)) {
        if (typeof spec !== "string" || isPinned(spec)) {
          continue;
        }

        ranged.push(`${group}.${name}: "${spec}"`);
      }
    }

    return {
      pass: ranged.length === 0,
      failCount: ranged.length,
      detail: ranged.slice(0, 10),
      suggestion:
        "Pin each one to the version currently installed (`pnpm add --save-exact <pkg>`), and put `save-exact=true` in .npmrc so the next install does not reintroduce the range.",
    };
  },
};

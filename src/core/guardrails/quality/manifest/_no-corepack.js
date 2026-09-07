import { manifestOf } from "../_guards-meta.js";

/** Guardrail `pkg-no-corepack`: No corepack activation fields */
export const pkgNoCorepack = {
  id: "pkg-no-corepack",
  label: "No corepack activation fields",
  description:
    "No `packageManager` field and no `devEngines.packageManager`. Both hand control of the install to corepack, which can then refuse it - offline, behind a proxy, or shadowing the package manager already installed. `engines` stays legal: it asserts a version, it does not fetch one.",
  check: (code, context) => {
    const manifest = manifestOf(code, context);

    if (!manifest) {
      return { pass: true, note: "Not a package.json, skipping" };
    }

    const offenders = [];

    if (manifest.packageManager !== undefined) {
      offenders.push(`packageManager: ${JSON.stringify(manifest.packageManager)}`);
    }

    if (manifest.devEngines?.packageManager !== undefined) {
      offenders.push("devEngines.packageManager");
    }

    return {
      pass: offenders.length === 0,
      failCount: offenders.length,
      detail: offenders,
      suggestion: "Delete the field. Pin Node with .nvmrc and the dependency tree with the lockfile; state the package manager in the README if a human needs to know.",
    };
  },
};

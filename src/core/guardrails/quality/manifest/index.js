

/** Package-manifest guardrails, one rule per file. */
import { pkgExactVersions } from "./_exact-versions.js";
import { pkgNoCorepack } from "./_no-corepack.js";

export const MANIFEST_GUARDRAILS = [pkgExactVersions, pkgNoCorepack];

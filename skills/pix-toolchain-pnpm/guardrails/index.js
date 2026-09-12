/** The rules rule-toolchain-pnpm owns, in canonical order. */
import { pkgExactVersions } from "./_exact-versions.js";
import { pkgNoCorepack } from "./_no-corepack.js";
import { verifiedDependenciesOnly } from "./_verified-dependencies-only.js";

export const GUARDRAILS = [pkgExactVersions, pkgNoCorepack, verifiedDependenciesOnly];

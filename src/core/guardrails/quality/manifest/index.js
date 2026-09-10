// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Package-manifest guardrails, one rule per file. */
import { pkgExactVersions } from "./_exact-versions.js";
import { pkgNoCorepack } from "./_no-corepack.js";

export const MANIFEST_GUARDRAILS = [pkgExactVersions, pkgNoCorepack];

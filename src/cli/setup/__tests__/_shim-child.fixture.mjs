// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * Child entry for the starved-environment shim test.
 *
 * The parent spawns this file with an empty PATH and no PNPM_HOME, so the
 * pnpm lookup fails and globalBinDir falls back to the platform default.
 * Kept out of process on purpose: PATH surgery must never leak into the suite.
 */
const { globalBinDir } = await import("../_shim.js");

process.stdout.write(`${JSON.stringify({ bin: globalBinDir() })}\n`);

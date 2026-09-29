// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module core/release
 *
 * Release-tooling discovery for `/pix-init` (WS7.1).
 *
 * The plan's rule here is reuse, not installation: a project that already has a
 * changelog generator, a version script or a release workflow keeps it, and the
 * first step is to say what is there.
 */

export * from "./_detect.js";

// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module tools/ai
 *
 * pix routing tool - analyzes prompts and routes to the best pix skill.
 * Uses BM25 plus name/tag affinity with domain and framework biasing,
 * one concern per file (ADR 058).
 */

export * from "./_register.js";

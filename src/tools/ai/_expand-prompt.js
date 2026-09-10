// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
import { MULTILINGUAL_ALIASES } from "./_aliases.data.js";

/** Expand prompt with matching multilingual aliases. */
export function expandPrompt(prompt) {
  const lower = prompt.toLowerCase();
  const aliases = [];

  for (const [native, en] of Object.entries(MULTILINGUAL_ALIASES)) {
    if (lower.includes(native)) {
      aliases.push(en);
    }
  }

  return aliases.length > 0 ? prompt + " " + aliases.join(" ") : prompt;
}

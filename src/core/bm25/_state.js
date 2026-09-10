// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Shared in-memory index state (built by build.js, restored/persisted by cache.js). */

export let _index = null;

export function setIndex(value) {
  _index = value;
}

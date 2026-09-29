

/**
 * @module core/history/documents-refs
 *
 * Reading a tree of numbered documents, and the documents a text names -
 * by path (`docs/adr/124-x.md`) or by number (`ADR 124`, `ADR 124 to 126`).
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import { ADR_DIR } from "../../tools/adr/index.js";

const PATH_REFERENCE = /docs\/(?:adr|handoff)\/[\w.-]+\.md/gu;
const ADR_NUMBER = /\bADRs?\s+(\d{3})(?:\s*(?:,|e|and|-|to|through)\s*(\d{3}))?/gu;

/** The numbered filenames in one tree, sorted. */
export function numberedFilenames(projectDir, dir, pattern) {
  try {
    return readdirSync(join(projectDir, dir))
      .filter((name) => pattern.test(name))
      .sort();
  } catch {
    return [];
  }
}

/** The document paths a text cites, by path or by ADR number. */
export function references(text, adrPaths) {
  const found = new Set();

  for (const match of String(text).matchAll(PATH_REFERENCE)) {
    found.add(match[0]);
  }

  for (const match of String(text).matchAll(ADR_NUMBER)) {
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;

    for (let number = from; number <= to && number - from < 50; number += 1) {
      const prefix = `${String(number).padStart(3, "0")}-`;

      for (const path of adrPaths) {
        if (path.slice(ADR_DIR.length + 1).startsWith(prefix)) {
          found.add(path);
        }
      }
    }
  }

  return [...found];
}

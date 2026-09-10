

/**
 * @module test/skills-docs
 *
 * Documentation quality checks for rule AI skill corpus.
 * Keeps skills portable across LLM clients by enforcing consistent metadata,
 * resolvable cross-references, and no accidental concatenated skill documents.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const root = join(__dirname, "..", "..", "..", "..");
export const skillsRoot = join(root, "skills");

/** Read one skill's SKILL.md. */
export const skillDoc = (name) => readFileSync(join(skillsRoot, name, "SKILL.md"), "utf8");

export function skillDirectories() {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function stripFencedCode(markdown) {
  return markdown.replaceAll(/```[\s\S]*?```/g, "");
}

export function markdownLinks(markdown) {
  const withoutCode = stripFencedCode(markdown);
  return [...withoutCode.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
}

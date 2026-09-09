/**
 * @module scripts/reports/compression/corpora
 *
 * The four corpora the report measures: the skills and docs this repository
 * ships, the six tool results the efficacy fixture records, and the synthetic
 * verbose prose the level table is actually about.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { VERBOSE_CORPUS } from "./_verbose.data.mjs";

const ROOT = new URL("../../..", import.meta.url).pathname;

/** Every shipped skill body: the prose-heavy end of what the server emits. */
export function skillCorpus() {
  const dir = join(ROOT, "skills");

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, text: readFileSync(join(dir, entry.name, "SKILL.md"), "utf8") }))
    .filter((item) => item.text.length > 0);
}

/**
 * What the router actually returns: the same six calls the efficacy fixture
 * records, so the report and the CI floors measure one corpus.
 */
export async function resultCorpus() {
  const { CORPUS, recomputeCore, text } = await import(join(ROOT, "src/core/text/__tests__/_efficacy.fixture.mjs"));
  const corpus = [];

  for (const [name, args] of CORPUS) {
    corpus.push({ name, text: text(await recomputeCore(name, args)) });
  }

  return corpus;
}

/** The documentation the project ships beside the skills. */
export function docsCorpus() {
  const dir = join(ROOT, "docs");

  return [
    { name: "README.md", text: readFileSync(join(ROOT, "README.md"), "utf8") },
    ...readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => ({ name: `docs/${entry.name}`, text: readFileSync(join(dir, entry.name), "utf8") })),
  ];
}

/**
 * Every corpus, keyed by the label the report prints.
 *
 * @returns {Promise<Record<string, Array<{ name: string, text: string }>>>}
 */
export async function corpora() {
  return {
    "skills (shipped)": skillCorpus(),
    "docs (shipped)": docsCorpus(),
    "tool results (shipped)": await resultCorpus(),
    "verbose prose (synthetic)": VERBOSE_CORPUS,
  };
}

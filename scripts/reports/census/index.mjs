#!/usr/bin/env node

/**
 * @module scripts/reports/census
 *
 * Generate the census: eight numbered documents under `docs/`, plus the three
 * fenced blocks the handbook keeps inside chapters a person writes.
 *
 * A census written by hand is a census that is wrong by the next commit. This
 * repository has already paid for that once - count claims in the docs that
 * disagreed with the runtime surface (ADR 049). So the inventory is derived,
 * and `docs/08-skills.md` through `docs/15-resources.md` are outputs rather
 * than documents.
 *
 * Everything is formatted here, with the repository's own prettier settings,
 * so the writer and `tests/docs/census-generated.test.mjs` compare the same
 * bytes: a census that drifts fails the build rather than misleading a reader.
 *
 * Usage:
 *   node scripts/reports/census/index.mjs            # write the files
 *   node scripts/reports/census/index.mjs --check    # exit 1 when one would change
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { GENERATED_DOCS } from "./_docs.mjs";
import { gather } from "./_gather.mjs";
import { MARKER_TARGETS, upsertBlock } from "./_markers.mjs";
import { DOCS } from "./_registries.mjs";

/** The current content of a document, or nothing when it does not exist yet. */
function read(file) {
  try {
    return readFileSync(join(DOCS, file), "utf8");
  } catch {
    return "";
  }
}

/**
 * Markdown, formatted the way every other document in the repository is.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
async function format(text) {
  const prettier = await import("prettier");
  const options = await prettier.resolveConfig(join(DOCS, "README.md"));

  return prettier.format(text, { ...options, parser: "markdown" });
}

/**
 * Every file the census owns, with the content it should hold.
 *
 * @returns {Promise<Array<{file: string, content: string}>>}
 */
export async function censusOutputs() {
  const data = await gather();
  const outputs = [];

  for (const doc of GENERATED_DOCS) {
    outputs.push({ file: doc.file, content: await format(doc.build(data).join("\n")) });
  }

  for (const target of MARKER_TARGETS) {
    outputs.push({
      file: target.file,
      content: await format(upsertBlock(read(target.file), target.marker, target.build(data))),
    });
  }

  return outputs;
}

/**
 * Write the census, returning the files that changed.
 *
 * @returns {Promise<string[]>}
 */
export async function writeCensus() {
  const changed = [];

  for (const output of await censusOutputs()) {
    if (read(output.file) === output.content) {
      continue;
    }

    writeFileSync(join(DOCS, output.file), output.content);
    changed.push(output.file);
  }

  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--check")) {
    const stale = (await censusOutputs()).filter((output) => read(output.file) !== output.content);

    if (stale.length === 0) {
      console.log("the census is current");
    } else {
      console.error(`stale, run pnpm census: ${stale.map((output) => `docs/${output.file}`).join(", ")}`);
      process.exitCode = 1;
    }
  } else {
    const changed = await writeCensus();

    console.log(changed.length === 0 ? "the census is already current" : `updated: ${changed.join(", ")}`);
  }
}

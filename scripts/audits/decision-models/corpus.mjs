#!/usr/bin/env node
/**
 * @module scripts/audits/decision-models/corpus
 *
 * Measure the routing corpus with the decision model off and on.
 *
 * Model-off is the BM25 ruler: it routes all 95 prompts and prints exact and
 * top-or-alternative. Model-on is the rerank prototype: for the addressable
 * misses (the intended skill is in the shortlist), it asks the model to choose
 * among the BM25 route and its alternatives, and records the fix rate, mean
 * latency and input tokens. `--catalog` repeats the run over every skill, the
 * experiment that made the model confidently wrong.
 *
 * The run is written to a fixture with `--fixture`, and `--check` compares a
 * live model-off run with the committed number instead of a memory.
 *
 * Usage:
 *   node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs \
 *     [--on] [--catalog] [--model laya] [--shortlist 5] [--fixture [path]] [--check] [--json]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { compareOff, percent, summarize, summaryLine } from "./_corpus-measure.mjs";

process.env.RULE_MCP_SKILL_UNIVERSE ??= "base";
process.env.RULE_MCP_NO_CACHE ??= "1";
process.env.RULE_MCP_NO_SYNC_GUARD ??= "1";

const DEFAULT_FIXTURE = fileURLToPath(new URL("../../../tests/fixtures/decision-models/corpus-baseline.json", import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const index = argv.indexOf(name);

  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : fallback;
};

if (flag("--help")) {
  console.log(
    "Usage: node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs [--on] [--catalog] [--model laya] [--shortlist 5] [--fixture [path]] [--check] [--json]",
  );
  process.exit(0);
}

const model = value("--model", "laya");
const shortlistSize = Number(value("--shortlist", "5"));
const fixturePath = value("--fixture", DEFAULT_FIXTURE);
const wantedOn = flag("--on") || flag("--catalog");
const catalog = flag("--catalog");
const asJson = flag("--json");
const check = flag("--check");

if (!Number.isInteger(shortlistSize) || shortlistSize < 1 || shortlistSize > 6) {
  console.error("--shortlist must be an integer from 1 to 6 (Step 4.2 caps the options at six)");
  process.exit(2);
}

const { loadCorpus, addressableMisses, measure } = await import("./_corpus-run.mjs");
const { rows, corpusSize } = await loadCorpus();
const off = { ...summarize(rows), rows };

if (!asJson) {
  console.log(summaryLine("model-off (BM25)", off));
}

let on;

if (wantedOn) {
  const { createDecisionClient, createSupervisor } = await import("../../../src/core/decision/index.js");
  const client = createDecisionClient({
    baseUrl: process.env.RULE_MCP_DECISION_URL,
    timeoutMs: Number(process.env.RULE_MCP_DECISION_TIMEOUT ?? 300_000),
  });
  const supervisor = createSupervisor({ client, model });
  const loaded = await supervisor.ensureLoaded();
  const misses = addressableMisses(rows, shortlistSize);

  if (!asJson) {
    console.log(`model ${model} loaded in ${loaded.ms} ms; ${misses.length} addressable misses`);
  }

  try {
    on = {
      model,
      shortlist: await measure(supervisor, misses, { catalog: false, shortlistSize }),
      catalog: catalog ? await measure(supervisor, misses, { catalog: true, shortlistSize }) : undefined,
    };
  } finally {
    await supervisor.shutdown();
  }

  if (!asJson) {
    const shortlist = on.shortlist;

    console.log(
      `model-on shortlist (${model}, ${shortlistSize} options): exact ${off.exact + shortlist.fixed}/${off.total} (${percent(off.exact + shortlist.fixed, off.total)}), top-or-alternative ${off.top}/${off.total} (${percent(off.top, off.total)})`,
    );
    console.log(`  fixed ${shortlist.fixed}/${shortlist.addressable} addressable misses; ${shortlist.meanMs} ms mean; ${shortlist.meanInputTokens} input tokens`);

    if (on.catalog) {
      console.log(
        `model-on catalog (${model}, ${on.catalog.picks[0]?.shortlist.length ?? 0} options): exact ${off.exact + on.catalog.fixed}/${off.total} (${percent(off.exact + on.catalog.fixed, off.total)})`,
      );
      console.log(`  fixed ${on.catalog.fixed}/${on.catalog.addressable} addressable misses; ${on.catalog.meanMs} ms mean; ${on.catalog.meanInputTokens} input tokens`);
    }
  }
}

const run = {
  schema: 1,
  recordedAt: new Date().toISOString().slice(0, 10),
  universe: process.env.RULE_MCP_SKILL_UNIVERSE,
  corpusSize,
  off,
  on,
};

if (check) {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  const differences = compareOff(fixture.off, summarize(rows));

  if (differences.length > 0) {
    for (const difference of differences) {
      console.error(difference);
    }

    process.exitCode = 1;
  } else {
    console.log(`model-off matches ${fixturePath}`);
  }
}

if (flag("--fixture")) {
  const existing = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, "utf8")) : {};

  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, `${JSON.stringify({ ...existing, ...run, on: run.on ?? existing.on }, null, 2)}\n`);

  if (!asJson) {
    console.log(`wrote ${fixturePath}`);
  }
}

if (asJson) {
  console.log(JSON.stringify(run, null, 2));
}

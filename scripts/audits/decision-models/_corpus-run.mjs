

/**
 * @module scripts/audits/decision-models/corpus-run
 *
 * The two runs the corpus command orchestrates: BM25 over every prompt, and the
 * model over the misses it can actually fix at the chosen shortlist size.
 *
 * The project modules are imported dynamically so the caller can pin the skill
 * universe and the cache flags before the skill registry reads them.
 */

import { applyPicks, buildQuestion, pickOf, shortlistFor } from "./_corpus-measure.mjs";

/** Load the skill universe and route every corpus prompt once with BM25. */
export async function loadCorpus() {
  const { loadAllSkills } = await import("../../../src/core/skills/index.js");
  const { callTool } = await import("../../../src/tools/router/index.js");
  const { CORPUS } = await import("../../../tests/fixtures/routing-corpus.mjs");

  await loadAllSkills(true);

  const rows = [];

  for (const entry of CORPUS) {
    const answer = JSON.parse((await callTool("pix_tool", { prompt: entry.prompt })).content[0].text);
    const alternatives = (answer.alternatives ?? []).map((alternative) => alternative.route);

    rows.push({
      prompt: entry.prompt,
      expect: entry.expect,
      area: entry.area,
      got: answer.route,
      alternatives,
      exact: answer.route.includes(entry.expect),
      inAlternatives: alternatives.some((name) => name.includes(entry.expect)),
    });
  }

  return { rows, corpusSize: CORPUS.length };
}

/** The misses whose intended skill is inside the options the model will see. */
export function addressableMisses(rows, shortlistSize) {
  return rows.filter((row) => !row.exact && shortlistFor(row, shortlistSize).some((name) => name.includes(row.expect)));
}

/** Ask the model to rerank the addressable misses, one prompt at a time. */
export async function measure(supervisor, misses, { catalog, shortlistSize }) {
  const { getSkillNames, getSkillMetadata } = await import("../../../src/tools/router/index.js");
  const picks = [];

  for (const row of misses) {
    const names = catalog ? getSkillNames() : shortlistFor(row, shortlistSize);
    const options = names.map((name) => ({
      name,
      description: catalog ? "" : String(getSkillMetadata(name)?.description ?? ""),
    }));
    const answer = await supervisor.ask(row.prompt, buildQuestion(options, { described: !catalog }));
    const pick = pickOf(answer);

    picks.push({
      prompt: row.prompt,
      expect: row.expect,
      got: row.got,
      shortlist: names,
      pick,
      fixed: typeof pick === "string" && pick.includes(row.expect),
      ms: answer.ms,
      inputTokens: answer.usage.input_tokens ?? 0,
    });
  }

  return applyPicks(picks);
}

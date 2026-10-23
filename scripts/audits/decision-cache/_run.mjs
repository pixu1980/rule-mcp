

/** The corpus run: gold routes, seeded cache, shadow observations and the summary. */
import { planCorpus, validateCorpus } from "./_corpus.mjs";
import { loadAllSkills } from "../../../src/core/skills/index.js";
import { callTool } from "../../../src/tools/router/index.js";
import { cacheClear, cacheStore, observeDecisionShadow, waitForDecisionShadows } from "../../../src/core/cache/tool-cache/index.js";
import { clearShadows, readShadows, summarizeShadows } from "../../../src/core/cache/tool-cache/_decision-shadow.js";
import { clearDecisionCache } from "../../../src/core/decision/_cache.js";
import { decisionRuntime } from "../../../src/core/decision/_runtime.js";

function routeFromText(text) {
  const source = String(text ?? "");
  const start = source.indexOf("{");

  if (start === -1) {
    return;
  }

  try {
    const parsed = JSON.parse(source.slice(start));

    return typeof parsed.route === "string" ? parsed.route : undefined;
  } catch {
    return;
  }
}

function goldRoute(response) {
  for (const item of response.content ?? []) {
    if (item.type !== "text") {
      continue;
    }

    const route = routeFromText(item.text);

    if (route !== undefined) {
      return route;
    }
  }

  return;
}

async function gold(prompt) {
  cacheClear();
  const startedAt = Date.now();
  const response = await callTool("pix_tool", { prompt });

  return { route: goldRoute(response), ms: Date.now() - startedAt };
}

/**
 * Run the corpus and return the rows the CLI prints. The caller has already
 * pinned the skill universe, the state directory and the model environment.
 *
 * @param {{ model: string, limit: number }} options
 * @returns {Promise<{ seeds: Array<object>, selected: Array<object>, rows: Array<object>, records: Array<object>, summary: object }>}
 */
export async function runCorpus({ model, limit }) {
  const invalid = validateCorpus();

  if (invalid) {
    throw new Error(invalid);
  }

  const { seeds, samples } = planCorpus();
  const selected = limit > 0 ? samples.slice(0, limit) : samples;

  await loadAllSkills(true);

  const runtime = await decisionRuntime(selected[0]?.prompt ?? seeds[0]?.prompt).catch(() => null);

  if (!runtime) {
    throw new Error(`No decision model for "${model}". Set RULE_MCP_DECISION_URL or pass --model.`);
  }

  try {
    await runtime.supervisor.ensureLoaded();

    const seedRoutes = new Map();

    for (const seed of seeds) {
      seedRoutes.set(seed.group, await gold(seed.prompt));
    }

    const liveGold = [];

    for (const sample of selected) {
      liveGold.push(await gold(sample.prompt));
    }

    cacheClear();

    for (const seed of seeds) {
      const route = seedRoutes.get(seed.group)?.route;

      if (!route || route === "none") {
        continue;
      }

      cacheStore("pix_tool", { prompt: seed.prompt }, { content: [{ type: "text", text: JSON.stringify({ route }) }] }, {});
    }

    process.env.RULE_MCP_DECISION_CACHE_SHADOW = "1";
    clearShadows();
    clearDecisionCache();

    for (const [index, sample] of selected.entries()) {
      const oracle = liveGold[index];
      const core = { content: [{ type: "text", text: JSON.stringify({ route: oracle.route ?? "none" }) }] };

      await observeDecisionShadow("pix_tool", { prompt: sample.prompt }, { core, computeMs: oracle.ms });
      await waitForDecisionShadows();
    }

    const records = readShadows();
    const rows = selected.map((sample, index) => ({ ...sample, ...records[index] }));

    return { seeds, selected, rows, records, summary: summarizeShadows(records) };
  } finally {
    await runtime.supervisor.shutdown();
  }
}

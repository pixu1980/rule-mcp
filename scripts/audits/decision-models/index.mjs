#!/usr/bin/env node
/**
 * @module scripts/audits/decision-models
 *
 * Ask every decision model the local llama.cpp router carries the same three
 * states, and print the evidence tables the audit quotes.
 *
 * Resource discipline is part of the design: the router loads a model on the
 * first request that names it, so each model is unloaded before it starts, every
 * state is asked once with all three questions batched into one forward pass,
 * and the model is unloaded when it is done. Nothing here writes to a model or a
 * preset; only the three extras that test a claim made in the llama.cpp blog (a
 * single-question control, the bare-label comparison, and a repeat for
 * determinism) add requests.
 *
 * Run: `node scripts/audits/decision-models/index.mjs`
 * Env: `RULE_MCP_DECISION_URL` (default `http://localhost:9931`)
 */

import { ask, BASE, listModels } from "./_client.mjs";
import { load, unload } from "./_models.mjs";
import { BARE_ROUTE, CONTROL_STATE, PROBES, TARGETS } from "./_probes.data.mjs";
import { maxDelta, toMarkdown } from "./_report.mjs";

const note = (line) => process.stderr.write(`${line}\n`);

/**
 * The sentence a refusal is quoted as, without the transport around it.
 *
 * @param {string} message
 * @returns {string}
 */
function refusal(message) {
  const body = message.slice(message.indexOf("{"));

  try {
    return JSON.parse(body).error?.message ?? message;
  } catch {
    return message;
  }
}

/** The router's card for each target, by id prefix. */
async function resolveTargets() {
  const available = await listModels();
  const found = TARGETS.map((fragment) => available.find((model) => model.id.includes(fragment)));

  if (found.some((model) => model === undefined)) {
    throw new Error(`missing model: looked for ${TARGETS.join(", ")} in ${available.map((model) => model.id).join(", ")}`);
  }

  return found;
}

/**
 * One model's battery: the three states, then the three extras.
 *
 * Loading and unloading are the caller's, so a model the endpoint refuses is
 * still freed, and every latency here is warm.
 *
 * @param {object} model
 * @returns {Promise<Array<object>>}
 */
async function audit(model) {
  const rows = [];

  const record = async (probe, questions, extra = {}) => {
    note(`  ${model.id} ${probe}`);
    const result = await ask(model.id, extra.state ?? CONTROL_STATE, questions);

    rows.push({
      model: model.id.split(":", 1)[0],
      probe,
      questions: Object.keys(questions).length,
      ms: result.ms,
      input_tokens: result.usage.input_tokens ?? 0,
      output_tokens: result.usage.output_tokens ?? 0,
      answers: result.answers,
      ...extra,
    });

    return rows.at(-1);
  };

  for (const probe of PROBES) {
    await record(probe.id, probe.questions, { state: probe.state, expectedRoute: probe.expectedRoute });
  }

  const first = rows[0];
  const control = await record("control", { route: PROBES[0].questions.route });
  control.batchDelta = first.input_tokens - control.input_tokens;

  const bare = await record("bare", { route: BARE_ROUTE });
  bare.bareDiffers = bare.answers.route?.choice !== first.answers.route?.choice;

  const repeat = await record("repeat", PROBES[0].questions, { state: PROBES[0].state });
  repeat.delta = maxDelta(repeat.answers, first.answers);

  return rows;
}

const models = await resolveTargets();
note(`${BASE}: ${models.map((model) => model.id).join(", ")}`);

const rows = [];
const verdicts = new Map();
const loads = new Map();

for (const model of models) {
  const label = model.id.split(":", 1)[0];

  await unload(model.id);
  try {
    loads.set(label, await load(model.id));
    note(`  ${label} loaded in ${Math.round(loads.get(label))} ms`);

    rows.push(...(await audit(model)));
    verdicts.set(label, "decision model");
  } catch (error) {
    note(`  ${label} refused: ${error.message}`);
    verdicts.set(label, refusal(error.message));
  } finally {
    await unload(model.id);
    note(`  ${label} unloaded`);
  }
}

const { models: modelTable, requests, summary } = toMarkdown(rows, models, { verdicts, loads });

process.stdout.write(`### Router\n\n\`${BASE}\`\n\n${modelTable}\n\n### Requests\n\n${requests}\n\n### Summary\n\n${summary}\n`);

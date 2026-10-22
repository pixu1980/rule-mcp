

/**
 * @module scripts/audits/decision-models/report
 *
 * Turn the answers into the three tables the audit quotes.
 *
 * Nothing here decides whether a model is good: it counts what came back, so the
 * written audit can be checked against the numbers instead of the prose.
 */

/** The number a reader needs from one answer, per question type. */
export function renderAnswer(answer) {
  if (!answer) {
    return "-";
  }

  if (answer.type === "choice") {
    return `${answer.choice} ${answer.probabilities?.[answer.choice]?.toFixed(4) ?? "?"} (conf ${answer.confidence?.toFixed(4) ?? "?"})`;
  }

  if (answer.type === "score") {
    return answer.score?.toFixed(2) ?? "-";
  }

  return answer.noul?.toFixed(4) ?? "-";
}

/** The largest difference between two answer trees, for the repeat run. */
export function maxDelta(left, right) {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right);
  }

  if (!left || !right || typeof left !== "object") {
    return 0;
  }

  let worst = 0;

  for (const [key, value] of Object.entries(left)) {
    worst = Math.max(worst, maxDelta(value, right[key]));
  }

  return worst;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
};

/**
 * Count the run: one row per model, which is what the audit argues from.
 *
 * @param {Array<object>} rows every request that ran
 * @param {Array<object>} models the router's cards for the tested ids
 * @param {{ verdicts?: Map<string, string>, loads?: Map<string, number> }} counts
 *   what the endpoint said about each model, and the explicit load time
 * @returns {{ models: string, requests: string, summary: string }}
 */
export function toMarkdown(rows, models, counts = {}) {
  const verdicts = counts.verdicts ?? new Map();
  const loads = counts.loads ?? new Map();
  const modelTable = [
    "| Model | Status at discovery | Context | Inputs |",
    "| --- | --- | --- | --- |",
    ...models.map(
      (model) => `| \`${model.id}\` | ${model.status?.value ?? "?"} | ${model.context_length ?? "?"} | ${(model.architecture?.input_modalities ?? []).join(", ") || "?"} |`,
    ),
  ].join("\n");

  const requestTable = [
    "| Model | Probe | Questions | Latency | Input tokens | Answers |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const answers = Object.entries(row.answers)
        .map(([name, answer]) => `${name}=${renderAnswer(answer)}`)
        .join("<br>");

      return `| ${row.model} | ${row.probe} | ${row.questions} | ${Math.round(row.ms)} ms | ${row.input_tokens} | ${answers} |`;
    }),
  ].join("\n");

  const summary = [
    "| Model | Verdict | Load (explicit) | Route | Latency (median) | Confidence | Repeat delta | Batch delta | Bare labels |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...models
      .map((card) => card.id.split(":", 1)[0])
      .map((model) => {
        const mine = rows.filter((row) => row.model === model);
        const battery = mine.filter((row) => row.probe !== "control" && row.probe !== "bare" && row.probe !== "repeat");
        const correct = battery.filter((row) => row.answers.route?.choice === row.expectedRoute).length;
        const warm = mine.map((row) => row.ms);
        const confidences = battery.map((row) => row.answers.route?.confidence).filter((value) => typeof value === "number");
        const repeat = mine.find((row) => row.probe === "repeat");
        const control = mine.find((row) => row.probe === "control");
        const bare = mine.find((row) => row.probe === "bare");
        const cells = [
          model,
          verdicts.get(model) ?? "-",
          loads.has(model) ? `${Math.round(loads.get(model))} ms` : "-",
          `${correct}/${battery.length}`,
          warm.length === 0 ? "-" : `${Math.round(median(warm))} ms`,
          confidences.length === 0 ? "-" : mean(confidences).toFixed(3),
          repeat ? repeat.delta.toFixed(6) : "-",
          control ? String(control.batchDelta) : "-",
          bare ? `${bare.answers.route?.choice} (conf ${bare.answers.route?.confidence?.toFixed(4)})` : "-",
        ];

        return `| ${cells.join(" | ")} |`;
      }),
  ].join("\n");

  return { models: modelTable, requests: requestTable, summary };
}

/** The arithmetic mean, or 0 for an empty list. */
function mean(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

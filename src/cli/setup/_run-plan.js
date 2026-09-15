

/**
 * @module cli/setup/run-plan
 *
 * Sequential execution of a task plan, with a progress callback.
 *
 * Sequential on purpose: the steps write to overlapping files (agent configs,
 * instruction files, the same runtime home) and a user watching an installer
 * needs to be able to point at the step that broke. One task's failure never
 * stops the rest - a failed daemon install must not cost the agent configs
 * that already succeeded.
 */

/** The states a task moves through. */
export const TASK_PENDING = "pending";

/**
 * Run every task in order.
 *
 * @param {Array<{ id: string, title: string, run: Function }>} plan
 * @param {{ dryRun?: boolean, onUpdate?: Function, signal?: { aborted: boolean } }} [options]
 * @returns {Promise<Array<{ id: string, title: string, detail: string, status: string, summary: string, lines: string[] }>>}
 */
export async function runPlan(plan, { dryRun = false, onUpdate = () => {}, signal } = {}) {
  // `detail` is carried through: it is what the review screen showed before
  // the run, and a result that dropped it could not print what it just did.
  const results = plan.map((task) => ({
    id: task.id,
    title: task.title,
    detail: task.detail ?? "",
    status: TASK_PENDING,
    summary: "",
    lines: [],
  }));

  for (const [index, task] of plan.entries()) {
    if (signal?.aborted) {
      results[index] = { ...results[index], status: "skip", summary: "canceled" };
      continue;
    }

    results[index] = { ...results[index], status: "running" };
    onUpdate([...results], index);

    try {
      const outcome = (await task.run({ dryRun })) ?? {};

      results[index] = {
        ...results[index],
        status: outcome.status ?? "ok",
        summary: outcome.summary ?? "",
        lines: outcome.lines ?? [],
      };
    } catch (error) {
      results[index] = { ...results[index], status: "fail", summary: error.message, lines: [] };
    }

    onUpdate([...results], index);
  }

  return results;
}

/** Roll a finished run up into the counts the summary screen shows. */
export function tally(results) {
  const count = (status) => results.filter((result) => result.status === status).length;

  return { ok: count("ok"), warn: count("warn"), skip: count("skip"), fail: count("fail"), total: results.length };
}

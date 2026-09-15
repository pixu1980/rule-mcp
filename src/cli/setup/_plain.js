

/**
 * @module cli/setup/plain
 *
 * The wizard's output for terminals that cannot host one.
 *
 * `curl | bash` hands the script to stdin, CI has no TTY at all, and both
 * still have to be able to install. The plain path runs the same plan the
 * wizard would, with the same defaults, and prints one line per task.
 */

import { runPlan, tally } from "./_run-plan.js";
import { statusStyle } from "./_theme.js";

const write = (line) => process.stdout.write(`${line}\n`);

/**
 * One finished task, as a line.
 *
 * The detail is what the wizard's review screen shows before anything runs -
 * the mode an agent is configured with, the commands a sync will write. A
 * piped install that printed only the summary left that unauditable.
 */
export const taskLine = (task) => `${statusStyle(task.status).glyph} ${task.title}${task.detail ? ` (${task.detail})` : ""}${task.summary ? ` - ${task.summary}` : ""}`;

/** The counts line plus whatever to do next. */
function writeFooter(counts, nextSteps) {
  write("");
  write(`  ${counts.ok} ok, ${counts.warn} warning(s), ${counts.fail} failure(s), ${counts.skip} skipped`);

  for (const line of nextSteps) {
    write(`  -> ${line}`);
  }

  write("");
}

/**
 * Run a plan with no UI, printing each task as it finishes.
 *
 * @param {{ plan: object[], dryRun?: boolean, title: string, nextSteps?: string[] }} options
 * @returns {Promise<{ results: object[], counts: object }>}
 */
export async function runPlain({ plan, dryRun = false, title, nextSteps = [] }) {
  write("");
  write(`${title}${dryRun ? " (dry run)" : ""} - ${plan.length} step(s)`);
  write("");

  const printed = new Set();
  const results = await runPlan(plan, {
    dryRun,
    onUpdate: (current) => {
      for (const task of current) {
        if (task.status === "pending" || task.status === "running" || printed.has(task.id)) {
          continue;
        }

        printed.add(task.id);
        write(`  ${taskLine(task)}`);
      }
    },
  });
  const counts = tally(results);

  writeFooter(counts, nextSteps);

  return { results, counts };
}

/**
 * Print the closing summary after the alternate screen is gone.
 *
 * Without this the wizard's whole run vanishes with the alternate screen and
 * the user is left at a prompt with no record of what changed.
 */
export function printSummary({ results, dryRun, title, nextSteps = [] }) {
  const counts = tally(results);

  write("");
  write(`${title}${dryRun ? " (dry run)" : ""}`);

  for (const task of results) {
    write(`  ${taskLine(task)}`);
  }

  writeFooter(counts, nextSteps);

  return counts;
}

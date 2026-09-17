

/** What each plan still wants done, so a resuming session proposes before it starts. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Where working plans live, relative to the project root. */
const PLAN_DIR = "docs/plans";

/** How many continuation lines a wrapped step may carry before it is cut. */
const MAX_CONTINUATION = 6;

/** The run date a plan stamps on itself, or "" when it carries none. */
function dateOf(text) {
  return text.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
}

/** The nearest heading above line `index`, or "" when the plan opens with steps. */
function headingBefore(lines, index) {
  for (let at = index - 1; at >= 0; at -= 1) {
    const heading = lines[at].match(/^#{2,}\s+(.+?)\s*$/);

    if (heading) {
      return heading[1];
    }
  }

  return "";
}

/** True for a line that opens a new list item or heading, so the step ended. */
const startsBlock = (line) => /^\s*(?:[-*+]\s|\d{1,3}\.\s|#)/.test(line);

/** The first unchecked step and the workstream heading that owns it. */
function firstOpenStep(text) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => /^\s*-\s*\[ \]\s+\S/.test(line));

  if (index === -1) {
    return null;
  }

  const step = [lines[index].replace(/^\s*-\s*\[ \]\s+/, "").trim()];

  // A step wraps at the column, so its continuation lines carry the rest of the
  // sentence. Cutting at the wrap hands the next session half a step, which is
  // worse than handing it nothing.
  for (let at = index + 1; at < lines.length && step.length <= MAX_CONTINUATION; at += 1) {
    const line = lines[at];

    if (line.trim() === "" || startsBlock(line)) {
      break;
    }

    step.push(line.trim());
  }

  return { workstream: headingBefore(lines, index), step: step.join(" ") };
}

/** How many unchecked steps a plan still carries. */
const openCount = (text) => (text.match(/^\s*-\s*\[ \]\s+\S/gm) ?? []).length;

/**
 * Every plan with at least one open step, newest date first.
 *
 * A plan with nothing open has been carried into an ADR already and proposes
 * nothing. A queue without checkboxes (the backlog) is not a step list either,
 * so it never appears. The newest date wins because the plan worked most
 * recently is the likeliest one a session resumes; the name breaks a tie.
 *
 * @param {string} projectDir
 * @returns {Array<{ name: string, path: string, date: string, workstream: string, step: string, open: number }>}
 */
export function nextPlanSteps(projectDir) {
  let files;

  try {
    files = readdirSync(join(projectDir, PLAN_DIR)).filter((file) => file.endsWith(".md"));
  } catch {
    return [];
  }

  const plans = [];

  for (const file of files) {
    let text;

    try {
      text = readFileSync(join(projectDir, PLAN_DIR, file), "utf8");
    } catch {
      continue;
    }

    const next = firstOpenStep(text);

    if (next !== null) {
      plans.push({ name: file.replace(/\.md$/, ""), path: `${PLAN_DIR}/${file}`, date: dateOf(text), open: openCount(text), ...next });
    }
  }

  return plans.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

/**
 * The report section proposing the next workstream of each open plan.
 *
 * The proposal is the tool's, the decision is the user's: a resume report that
 * started work on its own would be answering a question nobody asked.
 *
 * @param {Array<object>} plans @param {{ isMinimal?: boolean }} [shape]
 * @returns {string[]}
 */
export function planLines(plans, { isMinimal } = {}) {
  if (!plans || plans.length === 0 || isMinimal) {
    return [];
  }

  return [
    "## Next from the plans",
    "",
    "A proposal, not a decision: confirm the workstream with the user before starting it.",
    "",
    ...plans.map((plan) => {
      const when = plan.date ? ` (${plan.date})` : "";
      const workstream = plan.workstream ? `${plan.workstream}: ` : "";
      const rest = plan.open > 1 ? ` (${plan.open - 1} more open step(s) in this plan)` : "";

      return `- **${plan.name}**${when} - ${workstream}${plan.step}${rest}`;
    }),
  ];
}

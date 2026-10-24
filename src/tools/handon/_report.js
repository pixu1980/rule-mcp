/** Render the verification report: bucket lines, run ranges, the suggested first move. */
import { ageLabel } from "./_age.js";

/**
 * Group the file claims so a handoff naming fifteen paths does not produce
 * fifteen lines. The claims array keeps them one by one; the prose does not.
 *
 * @param {Array<object>} claims @param {string} bucket
 * @returns {string[]}
 */
export function lines(claims, bucket) {
  const inBucket = claims.filter((claim) => claim.bucket === bucket);
  const out = [];
  const files = new Map();
  const adrs = new Map();

  for (const claim of inBucket) {
    if (claim.kind === "file") {
      files.set(claim.verdict, [...(files.get(claim.verdict) ?? []), claim.value]);
      continue;
    }

    if (claim.kind === "adr") {
      adrs.set(claim.verdict, [...(adrs.get(claim.verdict) ?? []), claim.value]);
      continue;
    }

    switch (claim.kind) {
      case "branch": {
        out.push(`- branch \`${claim.value}\`: ${claim.verdict}`);
        break;
      }
      case "range": {
        out.push(`- ${claim.verdict}`);
        break;
      }
      case "command": {
        out.push(`- \`${claim.value}\`: ${claim.verdict}`);
        break;
      }
      case "open": {
        out.push(`- open: ${claim.value}`);
        break;
      }
      default: {
        break;
      }
    }
  }

  for (const [verdict, ids] of adrs) {
    out.push(`- ADR${ids.length > 1 ? "s" : ""} ${runs(ids)}: ${verdict}`);
  }

  for (const [verdict, paths] of files) {
    out.push(`- ${verdict}: ${paths.map((path) => `\`${path}\``).join(", ")}`);
  }

  return out;
}

/**
 * Collapse consecutive numbers into ranges: eight ADRs that all landed are one
 * fact, and eight lines saying so is the padding a handon exists to remove.
 *
 * @param {string[]} ids zero-padded, ascending
 * @returns {string}
 */
export function runs(ids) {
  const groups = [];

  for (const id of ids) {
    const last = groups.at(-1);

    if (last && Number.parseInt(id, 10) === Number.parseInt(last.at(-1), 10) + 1) {
      last.push(id);
    } else {
      groups.push([id]);
    }
  }

  return groups.map((group) => (group.length > 2 ? `${group[0]} to ${group.at(-1)}` : group.join(", "))).join(", ");
}

/**
 * What to do first, given what changed. One sentence, and it names the reason.
 *
 * @param {Array<object>} claims @param {object} claimed
 * @returns {string}
 */
export function firstMove(claims, claimed) {
  const command = claims.find((claim) => claim.kind === "command");
  const range = claims.find((claim) => claim.kind === "range");
  const since = range?.verdict.match(/^(\d+) commits/)?.[1];

  if (command) {
    const age = ageLabel(claimed.date);
    const reason = [age && `the claim is ${age}`, since && since !== "0" && `${since} commits have landed since`].filter(Boolean).join(" and ");

    return `Re-run \`${command.value}\` before continuing${reason ? `: ${reason}` : ""}.`;
  }

  const branch = claims.find((claim) => claim.kind === "branch" && claim.bucket === "changed");

  if (branch) {
    return `The branch this work was on (\`${branch.value}\`) is ${branch.verdict}. Confirm where it continues before editing.`;
  }

  const moved = claims.filter((claim) => claim.kind === "file" && claim.bucket === "changed").length;

  if (moved > 0 && since && since !== "0") {
    return `${since} commits landed and ${moved} of the files the handoff named have changed. Re-read those before trusting the narrative around them.`;
  }

  if (claimed.open.length > 0) {
    return `Start with: ${claimed.open[0]}`;
  }

  return "Nothing in the handoff contradicts the repository. Continue where it left off.";
}

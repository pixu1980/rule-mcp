/**
 * The dependency audit as a gate that blocks on findings, not on weather.
 *
 * `pnpm audit` exits non-zero for a vulnerability AND for a network error, so
 * wiring it straight into ci makes an unreachable advisories endpoint look
 * exactly like a compromised dependency. One of those should stop a build and
 * the other should not: a registry outage that blocks every build teaches
 * people to bypass the gate, which costs more than the outage.
 *
 * So: a parseable report with advisories fails, a parseable clean report
 * passes, and an audit that could not run at all warns and passes - loudly,
 * naming the reason, so nobody mistakes it for a clean result.
 */

import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["audit", "--prod", "--json"], { encoding: "utf8" });
const output = `${result.stdout ?? ""}`.trim();

/** The advisories block of a pnpm audit report, or nothing when unparseable. */
function advisoriesOf(raw) {
  try {
    const report = JSON.parse(raw);

    return report?.advisories ?? {};
  } catch {
    return undefined;
  }
}

const advisories = advisoriesOf(output);

if (advisories === undefined) {
  const reason = `${result.stderr ?? ""}`.trim().split("\n").slice(0, 3).join(" ") || "no parseable report";
  process.stderr.write(
    `[audit-gate] WARNING: the dependency audit could not run (${reason}).\n` +
      "[audit-gate] This is NOT a clean result. Re-run `pnpm audit --prod` before trusting the build.\n",
  );
  process.exit(0);
}

const entries = Object.values(advisories);

if (entries.length === 0) {
  process.stdout.write("[audit-gate] No known vulnerabilities in production dependencies.\n");
  process.exit(0);
}

const bySeverity = new Map();

for (const advisory of entries) {
  const severity = advisory.severity ?? "unknown";
  bySeverity.set(severity, (bySeverity.get(severity) ?? 0) + 1);
  process.stderr.write(`[audit-gate] ${severity}: ${advisory.module_name} - ${advisory.title}\n`);
}

const summary = [...bySeverity].map(([severity, count]) => `${count} ${severity}`).join(", ");
process.stderr.write(`[audit-gate] ${entries.length} vulnerability(ies) in production dependencies (${summary}).\n`);
process.exit(1);

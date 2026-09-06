/** @module scripts/reports/cache/render - the human-readable report */

export function renderReport(report) {
  const row = (label, result) =>
    `  ${label.padEnd(11)} exact ${String(result.exact).padStart(3)}   normalized ${String(result.normalized).padStart(3)}` +
    `   miss ${String(result.miss).padStart(3)}   hit rate ${Math.round(result.hitRate * 100)}%`;
  console.log(`cache report: ${report.corpus} corpus prompts, ${report.mode}`);
  console.log("");
  console.log(row("cold", report.cold));
  console.log(row("warm", report.warm));
  console.log(row("rephrased", report.rephrased));
  console.log("");
  const { invalidation } = report;
  console.log(`Invalidation: ${invalidation.entries} entries stored.`);
  console.log(`  worst single skill edit  ${invalidation.worst} (${invalidation.worstDependents} dependents)`);
  console.log(`  entries surviving it     ${Math.round(invalidation.survival * 100)}%   (was 0%: the namespace carried the skills mtime)`);
  console.log(`  depending on no skill    ${invalidation.unattributed}   (no skill edit can touch these)`);
  console.log("");
  console.log(
    `Entry paths: ${Object.entries(report.byEntry)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join("   ")}`,
  );
  console.log("");
  const { determinism, parity, checked } = report.correctness;
  const verdict = (label, failures) => (failures.length === 0 ? `  ${label.padEnd(13)} ok across ${checked} calls` : `  ${label.padEnd(13)} FAILED: ${failures.join(", ")}`);
  console.log("Correctness:");
  console.log(verdict("determinism", determinism));
  console.log(verdict("hit parity", parity));
  console.log("");
  console.log("Rephrased is the case L1 exists for: the same question, typed by a second person.");
  console.log("Invalidation is computed from the recorded dependencies. No file is touched.");
}

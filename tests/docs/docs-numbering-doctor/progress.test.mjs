/** Progress output: steps while the work happens, not only a summary. */
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

import {
  planRenumber,
  applyRenumber,
} from "../../../src/core/docs-numbering/index.js";
import { seedRepo } from "./_doctor.fixture.mjs";

test("progress is reported while the work happens, not only at the end", () => {
  const root = seedRepo();
  try {
    const steps = [];
    const onProgress = (step) => steps.push(step);
    planRenumber({ projectDir: root, onProgress });
    applyRenumber(planRenumber({ projectDir: root }), { projectDir: root, onProgress });

    assert.ok(steps.length >= 2, `something has to be reported: ${JSON.stringify(steps)}`);
    assert.ok(
      steps.every((step) => typeof step.message === "string" && step.message.length > 0),
      "every step carries a line a person can read",
    );
    assert.ok(
      steps.some((step) => /scan|read/i.test(step.message)),
      "the scan says it is scanning",
    );
    assert.ok(
      steps.some((step) => /renam|referen|index/i.test(step.message)),
      "and the repair says what it is repairing",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI prints its steps while it works, not just a summary", () => {
  const root = seedRepo();
  try {
    const bin = join(process.cwd(), "bin", "rule-mcp.js");
    const out = execFileSync(process.execPath, [bin, "handoff", "doctor", "--dir", root], {
      encoding: "utf8",
      env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1" },
      // A dry run reports work to do, which is exit 1 by design.
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();

    assert.match(out, /Scanning docs[/\\]adr/, "the scan announces itself");
    assert.match(out, /Read \d+ ADR document\(s\)/, "and says what it found");
    assert.match(out, /collision\(s\) found/, "the summary still arrives");
    assert.ok(
      out.indexOf("Scanning") < out.indexOf("collision(s) found"),
      "the steps come before the summary, which is the point of printing them",
    );
  } catch (error) {
    // exit 1 is the dry-run verdict, and execFileSync throws on it.
    const out = String(error.stdout ?? "");
    assert.match(out, /Scanning docs[/\\]adr/, `the scan announces itself: ${out}`);
    assert.match(out, /collision\(s\) found/, "the summary still arrives");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

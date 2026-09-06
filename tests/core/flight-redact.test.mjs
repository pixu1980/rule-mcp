/**
 * Hardening 2.1 (F-P1, F-P3): the share-safe flight export.
 *
 * A local export stays complete - it is the user's own recording on the user's
 * own disk. A shared one must not carry prompt text (potentially personal
 * data, often the employer's problem statement) or absolute paths (username
 * and machine layout). Redaction happens at share time, so the KPI block is
 * identical between the two variants.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { redactFlight } from "../../src/core/telemetry-flight.js";

const flight = () => ({
  version: 2,
  exportedAt: 1,
  server: "rule-mcp",
  project: { dir: "/Users/someone/Projects/acme-secret", id: "p1", branch: "feat/x" },
  kpi: { measuredSaved: 0, reminderOverhead: 460 },
  prompts: [
    { ts: 1, tool: "pix_tool", session: "s1", length: 42, text: "rewrite the ACME pricing page" },
    { ts: 2, tool: "pix_tool", session: "s1", length: 42, text: "rewrite the ACME pricing page", repeat: true },
  ],
  sessions: [{ id: "s1", client: "claude", transport: "stdio" }],
  session: {
    id: "s1",
    events: [
      { ts: 1, tool: "pix_tool", path: "/Users/someone/Projects/acme-secret/src/app.js" },
      { ts: 2, tool: "rule_tool_check" },
    ],
  },
});

test("redaction strips prompt text but keeps the shape of the evidence", () => {
  const redacted = redactFlight(flight());
  for (const prompt of redacted.prompts) {
    assert.equal(prompt.text, undefined, "prompt text must not survive redaction");
    assert.equal(prompt.length, 42, "length is the metric, and it stays");
  }
  assert.equal(redacted.prompts[1].repeat, true, "the repeat flag is a signal, not content");
});

test("redaction reduces the project dir to its basename and hashes paths", () => {
  const redacted = redactFlight(flight());
  assert.equal(redacted.project.dir, "acme-secret");
  const serialized = JSON.stringify(redacted);
  assert.ok(!serialized.includes("/Users/someone"), "no absolute path may survive");
  const [event] = redacted.session.events;
  assert.notEqual(event.path, "/Users/someone/Projects/acme-secret/src/app.js");
  assert.match(event.path, /^[a-f0-9]{8,}$/, "a path becomes a hash, not a deletion");
});

test("redaction marks itself and leaves the KPI block identical", () => {
  const full = flight();
  const redacted = redactFlight(full);
  assert.equal(redacted.redacted, true, "a shared export says it is redacted");
  assert.deepEqual(redacted.kpi, full.kpi, "the numbers are the point of sharing");
  assert.equal(full.prompts[0].text, "rewrite the ACME pricing page", "redaction must not mutate the input");
});

test("the renderer announces a redacted flight", async () => {
  const { renderFlight } = await import("../../src/core/telemetry-stats.js");
  const full = renderFlight(flight());
  const shared = renderFlight(redactFlight(flight()));
  assert.ok(!full.includes("Redacted export"), "a complete export carries no banner");
  assert.match(shared, /Redacted export/, "a shared export says so up front");
});

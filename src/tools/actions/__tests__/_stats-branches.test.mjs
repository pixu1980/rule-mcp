// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Branch coverage for the disabled and archived telemetry arms. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { getProjectPaths } from "../../../cli/paths/index.js";

const state = mkdtempSync(join(tmpdir(), "pix-stats-branches-"));
process.env.PIX_GALAXY_MCP_STATE_DIR = state;
process.env.PIX_GALAXY_MCP_NO_AUTOUPDATE = "1";

const { registerStatsTool } = await import("../_stats.js");
const { callTool } = await import("../../router/index.js");

registerStatsTool();

test("the disabled arm explains why nothing was recorded", async () => {
  process.env.PIX_GALAXY_MCP_NO_TELEMETRY = "1";
  try {
    const result = await callTool("pix_tool_stats", {});
    assert.match(result.content[0].text, /Telemetry is disabled/u);
  } finally {
    delete process.env.PIX_GALAXY_MCP_NO_TELEMETRY;
  }
});

test("the all scope includes archived days when rollups exist", async () => {
  writeFileSync(join(getProjectPaths().dir, "telemetry-rollup.json"), JSON.stringify([{ date: "2025-01-01", calls: 2, savedTokens: 3, estimatedTokens: 4 }]));
  const result = await callTool("pix_tool_stats", { scope: "all" });
  assert.match(result.content[0].text, /Archived days/u);
});

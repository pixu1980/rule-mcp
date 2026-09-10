

/**
 * @module test/sse fixture
 *
 * TDD tests for SSE transport layer.
 * SSEServerTransport flow:
 *   1. Client opens GET /sse → receives endpoint event with sessionId
 *   2. Client POSTs MCP messages to /message?sessionId=XXX
 *   3. Responses come back via the SSE stream
 */

import { loadAllSkills } from "../../../core/skills/index.js";

let pass = 0;
let fail = 0;

/** Print-style assertion; exit code handled by finish(). */
export const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  \u{2705} ${label}`);
  } else {
    fail++;
    console.log(`  \u{274C} ${label}`);
  }
};

/** Print the tally and set the exit code. */
export function finish() {
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}

await loadAllSkills();

export const { startSseServer, stopSseServer } = await import("../index.js");

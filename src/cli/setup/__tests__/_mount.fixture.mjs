/**
 * Mounting a wizard against the fake terminal.
 *
 * Kept beside the fake streams so every wizard test opens the same way and
 * the sandbox env vars are set exactly once, before any module reads them.
 *
 * Fixture file: exempt from the size cap.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { render } from "ink";
import React from "react";

import { FakeStdin, FakeStdout } from "./_fake-terminal.fixture.mjs";

// Never touch the machine's real shim or runtime home from a test.
process.env.RULE_MCP_SKIP_GLOBAL_LINK = "1";
process.env.RULE_MCP_HOME = mkdtempSync(join(tmpdir(), "rule-mcp-wizard-home-"));

/** Mount an app against a fake terminal and hand back the driving handles. */
export function mountApp(App, defaults, size) {
  const stdout = new FakeStdout(size);
  const stdin = new FakeStdin();
  // Every wizard test defaults to a dry run: a test that writes for real
  // would touch the machine it runs on.
  const instance = render(React.createElement(App, { defaults: defaults ?? { dryRun: true } }), { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false });

  return { stdout, stdin, instance };
}

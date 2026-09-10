

/**
 * @module test/flight-recorder/usage-window
 *
 * F4b: usage belongs to the recording window, not to the project's history -
 * plus the busiest-agent detection and the nothing-vs-zero rule.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, writePiFixture, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: usage window");
const { workspace, project } = makeSandbox();
const fake = writePiFixture(workspace, project);

const { detectAgentUsage, readAgentUsage } = await import("../../../agents/transcripts/index.js");

// A separate project, so the windowed rows are not mixed with the undated ones
// above: the two behaviors are different rules and deserve separate fixtures.
const stampedProject = join(workspace, "stamped-app");

mkdirSync(join(stampedProject, ".git"), { recursive: true });

const stampedDir = join(fake, ".pi", "agent", "sessions", `--${stampedProject.slice(1).replaceAll("/", "-")}--`);

mkdirSync(stampedDir, { recursive: true });
writeFileSync(
  join(stampedDir, "stamped.jsonl"),
  [
    JSON.stringify({
      type: "message",
      timestamp: new Date(T0 - 30 * 86_400_000).toISOString(),
      message: {
        role: "assistant",
        model: "last-month",
        usage: { input: 1, output: 999_999, cacheRead: 0, cacheWrite: 0, totalTokens: 5_000_000 },
      },
    }),
    JSON.stringify({
      type: "message",
      timestamp: new Date(T0 + 1000).toISOString(),
      message: {
        role: "assistant",
        model: "this-session",
        usage: { input: 1, output: 7, cacheRead: 0, cacheWrite: 0, totalTokens: 8 },
      },
    }),
  ].join("\n") + "\n",
);

const windowed = readAgentUsage({
  agent: "pi",
  projectDir: stampedProject,
  home: fake,
  since: T0,
  until: T0 + 2000,
});

check("F4b a month-old session is not counted as this one", windowed.output === 7);
check("F4b.1 and its context does not become this session's peak", windowed.peakContext === 8);
check("F4b.2 the window it counted over is reported", windowed.window?.since === T0);
check("F4b.3 the whole history is still there when no window is asked for", readAgentUsage({ agent: "pi", projectDir: stampedProject, home: fake }).output === 1_000_006);
check(
  "F4b.4 an undated row is kept, because dropping it would lose a whole agent",
  readAgentUsage({ agent: "pi", projectDir: project, home: fake, since: T0, until: T0 + 2000 }).output === 600,
);
check("F4b.5 the busiest agent is detected even when no client named itself", detectAgentUsage({ projectDir: project, home: fake })?.agent === "pi");
check("F4.22 an agent that never ran reports nothing, not zero", readAgentUsage({ agent: "pi", projectDir: join(workspace, "nowhere"), home: fake }) === undefined);

finish();

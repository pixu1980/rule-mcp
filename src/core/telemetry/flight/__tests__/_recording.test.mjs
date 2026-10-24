/**
 * @module test/flight-recorder/recording
 *
 * F3: what a call records now - measured sizes, guardrail rules, the client,
 * the project id, and the NO_PROMPTS kill switch.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, recordSampleSession, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: recording");
const { project } = makeSandbox();

const { getProjectPaths } = await import("../../../../cli/paths/index.js");
const { readEvents } = await import("../../store/index.js");
const telemetry = await import("../../recorder/index.js");

recordSampleSession(telemetry);

const projectPaths = getProjectPaths(project);
const events = readEvents();
const first = events[0];

check("F3 the prompt text is recorded verbatim by default", first.prompt?.includes("acme corp") === true);
check("F3.1 the length is kept alongside it", first.promptLength === first.prompt.length);
check("F3.2 the result size is measured in bytes", first.resultBytes === 8000);
check("F3.3 and turned into a token estimate", first.resultTokensEst === 2000);
check("F3.4 the arguments are measured too", first.argsTokensEst === 24);
check("F3.5 a failing guardrail is recorded per rule", first.guardrailRules?.["no-css-classes"] === 2);
check("F3.6 both ends of post-processing are recorded", first.coreTokens === 2400 && first.finalTokens === 1800);
check("F3.7 the skill mode is recorded", first.mode === "full");
check("F3.8 the client that connected is recorded", first.client === "claude-code/2.4.1");
check("F3.9 a resource read is marked as one", events[2].resource === true);
check("F3.10 the project has its own id", typeof telemetry.projectId() === "string" && telemetry.projectId().length > 0);
check("F3.11 the project id file lives with the project", existsSync(join(projectPaths.dir, "project-id")));

// The sample session records its last call with RULE_MCP_NO_PROMPTS=1.
const quiet = events.at(-1);

check("F3.12 the kill switch drops the prompt text", quiet.prompt === undefined);
check("F3.13 and keeps the length", quiet.promptLength === "a secret product plan".length);
check("F3.14 the quiet call is stamped in the session", quiet.ts === T0 + 300_000);

finish();



/**
 * @module test/flight-recorder/usage-pi-claude
 *
 * F4: usage comes from the coding agent's own transcript - the adapter
 * registry, and the pi and Claude Code readers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, writePiFixture } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: pi and claude usage");
const { workspace, project } = makeSandbox();

const { AGENT_TRANSCRIPTS, readAgentUsage, supportedAgents, unsupportedAgents } = await import("../../../agents/transcripts/index.js");

check(
  "F4 every adapter names the agent it reads",
  AGENT_TRANSCRIPTS.every((a) => typeof a.agent === "string"),
);
check("F4.1 pi is supported", supportedAgents().includes("pi"));
check("F4.2 claude is supported", supportedAgents().includes("claude"));
check("F4.3 codex is supported", supportedAgents().includes("codex"));
check("F4.4 opencode is supported", supportedAgents().includes("opencode"));
check(
  "F4.5 an agent with no machine-readable usage says so instead of guessing",
  unsupportedAgents().every((a) => typeof a.reason === "string" && a.reason.length > 0),
);

// pi: one JSONL per session, usage and cost per assistant message.
const fake = writePiFixture(workspace, project);
const piUsage = readAgentUsage({ agent: "pi", projectDir: project, home: fake });

check("F4.6 pi output tokens are summed", piUsage.output === 600);
check("F4.7 pi cache reads are summed", piUsage.cacheRead === 52_992);
check("F4.8 pi peak context is the maximum, never the sum", piUsage.peakContext === 55_433);
check("F4.9 pi cost is real money, not an estimate", Math.abs(piUsage.costUsd - 0.0128) < 1e-6);
check("F4.10 pi api calls are counted", piUsage.apiCalls === 2);
check("F4.11 pi user turns are counted", piUsage.userTurns === 1);
check("F4.11.1 a pi tool result is not a user turn", piUsage.userTurns === 1 && piUsage.apiCalls === 2);
check("F4.12 pi reports the model", piUsage.model === "deepseek-v4-flash");

// claude: message.usage, Anthropic field names, no cost.
const claudeDir = join(fake, ".claude", "projects", project.replaceAll("/", "-"));

mkdirSync(claudeDir, { recursive: true });
writeFileSync(
  join(claudeDir, "session.jsonl"),
  [
    JSON.stringify({ type: "user", message: { role: "user", content: "usa rule-mcp MCP" } }),
    // Claude Code returns tool results as user-role rows: 196 of them against
    // 3 prompts in the transcript this was checked against.
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } }),
    JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-opus-5",
        usage: {
          input_tokens: 2,
          cache_creation_input_tokens: 27_930,
          cache_read_input_tokens: 29_652,
          output_tokens: 435,
          output_tokens_details: { thinking_tokens: 208 },
        },
      },
    }),
  ].join("\n") + "\n",
);

const claudeUsage = readAgentUsage({ agent: "claude", projectDir: project, home: fake });

check("F4.13 claude cache writes are read from cache_creation", claudeUsage.cacheWrite === 27_930);
check("F4.14 claude reasoning comes from thinking tokens", claudeUsage.reasoning === 208);
check("F4.15 claude peak context adds the cached input back", claudeUsage.peakContext === 2 + 29_652 + 27_930);
check("F4.16 claude reports no cost rather than a fabricated one", claudeUsage.costUsd === undefined);
check("F4.16.1 a claude tool result is not a user turn", claudeUsage.userTurns === 1);

finish();

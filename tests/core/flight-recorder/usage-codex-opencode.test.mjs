/**
 * @module test/flight-recorder/usage-codex-opencode
 *
 * F4 (continued): the codex rolling-count reader and the opencode
 * message-store reader.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: codex and opencode usage");
const { workspace, project } = makeSandbox();
const fake = join(workspace, "agents");

const { readAgentUsage } = await import("../../../src/core/agents/transcripts/index.js");

// codex: a rolling token_count event, cumulative by design.
const codexDir = join(fake, ".codex", "sessions", "2026", "07", "11");

mkdirSync(codexDir, { recursive: true });
writeFileSync(
  join(codexDir, "rollout-2026-07-11T13-05-52-abc.jsonl"),
  [
    JSON.stringify({ type: "session_meta", payload: { cwd: project, model_provider: "openai" } }),
    JSON.stringify({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 250_516,
            cached_input_tokens: 200_000,
            output_tokens: 40_322,
            reasoning_output_tokens: 10_518,
            total_tokens: 290_838,
          },
          last_token_usage: { total_tokens: 189_673 },
          model_context_window: 372_000,
        },
      },
    }),
  ].join("\n") + "\n",
);

const codexUsage = readAgentUsage({ agent: "codex", projectDir: project, home: fake });

check("F4.17 codex totals are taken from the last rolling count", codexUsage.output === 40_322);
check("F4.18 codex reports the context window it was given", codexUsage.contextWindow === 372_000);
check("F4.19 codex peak context is the largest single call", codexUsage.peakContext === 189_673);

// opencode: one JSON per message, keyed by session directory.
const openDir = join(fake, ".local", "share", "opencode", "storage", "message", "ses_1");

mkdirSync(openDir, { recursive: true });
writeFileSync(
  join(openDir, "msg_1.json"),
  JSON.stringify({
    role: "assistant",
    modelID: "big-pickle",
    providerID: "opencode",
    path: { cwd: project, root: project },
    cost: 0.25,
    time: { created: T0 + 1000 },
    tokens: { input: 250, output: 1593, reasoning: 0, cache: { read: 19_968, write: 0 } },
  }),
);
// An opencode user message carries no `path` at all: it belongs to the project
// only through the session directory it shares with the assistant messages.
writeFileSync(join(openDir, "msg_0.json"), JSON.stringify({ role: "user", time: { created: T0 } }));

const openUsage = readAgentUsage({ agent: "opencode", projectDir: project, home: fake });

check("F4.20 opencode reads nested cache counters", openUsage.cacheRead === 19_968);
check("F4.21 opencode matches the project by its recorded root", openUsage.output === 1593);
check("F4.21.1 an opencode user turn is found through its session, not its path", openUsage.userTurns === 1);

finish();

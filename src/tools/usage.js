/**
 * @module tools/usage
 *
 * `rule_tool_usage`: the agent tells this server what the model cost.
 *
 * This server never calls a model, so the figures that decide whether a session
 * was expensive belong to whoever did. Most agents write them to disk and
 * `core/agent-transcripts` reads them from there, which is the preferred path
 * because it is evidence rather than testimony. This tool is the fallback for
 * an agent whose usage is not on disk in a form anyone can parse.
 *
 * What is declared here is stamped `sidecar` and stays behind a transcript
 * whenever one exists. A benchmark that cannot say which of its numbers were
 * measured is not a benchmark.
 *
 * @see module:core/agents/transcripts - the agents whose usage is read directly
 * @see module:core/telemetry/flight - what the declaration ends up in
 */

import { z } from "zod/v4";
import { unsupportedAgents } from "../core/agents/transcripts/index.js";
import { writeSidecarUsage } from "../core/telemetry/_store.js";
import { telemetryEnabled } from "../core/telemetry/_telemetry.js";
import { clientInfo } from "../core/telemetry/_telemetry.js";
import { registerTool } from "./router/index.js";

/** A usage declaration is a handful of integers; anything larger is not one. */
const MAX_DECLARED_BYTES = 4096;

/** Register the rule_tool_usage tool. */
export function registerUsageTool() {
  const UsageSchema = z.object({
    model: z.string().optional(),
    provider: z.string().optional(),
    apiCalls: z.number().int().nonnegative().optional(),
    userTurns: z.number().int().nonnegative().optional(),
    input: z.number().int().nonnegative().optional(),
    output: z.number().int().nonnegative().optional(),
    cacheRead: z.number().int().nonnegative().optional(),
    cacheWrite: z.number().int().nonnegative().optional(),
    reasoning: z.number().int().nonnegative().optional(),
    peakContext: z.number().int().nonnegative().optional(),
    contextWindow: z.number().int().nonnegative().optional(),
    costUsd: z.number().nonnegative().optional(),
    agent: z.string().optional(),
  });

  registerTool({
    name: "rule_tool_usage",
    description:
      "Declare an agent usage sidecar for this project when no transcript can be read: input/output tokens, cost.",
    zodSchema: UsageSchema,
    handler: async (arguments_) => {
      if (!telemetryEnabled()) {
        return {
          content: [
            { type: "text", text: "Telemetry is disabled (RULE_MCP_NO_TELEMETRY=1). Nothing was recorded." },
          ],
        };
      }

      const declared = Object.fromEntries(Object.entries(arguments_).filter(([, value]) => value !== undefined));

      if (Object.keys(declared).length === 0) {
        const rows = unsupportedAgents().map((entry) => `  ${entry.agent}: ${entry.reason}`);

        return {
          content: [
            {
              type: "text",
              text: [
                "Nothing to record: pass at least one figure.",
                "",
                "Agents whose usage cannot be read from disk, and why:",
                ...rows,
              ].join("\n"),
            },
          ],
        };
      }
      // A declaration is a claim, not a measurement: stamp who made it and
      // when, and refuse an oversize body outright (hardening 1.6, F-S8).
      const serialized = JSON.stringify(declared);

      if (Buffer.byteLength(serialized, "utf8") > MAX_DECLARED_BYTES) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Declared usage is larger than ${MAX_DECLARED_BYTES} bytes. Send the figures, not a transcript.`,
            },
          ],
        };
      }

      const stored = writeSidecarUsage({
        ...declared,
        declaredAt: Date.now(),
        declaredBy: clientInfo() ?? "unknown",
      });

      return {
        content: [
          {
            type: "text",
            text: stored
              ? `Recorded ${Object.keys(declared).length} figure(s) as declared usage. A readable agent transcript still takes precedence.`
              : "Could not write the declared usage. Nothing else is affected.",
          },
        ],
      };
    },
  });
}

/** Register the rule_tool_gateway orchestration tool. */
import { GATEWAY_CORE_TOOL, gatewayCoreArguments, computeGatewayCore } from "./_core.js";
import { renderGatewayReply } from "./_render.js";

/**
 * Register the single-entry orchestrator: route → evidence → guardrails →
 * receipt, with the deterministic core cached and the receipt always fresh.
 */
export async function registerGatewayTool() {
  const { registerTool } = await import("../router/index.js");
  const { z } = await import("zod/v4");

  const GatewaySchema = z.object({
    prompt: z.string().describe("Complete coding request"),
    code: z.string().optional().describe("Code to validate against guardrails (single file)"),
    files: z
      .array(
        z.object({
          path: z.string().describe("Relative file path within the project"),
          content: z.string().describe("File content to validate"),
        }),
      )
      .optional()
      .describe("Files to validate - yields a path-bound receipt, required for multi-file writes"),
    path: z.string().optional().describe("Project path for framework auto-detection"),
    framework: z.string().optional().describe("Target framework (react, vue, svelte, angular, solid, astro, vanilla, express, fastify, nestjs, hono)"),
  });

  registerTool({
    name: "rule_tool_gateway",
    description:
      "Single-entry orchestrator: routes prompt → loads skill evidence → checks code against guardrails → returns receipt. " +
      "Use this as the primary entry point instead of calling rule + skill tools separately. " +
      "The returned receipt must be passed to rule_tool_apply when writing files.",
    zodSchema: GatewaySchema,
    handler: async (arguments_) => {
      const { code, files, path } = arguments_;
      // A file set yields a path-bound receipt; a bare `code` string cannot name
      // a destination, so it stays limited to the single-file write.
      const fileSet = Array.isArray(files) && files.length > 0 ? files : null;
      const lines = [];

      // ── Token-saving: nudge the agent toward the code graph when present ──
      const { tokensaveActive, TOKENSAVE_DIRECTIVE } = await import("../../core/agents/_integrations.js");

      if (path && tokensaveActive(path)) {
        lines.push(TOKENSAVE_DIRECTIVE, "");
      }

      // ── Deterministic core cache (the routing evidence split) ──
      //
      // The route, the evidence it loaded and the guardrail verdict are pure
      // functions of the arguments: caching them makes a repeat call skip the
      // routing + evidence reads. The receipt is NEVER part of the core - it is
      // minted per call, bound to the content of THIS call and expiring from the
      // current clock, so a replay can never hand back a stale token.
      const { cacheLookup, cacheStore, skillDigest } = await import("../../core/cache/tool-cache/index.js");
      const coreArgs = gatewayCoreArguments(arguments_);
      const cached = cacheLookup(GATEWAY_CORE_TOOL, coreArgs);
      let core = cached?.result;

      if (!core) {
        core = await computeGatewayCore(arguments_, fileSet);

        // The answer depends on the skill whose evidence produced it; the
        // guardrail corpus is deterministic. This is what lets one skill edit
        // invalidate exactly these entries (cache-invalidation).
        const deps = {};
        const primarySkill = core.effectiveRoute?.startsWith("rule-") ? core.effectiveRoute : null;

        if (primarySkill) {
          const digest = skillDigest(primarySkill);

          if (digest) {
            deps[primarySkill] = digest;
          }
        }

        cacheStore(GATEWAY_CORE_TOOL, coreArgs, core, deps);
      }

      const { response, receipt, checkResult } = renderGatewayReply(core, arguments_, fileSet, lines);

      return {
        content: [
          { type: "text", text: lines.join("\n") },
          { type: "text", text: `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\`` },
        ],
        _meta: {
          pixGateway: {
            route: core.effectiveRoute,
            checkPerformed: !!(fileSet || code),
            allPass: checkResult?.allPass ?? null,
            receiptIssued: !!receipt,
          },
        },
      };
    },
  });
}

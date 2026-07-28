/**
 * @module tools/gateway
 *
 * pix_gateway — Single-entry orchestrator tool.
 *
 * Combines routing, evidence loading, and guardrail checking
 * into one atomic server-side operation. The model receives
 * everything in one response — no multi-step hop.
 *
 * Input:  { prompt, code?, path?, framework? }
 * Output: { route, evidence, checkResult?, receipt?, nextTools }
 */

import { createHmac, randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

/**
 * In-memory receipt store (cleared on server restart).
 * Maps receipt token → { codeHash, skillName, allPass, expiresAt }
 */
const receiptStore = new Map();

/** Server secret for receipt signing (generated once per process). */
let SERVER_SECRET = null;

function getServerSecret() {
  if (!SERVER_SECRET) SERVER_SECRET = randomUUID();
  return SERVER_SECRET;
}

/**
 * Generate a receipt for validated code.
 * The receipt binds code hash + skill + pass status.
 *
 * @param {string} code - The code that was checked
 * @param {string} skillName - Skill used for validation
 * @param {boolean} allPass - Whether all guardrails passed
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {string} receipt token
 */
export function issueReceipt(code, skillName, allPass, now = Date.now()) {
  const codeHash = createHash("sha256").update(code).digest("hex");
  const payload = `${codeHash}:${skillName}:${allPass}:${now}`;
  const token = createHmac("sha256", getServerSecret()).update(payload).digest("hex");
  receiptStore.set(token, {
    codeHash,
    skillName,
    allPass,
    expiresAt: now + 300_000, // 5 min TTL
  });
  // Cleanup receipts that expired over 5 min ago (i.e. issued > 10 min back)
  for (const [key, val] of receiptStore) {
    if (now - val.expiresAt > 300_000) receiptStore.delete(key);
  }
  return token;
}

/**
 * Validate a receipt against current code.
 *
 * @param {string} token - Receipt from pix_gateway
 * @param {string} code - Code to validate against
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {{ valid: boolean, allPass?: boolean, reason?: string }}
 */
export function validateReceipt(token, code, now = Date.now()) {
  const entry = receiptStore.get(token);
  if (!entry) return { valid: false, reason: "Receipt not found or expired" };
  // Enforce the TTL at validation time — an expired receipt must never pass.
  if (now > entry.expiresAt) {
    receiptStore.delete(token);
    return { valid: false, reason: "Receipt expired — re-run pix_gateway" };
  }
  const codeHash = createHash("sha256").update(code).digest("hex");
  if (codeHash !== entry.codeHash) return { valid: false, reason: "Code hash mismatch — code was modified after check" };
  if (!entry.allPass) return { valid: false, allPass: false, reason: "Guardrails did not pass" };
  return { valid: true, allPass: true };
}

/**
 * Register the pix_gateway orchestration tool.
 */
export async function registerGatewayTool() {
  const { registerTool } = await import("./router.js");
  const { z } = await import("zod/v4");

  const GatewaySchema = z.object({
    prompt: z.string().describe("Complete coding request"),
    code: z.string().optional().describe("Code to validate against guardrails"),
    path: z.string().optional().describe("Project path for framework auto-detection"),
    framework: z.string().optional().describe("Target framework (react, vue, svelte, angular, solid, astro, vanilla, express, fastify, nestjs, hono)"),
  });

  registerTool({
    name: "pix_gateway",
    description:
      "Single-entry orchestrator: routes prompt → loads skill evidence → checks code against guardrails → returns receipt. " +
      "Use this as the primary entry point instead of calling rule + skill tools separately. " +
      "The returned receipt must be passed to pix_apply when writing files.",
    zodSchema: GatewaySchema,
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Complete coding request" },
        code: { type: "string", description: "Code to validate" },
        path: { type: "string", description: "Project path" },
        framework: { type: "string", description: "Target framework" },
      },
      required: ["prompt"],
    },
    handler: async (args) => {
      const { prompt, code, path, framework } = args;
      const lines = [];

      // ── Token-saving: nudge the agent toward the code graph when present ──
      const { tokensaveActive, TOKENSAVE_DIRECTIVE } = await import("../core/agent-integrations.js");
      if (path && tokensaveActive(path)) {
        lines.push(TOKENSAVE_DIRECTIVE);
        lines.push("");
      }

      // ── Step 1: Route the prompt ──
      const { callTool } = await import("./router.js");
      const routeResult = await callTool("rule", { prompt, ...(path ? { path } : {}), ...(framework ? { framework } : {}) });
      let route = { route: "unknown", confidence: 0, sections: [], next_tools: [] };
      try {
        const parsed = JSON.parse(routeResult.content[0]?.text || "{}");
        route = parsed;
      } catch { /* keep defaults */ }

      // ── Domain override: when framework is backend/data/devops, force correct domain skill ──
      const BACKEND_FRAMEWORKS = ["express", "fastify", "nestjs", "hono"];
      const DOMAIN_OVERRIDE = {
        express: "rule-backend-express", fastify: "rule-backend-fastify",
        nestjs: "rule-backend-nestjs", hono: "rule-backend-hono",
        postgresql: "rule-data-postgresql", mysql: "rule-data-mysql",
        mongodb: "rule-data-mongodb", sqlite: "rule-data-sqlite",
        duckdb: "rule-data-duckdb", sql: "rule-data-sql",
        docker: "rule-devops-docker", "gitlab-ci": "rule-devops-gitlab-ci",
      };
      // If the router gave us a frontend skill but framework is backend, override
      const isBackendFramework = framework && BACKEND_FRAMEWORKS.includes(framework);
      const isFrontendRoute = route.route?.startsWith("rule-frontend") || route.route?.startsWith("rule-platform");
      const effectiveRoute = (isBackendFramework && isFrontendRoute)
        ? (DOMAIN_OVERRIDE[framework] || `rule-backend-${framework}`)
        : route.route;

      lines.push(`## Route: ${effectiveRoute} (confidence: ${Math.round((route.confidence || 0) * 100)}%)`);
      if (route.sections?.length) {
        lines.push(`**Matched sections:** ${route.sections.join(", ")}`);
      }
      lines.push("");

      // ── Step 2: Load primary skill evidence ──
      const primarySkill = effectiveRoute?.startsWith("rule-") ? effectiveRoute : null;
      if (primarySkill) {
        const skillResult = await callTool(
          `pix_${primarySkill.replace(/^rule-/, "").replace(/-/g, "_")}`,
          { mode: "tldr", query: prompt.slice(0, 300) }
        );
        const evidence = skillResult.content?.[0]?.text || "";
        const truncated = evidence.length > 8000
          ? evidence.slice(0, 8000) + "\n\n... (truncated, use pix_* tool for full content)"
          : evidence;
        lines.push("## Evidence");
        lines.push("");
        lines.push(truncated);
        lines.push("");
      }

      // ── Step 3: Run guardrails if code provided ──
      let checkResult = null;
      let receipt = null;
      if (code) {
        const skillName = primarySkill || "rule-ui-design-system";
        const { checkCode } = await import("../core/guardrails.js");
        const result = checkCode(skillName, code, {
          framework: framework || "vanilla",
          fileName: "code",
          isComponent: false,
          // Don't restrict dependencies for backend code
        });

        lines.push("## Guardrail Check");
        lines.push("");
        if (result.allPass) {
          lines.push(`✅ All ${result.total} guardrails pass.`);
          // Issue receipt only on full pass
          receipt = issueReceipt(code, skillName, true);
          lines.push(`**Receipt:** \`${receipt}\` (valid 5 min, pass to pix_apply)`);
        } else {
          lines.push(`❌ ${result.failCount} guardrails FAIL. Fix and re-check via pix_gateway.`);
          for (const f of result.failed) {
            lines.push(`- **${f.id}**: ${f.label} — ${f.suggestion}`);
          }
        }
        lines.push("");
        checkResult = {
          allPass: result.allPass,
          failCount: result.failCount,
          passCount: result.passCount,
          total: result.total,
          failed: result.failed.map(f => ({ id: f.id, label: f.label, suggestion: f.suggestion })),
        };
      }

      // ── Step 4: Next tools hint ──
      const nextTools = [...new Set([
        ...(route.next_tools || []),
        "pix_gateway",
        "pix_apply",
        "pix_search",
      ])].slice(0, 10);
      lines.push("## Next Steps");
      lines.push("");
      lines.push(`Available tools: ${nextTools.join(", ")}`);
      lines.push(receipt
        ? `\nTo write files, call pix_apply with the receipt above. The receipt proves pix_gateway validated this exact code.`
        : `\nFix failures, then run pix_gateway again with the updated code.`);

      const response = {
        route: effectiveRoute,
        originalRoute: route.route !== effectiveRoute ? route.route : undefined,
        confidence: route.confidence,
        evidence_loaded: !!primarySkill,
        checkResult,
        receipt,
        next_tools: nextTools,
      };

      return {
        content: [
          { type: "text", text: lines.join("\n") },
          { type: "text", text: `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\`` },
        ],
        _meta: {
          pixGateway: {
            route: effectiveRoute,
            checkPerformed: !!code,
            allPass: checkResult?.allPass ?? null,
            receiptIssued: !!receipt,
          },
        },
      };
    },
  });
}

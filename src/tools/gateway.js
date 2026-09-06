/**
 * @module tools/gateway
 *
 * rule_tool_gateway - Single-entry orchestrator tool.
 *
 * Combines routing, evidence loading, and guardrail checking
 * into one atomic server-side operation. The model receives
 * everything in one response - no multi-step hop.
 *
 * Input:  { prompt, code?, files?, path?, framework? }
 * Output: { route, evidence, checkResult?, receipt?, nextTools }
 */

import { createHmac, randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

/**
 * In-memory receipt store (cleared on server restart).
 * Maps receipt token → { codeHash, binding, skillName, allPass, expiresAt }
 *
 * `binding` records WHAT the receipt proves:
 *   - "content" - a hash of the checked code, no destination bound
 *   - "files"   - a hash of the ordered (path, content) tuples that were checked
 *
 * The two are never interchangeable. A caller that could downgrade a path-bound
 * receipt to the content-only check would simply pick the weaker one.
 */
/**
 * The cache name the gateway's deterministic core is stored under.
 *
 * Distinct from the gateway tool itself, which is on the cache denylist: the
 * core (route, evidence, guardrail verdict) is a pure function of the
 * arguments, while the receipt must be minted per call. Storing them under
 * different names is what lets the split stay honest (see
 * test/gateway-cache-receipt.test.mjs).
 */
export const GATEWAY_CORE_TOOL = "rule_tool_gateway_core";

/**
 * The arguments the core cache key is derived from.
 *
 * A full call also carries fields that must change the answer (file content,
 * prompt); nothing is dropped here - the projection exists so a future
 * caller can narrow it deliberately. Different content, different key.
 *
 * @param {object} args - the raw gateway arguments
 * @returns {object}
 */
export function gatewayCoreArguments(args) {
  return { ...args };
}

const receiptStore = new Map();

/** Receipt lifetime (ms). */
const RECEIPT_TTL_MS = 300_000;

/**
 * Canonical digest of a file set: length-prefixed path AND content, in order.
 *
 * The previous digest hashed `contents.join("\n---FILE---\n")`, an in-band
 * separator that made [{a:"X\n---FILE---\nY"}] and [{a:"X"},{b:"Y"}] collide -
 * and it never covered paths at all, so a receipt earned for benign code
 * authorized writing that code to `.git/hooks/pre-commit`. Length prefixes make
 * every field unambiguous; including the path binds the destination.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @returns {string} sha256 hex
 */
export function canonicalFilesDigest(files) {
  const hash = createHash("sha256");
  hash.update(`files:${files.length}\n`);

  for (const file of files) {
    const path = String(file?.path ?? "");
    const content = String(file?.content ?? "");
    hash.update(`${Buffer.byteLength(path, "utf8")}:${path}\n`);
    hash.update(`${Buffer.byteLength(content, "utf8")}:`);
    hash.update(content, "utf8");
    hash.update("\n");
  }

  return hash.digest("hex");
}

/** Server secret for receipt signing (generated once per process). */
let SERVER_SECRET = null;

function getServerSecret() {
  if (!SERVER_SECRET) {
    SERVER_SECRET = randomUUID();
  }

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

  return storeReceipt({ codeHash, binding: "content", skillName, allPass, now });
}

/**
 * Generate a PATH-BOUND receipt: the digest covers the ordered
 * (path, content) tuples, so the receipt authorizes writing exactly these
 * contents to exactly these destinations and nothing else.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @param {string} skillName - Skill used for validation
 * @param {boolean} allPass - Whether all guardrails passed
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {string} receipt token
 */
export function issueFilesReceipt(files, skillName, allPass, now = Date.now()) {
  return storeReceipt({
    codeHash: canonicalFilesDigest(files),
    binding: "files",
    skillName,
    allPass,
    now,
  });
}

/** Sign an entry, store it, and evict long-expired receipts. */
function storeReceipt({ codeHash, binding, skillName, allPass, now }) {
  const payload = `${binding}:${codeHash}:${skillName}:${allPass}:${now}`;
  const token = createHmac("sha256", getServerSecret()).update(payload).digest("hex");
  receiptStore.set(token, { codeHash, binding, skillName, allPass, expiresAt: now + RECEIPT_TTL_MS });
  // Cleanup receipts that expired over one TTL ago (i.e. issued > 2xTTL back).
  for (const [key, value] of receiptStore) {
    if (now - value.expiresAt > RECEIPT_TTL_MS) {
      receiptStore.delete(key);
    }
  }

  return token;
}

/** Shared checks: existence, TTL, guardrail outcome. */
function openReceipt(token, now) {
  const entry = receiptStore.get(token);

  if (!entry) {
    return { error: "Receipt not found or expired" };
  }

  if (now > entry.expiresAt) {
    receiptStore.delete(token);

    return { error: "Receipt expired - re-run pix_gateway" };
  }

  return { entry };
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
  const { entry, error } = openReceipt(token, now);

  if (error) {
    return { valid: false, reason: error };
  }
  // A path-bound receipt must never be checked through the content-only route:
  // that would let the caller drop the destination binding at will.
  if (entry.binding === "files") {
    return { valid: false, reason: "Receipt is path-bound - validate it against the file set, not the raw code" };
  }

  const codeHash = createHash("sha256").update(code).digest("hex");

  if (codeHash !== entry.codeHash) {
    return { valid: false, reason: "Code hash mismatch - code was modified after check" };
  }

  if (!entry.allPass) {
    return { valid: false, allPass: false, reason: "Guardrails did not pass" };
  }

  return { valid: true, allPass: true };
}

/**
 * Validate a receipt for an actual write, i.e. against the file set that
 * pix_apply is about to put on disk. This is the only validation the write
 * path uses; it accepts both bindings and states which one carried the proof.
 *
 * - "files"   receipt: the ordered (path, content) tuples must match exactly.
 * - "content" receipt: single-file flow only. The gateway issues these
 *   from a bare `code` string, which cannot describe more than one destination,
 *   so a multi-file write requires the path-bound flow.
 *
 * @param {string} token - Receipt from pix_gateway
 * @param {Array<{ path: string, content: string }>} files - Files to be written
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {{ valid: boolean, binding?: "files"|"content", allPass?: boolean, reason?: string }}
 */
export function validateApply(token, files, now = Date.now()) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, reason: "No files to validate" };
  }

  const { entry, error } = openReceipt(token, now);

  if (error) {
    return { valid: false, reason: error };
  }

  if (entry.binding === "files") {
    if (canonicalFilesDigest(files) !== entry.codeHash) {
      return {
        valid: false,
        binding: "files",
        reason: "File set mismatch - paths, contents, order, or file count differ from what was checked",
      };
    }
  } else {
    if (files.length > 1) {
      return {
        valid: false,
        binding: "content",
        reason:
          "Content-only receipt cannot authorize a multi-file write - pass `files` to pix_gateway for a path-bound receipt",
      };
    }

    const codeHash = createHash("sha256")
      .update(String(files[0].content ?? ""))
      .digest("hex");

    if (codeHash !== entry.codeHash) {
      return { valid: false, binding: "content", reason: "Code hash mismatch - code was modified after check" };
    }
  }

  if (!entry.allPass) {
    return { valid: false, binding: entry.binding, allPass: false, reason: "Guardrails did not pass" };
  }

  return { valid: true, binding: entry.binding, allPass: true };
}

/**
 * Register the rule_tool_gateway orchestration tool.
 */
export async function registerGatewayTool() {
  const { registerTool } = await import("./router/index.js");
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
    framework: z
      .string()
      .optional()
      .describe(
        "Target framework (react, vue, svelte, angular, solid, astro, vanilla, express, fastify, nestjs, hono)",
      ),
  });

  registerTool({
    name: "rule_tool_gateway",
    description:
      "Single-entry orchestrator: routes prompt → loads skill evidence → checks code against guardrails → returns receipt. " +
      "Use this as the primary entry point instead of calling rule + skill tools separately. " +
      "The returned receipt must be passed to pix_apply when writing files.",
    zodSchema: GatewaySchema,
    handler: async (arguments_) => {
      const { prompt, code, files, path, framework } = arguments_;
      // A file set yields a path-bound receipt; a bare `code` string cannot name
      // a destination, so it stays limited to the single-file write.
      const fileSet = Array.isArray(files) && files.length > 0 ? files : null;
      const lines = [];

      // ── Token-saving: nudge the agent toward the code graph when present ──
      const { tokensaveActive, TOKENSAVE_DIRECTIVE } = await import("../core/agent-integrations.js");

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
      const { cacheLookup, cacheStore, skillDigest } = await import("../core/tool-cache.js");
      const coreArgs = gatewayCoreArguments(arguments_);
      const cached = cacheLookup(GATEWAY_CORE_TOOL, coreArgs);
      let core = cached?.result;

      if (!core) {
        // ── Step 1: Route the prompt ──
        const { callTool } = await import("./router/index.js");
        const routeResult = await callTool("pix_tool", {
          prompt,
          ...(path && { path }),
          ...(framework && { framework }),
        });
        let route = { route: "unknown", confidence: 0, sections: [], next_tools: [] };
        try {
          const parsed = JSON.parse(routeResult.content[0]?.text || "{}");
          route = parsed;
        } catch {
          /* keep defaults */
        }

        // ── Domain override: when framework is backend/data/devops, force correct domain skill ──
        const BACKEND_FRAMEWORKS = ["express", "fastify", "nestjs", "hono"];
        const DOMAIN_OVERRIDE = {
          express: "rule-backend-express",
          fastify: "rule-backend-fastify",
          nestjs: "rule-backend-nestjs",
          hono: "rule-backend-hono",
          postgresql: "rule-data-postgresql",
          mysql: "rule-data-mysql",
          mongodb: "rule-data-mongodb",
          sqlite: "rule-data-sqlite",
          duckdb: "rule-data-duckdb",
          sql: "rule-data-sql",
          docker: "rule-devops-docker",
          "gitlab-ci": "rule-devops-gitlab-ci",
        };
        const isBackendFramework = framework && BACKEND_FRAMEWORKS.includes(framework);
        const isFrontendRoute = route.route?.startsWith("rule-frontend") || route.route?.startsWith("rule-platform");
        const effectiveRoute =
          isBackendFramework && isFrontendRoute
            ? DOMAIN_OVERRIDE[framework] || `rule-backend-${framework}`
            : route.route;
        const primarySkill = effectiveRoute?.startsWith("rule-") ? effectiveRoute : null;

        // ── Step 2: Load primary skill evidence ──
        let evidence = "";

        if (primarySkill) {
          const skillResult = await callTool(`pix_${primarySkill.replace(/^rule-/, "").replaceAll("-", "_")}`, {
            mode: "tldr",
            query: prompt.slice(0, 300),
          });
          evidence = skillResult.content?.[0]?.text || "";
        }

        // ── Step 3: Run guardrails if code provided ──
        let checkResult = null;

        if (fileSet || code) {
          const skillName = primarySkill || "rule-ui-design-system";
          const { checkCodeGuarded } = await import("../core/guardrails-guarded.js");
          const checkContext = {
            framework: framework || "vanilla",
            isComponent: false,
          };

          const units = fileSet
            ? fileSet.map((file) => ({ label: file.path, code: file.content }))
            : [{ label: "code", code }];
          const checks = await Promise.all(
            units.map(async (unit) => ({
              label: unit.label,
              result: await checkCodeGuarded(skillName, unit.code, { ...checkContext, fileName: unit.label }),
            })),
          );

          const total = checks.reduce((sum, entry) => sum + entry.result.total, 0);
          const failCount = checks.reduce((sum, entry) => sum + entry.result.failCount, 0);
          const passCount = checks.reduce((sum, entry) => sum + entry.result.passCount, 0);
          const failed = checks.flatMap((entry) =>
            entry.result.failed.map((f) => ({
              id: f.id,
              label: f.label,
              suggestion: f.suggestion,
              ...(fileSet && { file: entry.label }),
            })),
          );

          checkResult = { allPass: checks.every((entry) => entry.result.allPass), failCount, passCount, total, failed };
        }

        core = {
          effectiveRoute,
          originalRoute: route.route === effectiveRoute ? undefined : route.route,
          confidence: route.confidence,
          matchedSections: route.sections ?? [],
          evidence,
          checkResult,
          routeNextTools: route.next_tools ?? [],
        };

        // The answer depends on the skill whose evidence produced it; the
        // guardrail corpus is deterministic. This is what lets one skill edit
        // invalidate exactly these entries (cache-invalidation).
        const deps = {};

        if (primarySkill) {
          const digest = skillDigest(primarySkill);

          if (digest) {
            deps[primarySkill] = digest;
          }
        }

        cacheStore(GATEWAY_CORE_TOOL, coreArgs, core, deps);
      }

      // ── Render (shared by cache hit and miss; the receipt is always fresh) ──
      const effectiveRoute = core.effectiveRoute;
      const route = {
        route: core.effectiveRoute,
        confidence: core.confidence,
        sections: core.matchedSections,
        next_tools: core.routeNextTools,
      };
      const primarySkill = effectiveRoute?.startsWith("rule-") ? effectiveRoute : null;
      const checkResult = core.checkResult;
      const truncated =
        core.evidence.length > 8000
          ? core.evidence.slice(0, 8000) + "\n\n... (truncated, use pix_* tool for full content)"
          : core.evidence;

      lines.push(`## Route: ${effectiveRoute} (confidence: ${Math.round((route.confidence || 0) * 100)}%)`);

      if (route.sections?.length) {
        lines.push(`**Matched sections:** ${route.sections.join(", ")}`);
      }

      lines.push("");

      if (primarySkill) {
        lines.push("## Evidence", "", truncated, "");
      }

      // ── Step 3 (render): guardrails and the fresh receipt ──
      let receipt = null;

      if (fileSet || code) {
        const skillName = primarySkill || "rule-ui-design-system";
        lines.push("## Guardrail Check", "");

        if (checkResult.allPass) {
          lines.push(
            `✅ All ${checkResult.total} guardrails pass${fileSet ? ` across ${fileSet.length} file(s)` : ""}.`,
          );
          // Issue receipt only on full pass: minted HERE, on every call, so a
          // cache hit still gets a token bound to this call and expiring now.
          receipt = fileSet ? issueFilesReceipt(fileSet, skillName, true) : issueReceipt(code, skillName, true);
          lines.push(
            `**Receipt:** \`${receipt}\` (valid 5 min, pass to pix_apply)`,
            fileSet
              ? "Bound to these exact paths and contents - writing elsewhere is refused."
              : "Content-only receipt: authorizes a single-file write. Pass `files` here for a path-bound receipt.",
          );
        } else {
          lines.push(`❌ ${checkResult.failCount} guardrails FAIL. Fix and re-check via pix_gateway.`);

          for (const f of checkResult.failed) {
            lines.push(`- **${f.id}**${f.file ? ` (${f.file})` : ""}: ${f.label} - ${f.suggestion}`);
          }
        }

        lines.push("");
      }
      // ── Step 4: Next tools hint ──
      const nextTools = [...new Set([...(route.next_tools || []), "pix_gateway", "pix_apply", "pix_search"])].slice(
        0,
        10,
      );
      lines.push("## Next Steps", "");
      lines.push(
        `Available tools: ${nextTools.join(", ")}`,
        receipt
          ? `\nTo write files, call pix_apply with the receipt above. The receipt proves pix_gateway validated this exact code.`
          : `\nFix failures, then run pix_gateway again with the updated code.`,
      );

      const response = {
        route: effectiveRoute,
        originalRoute: route.route === effectiveRoute ? undefined : route.route,
        confidence: route.confidence,
        evidence_loaded: !!primarySkill,
        checkResult,
        receipt,
        receipt_binding: receipt ? (fileSet ? "files" : "content") : undefined,
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
            checkPerformed: !!(fileSet || code),
            allPass: checkResult?.allPass ?? null,
            receiptIssued: !!receipt,
          },
        },
      };
    },
  });
}

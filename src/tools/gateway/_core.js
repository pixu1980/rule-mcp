/** The gateway's deterministic core: route, domain override, evidence, guardrail verdict. */

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

/** Frameworks whose gateway calls must never land on a frontend route. */
const BACKEND_FRAMEWORKS = new Set(["express", "fastify", "nestjs", "hono"]);

/** Domain override per framework, when the router picked a frontend skill. */
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
};

/**
 * Compute the deterministic core of one gateway call: the route (with domain
 * override), the loaded skill evidence, and the guardrail verdict.
 *
 * @param {{ prompt: string, code?: string, path?: string, framework?: string }} arguments_
 * @param {Array<{ path: string, content: string }>|null} fileSet
 * @returns {Promise<object>} the cacheable core
 */
export async function computeGatewayCore(arguments_, fileSet) {
  const { prompt, code, path, framework } = arguments_;

  // ── Step 1: Route the prompt ──
  const { callTool } = await import("../router/index.js");
  const routeResult = await callTool("rule_tool", {
    prompt,
    ...(path && { path }),
    ...(framework && { framework }),
  });
  let route = { route: "unknown", confidence: 0, sections: [], next_tools: [] };

  try {
    route = JSON.parse(routeResult.content[0]?.text || "{}");
  } catch {
    /* keep defaults */
  }

  // ── Domain override: when framework is backend/data/devops, force correct domain skill ──
  const isBackendFramework = framework && BACKEND_FRAMEWORKS.has(framework);
  const isFrontendRoute = route.route?.startsWith("rule-frontend") || route.route?.startsWith("rule-platform");
  const effectiveRoute = isBackendFramework && isFrontendRoute ? DOMAIN_OVERRIDE[framework] || `rule-backend-${framework}` : route.route;
  const primarySkill = effectiveRoute?.startsWith("rule-mcp-") ? effectiveRoute : null;

  // ── Step 2: Load primary skill evidence ──
  let evidence = "";

  if (primarySkill) {
    // Skill tools register under rule_tool_<skill-in-underscores>; anything else
    // resolves to "Unknown tool" and the evidence block silently carried that
    // error text instead of the skill's rules (surfaced by the coverage phase).
    const skillResult = await callTool(`rule_tool_${primarySkill.replace(/^rule-mcp-/, "").replaceAll("-", "_")}`, {
      mode: "tldr",
      query: prompt.slice(0, 300),
    });

    evidence = skillResult.content?.[0]?.text || "";
  }

  // ── Step 3: Run guardrails if code provided ──
  let checkResult = null;

  if (fileSet || code) {
    const skillName = primarySkill || "rule-ui-design-system";
    const { checkCodeGuarded } = await import("../../core/guardrails/index.js");
    const checkContext = {
      framework: framework || "vanilla",
      isComponent: false,
    };

    const units = fileSet ? fileSet.map((file) => ({ label: file.path, code: file.content })) : [{ label: "code", code }];
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

  return {
    effectiveRoute,
    originalRoute: route.route === effectiveRoute ? undefined : route.route,
    confidence: route.confidence,
    matchedSections: route.sections ?? [],
    evidence,
    checkResult,
    routeNextTools: route.next_tools ?? [],
  };
}

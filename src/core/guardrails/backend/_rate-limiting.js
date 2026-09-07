/** @module core/guardrails/backend/rate-limiting */

export const rateLimiting = {
  id: "rate-limiting",
  label: "Rate limiting configured",
  description: "API endpoints should have rate limiting enabled.",
  check: (code) => {
    const isServer = /app\.(?:listen|get|post|put|delete|patch)/i.test(code) || /createServer/i.test(code) || /bootstrap\(\)/i.test(code);

    if (!isServer) {
      return { pass: true, note: "Not a server file, skipping" };
    }

    const hasRateLimit = /express-rate-limit|rateLimit\(|@fastify\/rate-limit|ThrottlerModule|@Throttle/i.test(code);

    return {
      pass: hasRateLimit,
      failCount: hasRateLimit ? 0 : 1,
      detail: hasRateLimit ? [] : ["No rate limiting detected"],
      suggestion: "Add rate limiting: express-rate-limit (Express), @fastify/rate-limit (Fastify), ThrottlerModule (NestJS).",
    };
  },
};

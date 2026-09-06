/** @module core/guardrails/backend/helmet-headers */

export const helmetHeaders = {
  id: "helmet-headers",
  label: "Security headers via helmet",
  description: "HTTP security headers should be set via helmet or framework equivalent.",
  check: (code) => {
    const isServer =
      /app\.(?:listen|get|post|use)/i.test(code) || /createServer/i.test(code) || /bootstrap\(\)/i.test(code);

    if (!isServer) {
      return { pass: true, note: "Not a server file, skipping" };
    }

    const hasHelmet = /helmet\(\)|require\(["']helmet["']\)|@fastify\/helmet|from ["']helmet["']/i.test(code);

    return {
      pass: hasHelmet,
      failCount: hasHelmet ? 0 : 1,
      detail: hasHelmet ? [] : ["No security headers detected"],
      suggestion:
        "Add helmet: app.use(helmet()) in Express, register @fastify/helmet in Fastify, app.use(helmet()) in NestJS.",
    };
  },
};

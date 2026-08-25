// Auto-split from src/core/guardrail-defs.js - see ./index.js
export const BACKEND_GUARDRAILS = [
  {
    id: "sql-injection",
    label: "No SQL injection via string concatenation",
    description:
      "All SQL queries must use parameterized placeholders ($1, ?, :name). No string concatenation with user input.",
    check: (code) => {
      const concatPatterns = [
        /db\.query\(["']SELECT[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']INSERT[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']UPDATE[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']DELETE[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(`SELECT[^`]*\${/gi,
        /db\.query\(`INSERT[^`]*\${/gi,
        /db\.query\(`UPDATE[^`]*\${/gi,
        /db\.query\(`DELETE[^`]*\${/gi,
        /\.query\(["']SELECT.*["']\s*\+\s*req\./gi,
        /\.query\(["']SELECT.*["']\s*\+\s*ctx\./gi,
      ];
      const violations = [];
      for (const re of concatPatterns) {
        const m = code.match(re);
        if (m) {
          violations.push(...m);
        }
      }
      const hasQuery = /\.query\(|\.execute\(|Model\.find/i.test(code);
      if (!hasQuery) {
        return { pass: true, note: "No SQL queries found, skipping" };
      }
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion:
          "Use parameterized queries: db.query('SELECT ... WHERE id = $1', [id]). Never concatenate user input into SQL strings.",
      };
    },
  },
  {
    id: "error-exposure",
    label: "No internal error details in responses",
    description: "Production error responses must not expose stack traces or internal error messages.",
    check: (code) => {
      const patterns = [
        /res\.(?:status|json|send)\(.*err\.stack/gi,
        /res\.(?:status|json|send)\(.*error\.stack/gi,
        /\.json\(\{\s*error:\s*err\.message/gi,
        /\.json\(\{\s*error:\s*e\.message/gi,
        /\.send\(err\.message\)/gi,
      ];
      const violations = [];
      for (const re of patterns) {
        const m = code.match(re);
        if (m) {
          violations.push(...m);
        }
      }
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion:
          "Return generic messages: res.status(500).json({ error: 'Internal server error' }). Log details server-side only.",
      };
    },
  },
  {
    id: "input-validation",
    label: "Input validation present",
    description: "Request body and params must be validated (Zod, Joi, class-validator).",
    check: (code) => {
      const hasInput = /req\.body|req\.params|req\.query|request\.body|@Body\(\)|@Param\(\)|@Query\(\)/i.test(code);
      if (!hasInput) {
        return { pass: true, note: "No request input detected, skipping" };
      }
      const hasValidation =
        /z\.(?:object|string|number|boolean)|\.parse\(|\.safeParse\(|Joi\.(?:object|string)|class-validator|@Validate|express-validator/i.test(
          code,
        );
      return {
        pass: hasValidation,
        failCount: hasValidation ? 0 : 1,
        detail: hasValidation ? [] : ["No input validation found"],
        suggestion: "Add input validation with Zod, Joi, or class-validator before processing request data.",
      };
    },
  },
  {
    id: "cors-explicit",
    label: "CORS configured with explicit origins",
    description: "CORS must not use wildcard origin (*). Specify explicit allowed origins.",
    check: (code) => {
      const hasCors = /cors\(\)|@fastify\/cors|app\.enableCors/i.test(code);
      if (!hasCors) {
        return { pass: true, note: "CORS not configured, skipping" };
      }
      const isCorsWildcard = /origin:\s*["']\*["']/gi.test(code);
      return {
        pass: !isCorsWildcard,
        failCount: isCorsWildcard ? 1 : 0,
        detail: isCorsWildcard ? ["Wildcard origin (*) found"] : [],
        suggestion: "Replace origin: '*' with an explicit allowlist of allowed origins.",
      };
    },
  },
  {
    id: "rate-limiting",
    label: "Rate limiting configured",
    description: "API endpoints should have rate limiting enabled.",
    check: (code) => {
      const isServer =
        /app\.(?:listen|get|post|put|delete|patch)/i.test(code) ||
        /createServer/i.test(code) ||
        /bootstrap\(\)/i.test(code);
      if (!isServer) {
        return { pass: true, note: "Not a server file, skipping" };
      }
      const hasRateLimit = /express-rate-limit|rateLimit\(|@fastify\/rate-limit|ThrottlerModule|@Throttle/i.test(code);
      return {
        pass: hasRateLimit,
        failCount: hasRateLimit ? 0 : 1,
        detail: hasRateLimit ? [] : ["No rate limiting detected"],
        suggestion:
          "Add rate limiting: express-rate-limit (Express), @fastify/rate-limit (Fastify), ThrottlerModule (NestJS).",
      };
    },
  },
  {
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
  },
];

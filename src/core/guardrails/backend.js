// Auto-split from src/core/guardrail-defs.js - see ./index.js
/** The backend guardrail family. */
export const BACKEND_GUARDRAILS = [
  {
    id: "sql-injection",
    label: "No SQL injection via string concatenation",
    description:
      "All SQL queries must use parameterized placeholders ($1, ?, :name). No string concatenation with user input.",
    check: (code) => {
      // Any receiver, not only one called `db`: this project's own naming rules
      // would call it `database` or `pool`, and a rule that misses those is a
      // rule that passes the code most likely to be written here.
      // The receiver is not part of the pattern - `.query(` is the anchor, so a
      // query on `database` or `pool` is caught as readily as one on `db`. Every
      // quantifier is bounded: an unbounded scan from every position in a long
      // line is the backtracking the 1.1 corpus exists to catch.
      const concatPatterns = [
        /\.(?:query|execute)\(["'](?:SELECT|INSERT|UPDATE|DELETE)[^"']{0,200}["'][\t ]{0,4}\+[\t ]{0,4}[\w.]{1,64}/gi,
        /\.(?:query|execute)\(`(?:SELECT|INSERT|UPDATE|DELETE)[^`]{0,200}\${/gi,
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
      // The receiver is whatever the handler called it: `res`, `response`, `reply`.
      // Same shape as sql-injection above: `.json(` is the anchor rather than the
      // name the handler gave its response, and the spans are bounded.
      const patterns = [
        /\.(?:status|json|send)\([^;\n]{0,200}\b(?:err|error|e)\.stack/gi,
        /\.json\(\{[\t ]{0,4}error:[\t ]{0,4}(?:err|error|e)\.message/gi,
        /\.send\((?:err|error|e)\.message\)/gi,
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
      // `cors(` with any arguments, not only the empty call: the wildcard is
      // almost always written as cors({ origin: "*" }), which the narrower
      // pattern skipped entirely.
      const hasCors = /cors\(|@fastify\/cors|app\.enableCors/i.test(code);

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

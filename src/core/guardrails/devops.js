// Auto-split from src/core/guardrail-defs.js - see ./index.js
export const DEVOPS_GUARDRAILS = [
  {
    id: "docker-non-root",
    label: "Container runs as non-root user",
    description: "Docker containers must switch to a non-root user.",
    check: (code) => {
      if (!/^FROM\s+/im.test(code)) {
        return { pass: true, note: "Not a Dockerfile, skipping" };
      }
      const hasUser = /^USER\s+(?!root\b)\w+/im.test(code);
      return {
        pass: hasUser,
        failCount: hasUser ? 0 : 1,
        detail: hasUser ? [] : ["No non-root USER instruction"],
        suggestion: "Add 'USER node' (or USER 1001) after installing dependencies.",
      };
    },
  },
  {
    id: "docker-healthcheck",
    label: "HEALTHCHECK defined",
    description: "Production images should include a HEALTHCHECK.",
    check: (code) => {
      if (!/^FROM\s+/im.test(code)) {
        return { pass: true, note: "Not a Dockerfile, skipping" };
      }
      const isOk = /^HEALTHCHECK\s+/im.test(code);
      return {
        pass: isOk,
        failCount: isOk ? 0 : 1,
        detail: isOk ? [] : ["No HEALTHCHECK found"],
        suggestion: "Add: HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1",
      };
    },
  },
  {
    id: "secret-detection",
    label: "No hardcoded secrets",
    description: "Passwords, API keys, and tokens must use environment variables.",
    check: (code) => {
      const secrets =
        code.match(/(?:password|passwd|secret|apiKey|api_key|token|api_secret)\s*[:=]\s*["'][^"']{8,}["']/gi) || [];
      const nonEnvironment = secrets.filter(
        (s) => !/process\.env/i.test(code.slice(Math.max(0, code.indexOf(s) - 80), code.indexOf(s))),
      );
      return {
        pass: nonEnvironment.length === 0,
        failCount: nonEnvironment.length,
        detail: nonEnvironment.slice(0, 3).map((s) => s.slice(0, 60)),
        suggestion: "Store secrets in environment variables: process.env.DB_PASSWORD. Never hardcode credentials.",
      };
    },
  },
  {
    id: "env-gitignore",
    label: ".env in .gitignore",
    description: ".env files must be in .gitignore to prevent committing secrets.",
    check: (code, context) => {
      if (!context?.fileName?.includes(".gitignore")) {
        return { pass: true, note: "Not .gitignore, skipping" };
      }
      const isOk = /\.env\b/.test(code);
      return {
        pass: isOk,
        failCount: isOk ? 0 : 1,
        detail: isOk ? [] : [".env not in .gitignore"],
        suggestion: "Add .env to .gitignore to prevent committing environment files.",
      };
    },
  },
];

/** Guardrail `secret-detection`: credentials come from the environment, not the source. */
export const secretDetection = {
  id: "secret-detection",
  label: "No hardcoded secrets",
  description: "Passwords, API keys, and tokens must use environment variables.",
  check: (code) => {
    const secrets = code.match(/(?:password|passwd|secret|apiKey|api_key|token|api_secret)\s*[:=]\s*["'][^"']{8,}["']/gi) || [];
    const nonEnvironment = secrets.filter((s) => !/process\.env/i.test(code.slice(Math.max(0, code.indexOf(s) - 80), code.indexOf(s))));

    return {
      pass: nonEnvironment.length === 0,
      failCount: nonEnvironment.length,
      detail: nonEnvironment.slice(0, 3).map((s) => s.slice(0, 60)),
      suggestion: "Store secrets in environment variables: process.env.DB_PASSWORD. Never hardcode credentials.",
    };
  },
};

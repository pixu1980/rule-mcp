/** Domain keyword tables consulted before framework bias is applied. */
const AI_KEYWORDS = ["agent", "agents", "llm", "assistant", "autonomous", "registry", "provider"];
const BACKEND_KEYWORDS = [
  "api",
  "backend",
  "server",
  "endpoint",
  "rest",
  "graphql",
  "express",
  "fastify",
  "nestjs",
  "hono",
  "rate",
  "limiting",
  "helmet",
  "cors",
  "auth",
  "jwt",
  "middleware",
];
const DATA_KEYWORDS = [
  "database",
  "sql",
  "query",
  "table",
  "postgresql",
  "mysql",
  "mongodb",
  "schema",
  "migration",
  "index",
  "transaction",
  "orm",
  "prisma",
  "drizzle",
];
const DEVOPS_KEYWORDS = ["docker", "ci", "cd", "pipeline", "deploy", "container", "kubernetes", "gitlab", "github", "actions"];
const FRONTEND_KEYWORDS = [
  "react",
  "vue",
  "svelte",
  "angular",
  "component",
  "button",
  "modal",
  "css",
  "style",
  "ui",
  "layout",
  "responsive",
];

/**
 * Classify the prompt's domain from keyword hits, or null when unknown.
 *
 * @param {string} promptLower
 * @returns {"git"|"ai"|"backend"|"data"|"devops"|null}
 */
export function classifyPromptDomain(promptLower) {
  // Git/commit signals: strong, unambiguous triggers for commit/push discipline.
  const hasCommitSignal = /(^|[^a-z])commit/.test(promptLower);
  const hasConventionalSignal = promptLower.includes("conventional");
  const hasPushSignal = /(^|[^a-z])push/.test(promptLower) && /(^|[^a-z])git/.test(promptLower);

  const g = (hasCommitSignal ? 1 : 0) + (hasConventionalSignal ? 1 : 0) + (hasPushSignal ? 1 : 0);
  const a = AI_KEYWORDS.filter((k) => promptLower.includes(k)).length;
  const b = BACKEND_KEYWORDS.filter((k) => promptLower.includes(k)).length;
  const d = DATA_KEYWORDS.filter((k) => promptLower.includes(k)).length;
  const o = DEVOPS_KEYWORDS.filter((k) => promptLower.includes(k)).length;
  const f = FRONTEND_KEYWORDS.filter((k) => promptLower.includes(k)).length;

  // Commit signals must outweigh other domains (e.g. "add a commit button" stays frontend).
  if (g >= 2 || g > f + b + d) {
    return "git";
  }

  if (a >= 2 || a > b + f + d) {
    return "ai";
  }

  if (b >= 2 || b > f + d) {
    return "backend";
  }

  if (d >= 2 || d > b + f) {
    return "data";
  }

  if (o >= 2) {
    return "devops";
  }

  return null; // unknown, use full scoring
}

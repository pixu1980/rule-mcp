/**
 * @module test/routing-corpus
 *
 * The prompts routing is measured against.
 *
 * Assembled from the spot checks run while adding skills across P3, P4 and P5,
 * plus the framework-bias cases already pinned in framework-routing.test.mjs.
 * They are real phrasings, including the awkward ones - that is the point. A
 * corpus of prompts written to pass measures nothing.
 *
 * `expect` is a substring of the skill name, so "javascript" accepts
 * rule-styleguide-javascript. `area` groups near misses: landing on a
 * sibling in the right area is a different failure from landing in devops.
 *
 * @see docs/plans/token-first-upgrade.md - Workstream L
 */

/** @type {Array<{ prompt: string, expect: string, area: string, note?: string }>} */
export const CORPUS = [
  // ── Frameworks: the historical cases ──
  { prompt: "I need a React button component", expect: "frontend-react", area: "frontend" },
  { prompt: "How do I create a React button component?", expect: "frontend-react", area: "frontend" },
  { prompt: "Vue 3 component with Composition API", expect: "frontend-vue", area: "frontend" },
  { prompt: "svelte store for shared state", expect: "frontend-svelte", area: "frontend" },
  { prompt: "angular standalone component with signals", expect: "frontend-angular", area: "frontend" },
  { prompt: "astro island that hydrates on visible", expect: "meta-astro", area: "frontend" },

  // ── TypeScript: the split added in P3 ──
  { prompt: "should I use enum or a union type", expect: "styleguide-typescript", area: "styleguide" },
  { prompt: "typescript any vs unknown in a catch block", expect: "styleguide-typescript", area: "styleguide" },
  { prompt: "tsconfig strict mode settings", expect: "styleguide-typescript", area: "styleguide" },

  // ── The mandatory document boilerplate ──
  { prompt: "html boilerplate for a new page", expect: "styleguide-html", area: "styleguide" },
  { prompt: "what goes in the head of a document", expect: "styleguide-html", area: "styleguide" },

  // ── Inflection in the name signal ──
  // "test" against the skill part "testing" was scoring half credit, so this
  // routed to rule-ai-prompting. A different inflection of a word is the same
  // word, and the name signal now says so.
  { prompt: "how do I test my code", expect: "devops-testing", area: "devops" },

  // ── Context and agent architecture: the two skills R4 added ──
  { prompt: "my agent session keeps getting worse the longer it runs", expect: "ai-context-engineering", area: "ai" },
  { prompt: "should I compact or start a fresh context", expect: "ai-context-engineering", area: "ai" },
  { prompt: "what is actually consuming my usage limit", expect: "ai-context-engineering", area: "ai" },
  { prompt: "how does a tool call work at the api boundary", expect: "ai-agent-architecture", area: "ai" },
  { prompt: "how granular should my mcp tools be", expect: "ai-agent-architecture", area: "ai" },
  { prompt: "agent loop or a graph for orchestration", expect: "ai-agent-architecture", area: "ai" },

  // ── Session boundaries (ADR 115): handoff/handon are tool+slash only ──
  // (`rule_tool_handoff` / `/rule-handoff`, `rule_tool_handon` / `/rule-handon`).
  // Compression is likewise tool-only (`rule_tool_compress` / `/rule-compress`).
  // No skill-route corpus rows: BM25 cannot target a removed skill.

  // ── Internationalization: the skill R0 added ──
  { prompt: "how do I format a date for a different locale", expect: "styleguide-i18n", area: "styleguide" },
  { prompt: "pluralization rules for translated strings", expect: "styleguide-i18n", area: "styleguide" },
  { prompt: "RTL layout for arabic", expect: "styleguide-i18n", area: "styleguide" },
  { prompt: "translation keys naming convention", expect: "styleguide-i18n", area: "styleguide" },

  // ── JavaScript ──
  { prompt: "why does my forEach with async not wait", expect: "styleguide-javascript", area: "styleguide" },
  { prompt: "what does await actually wait for", expect: "styleguide-javascript", area: "styleguide" },
  { prompt: "retry a failed request with backoff", expect: "styleguide-javascript", area: "styleguide" },

  // ── Backend ──
  { prompt: "my node api gets slow under load with promise.all", expect: "backend-node", area: "backend" },
  { prompt: "node process runs out of memory on file upload", expect: "backend-node", area: "backend" },
  { prompt: "jwt verification best practices", expect: "backend-security", area: "backend" },
  { prompt: "should logout revoke all sessions", expect: "backend-security", area: "backend" },
  { prompt: "idempotency key for payments endpoint", expect: "backend-node", area: "backend" },
  { prompt: "api error response format", expect: "backend-security", area: "backend" },
  { prompt: "express middleware for rate limiting", expect: "backend-express", area: "backend" },

  // ── Data ──
  { prompt: "sql query with LIKE wildcard is slow", expect: "data-sql", area: "data" },
  { prompt: "count query is slow on every page load", expect: "data-sql", area: "data" },
  { prompt: "postgres index for a slow query", expect: "data-postgresql", area: "data" },
  { prompt: "mongodb aggregation pipeline", expect: "data-mongodb", area: "data" },

  // ── Styleguide and platform ──
  { prompt: "fluid typography without media queries", expect: "styleguide-css", area: "styleguide" },
  { prompt: "aspect ratio for video thumbnails", expect: "styleguide-css", area: "styleguide" },
  { prompt: "intersection observer for lazy loading", expect: "platform-web", area: "platform" },
  { prompt: "native dialog modal instead of a library", expect: "platform-web", area: "platform" },
  { prompt: "semantic html landmarks for a page", expect: "styleguide-html", area: "styleguide" },
  { prompt: "accessibility guidelines a11y WCAG standards", expect: "styleguide-a11y", area: "styleguide" },

  // ── Process and AI: added in P2 and P4 ──
  { prompt: "should I extract this into a helper function", expect: "process-ai", area: "process" },
  // Compression is tool-only after ADR 115 (rule_tool_compress / /rule-compress), not a skill route.

  {
    prompt: "remove em dashes and use american english spelling",
    expect: "process-ai",
    area: "styleguide",
  },
  {
    prompt: "americanize the comments: color -> color, behavior -> behavior",
    expect: "process-ai",
    area: "styleguide",
  },
  {
    prompt: "my writing looks AI generated, fix the punctuation",
    expect: "process-ai",
    area: "styleguide",
  },
  { prompt: "how do I evaluate my llm feature", expect: "ai-evals", area: "ai" },
  { prompt: "llm as a judge prompt design", expect: "ai-evals", area: "ai" },
  { prompt: "error analysis on agent traces", expect: "ai-evals", area: "ai" },
  { prompt: "how should AI fit our development lifecycle", expect: "process-ai", area: "process" },
  { prompt: "plan before code and approval gates", expect: "process-ai", area: "process" },
  { prompt: "how do I write a better prompt for the agent", expect: "ai-prompting", area: "ai" },
  { prompt: "teaching a junior to use AI without losing skills", expect: "ai-prompting", area: "ai" },

  // ── R6: the retrieval, tracing and generated-test sections ──
  { prompt: "when is a vector database the wrong answer", expect: "ai-context-engineering", area: "ai" },
  { prompt: "embeddings or a code graph for retrieval", expect: "ai-context-engineering", area: "ai" },
  { prompt: "what should a generation span carry", expect: "devops-observability", area: "devops" },
  { prompt: "trace an agent and see where the tokens went", expect: "devops-observability", area: "devops" },
  { prompt: "should I let the model write our integration tests", expect: "ai-evals", area: "ai" },
  { prompt: "how should I review code I did not write", expect: "process-code-review", area: "process" },
  { prompt: "reviewing a generated pull request", expect: "process-code-review", area: "process" },
  { prompt: "the assistant keeps adding dependencies", expect: "process-code-review", area: "process" },
  { prompt: "why is writing code faster but delivering not", expect: "process-ai", area: "process" },
  { prompt: "ask for a design critique that is actually actionable", expect: "ui-design-system", area: "ui" },
  { prompt: "the generated screen has no empty or error state", expect: "ui-design-system", area: "ui" },
  { prompt: "how do I critique a generated interface", expect: "ui-design-system", area: "ui" },
  { prompt: "a stale response overwrote the newer one", expect: "styleguide-javascript", area: "styleguide" },
  { prompt: "do I still need lodash", expect: "styleguide-javascript", area: "styleguide" },
  {
    prompt: "lazy iterator helpers instead of chaining array methods",
    expect: "styleguide-javascript",
    area: "styleguide",
  },
  { prompt: "limit how many requests run at once", expect: "backend-node", area: "backend" },
  { prompt: "popover or dialog for a dropdown menu", expect: "styleguide-html", area: "styleguide" },
  { prompt: "accordion where only one panel is open", expect: "styleguide-html", area: "styleguide" },
  { prompt: "datalist for suggestions", expect: "styleguide-html", area: "styleguide" },
  { prompt: "why is a random uuid primary key slow at scale", expect: "data-sql", area: "data" },
  { prompt: "what do flaky tests cost us", expect: "devops-testing", area: "devops" },
  { prompt: "three ways to ignore a file in git", expect: "styleguide-git", area: "styleguide" },
  { prompt: "block a merge request when a rule is violated", expect: "devops-testing", area: "devops" },
  { prompt: "do we need a framework for this page at all", expect: "frontend", area: "frontend" },
  { prompt: "copy to clipboard without a helper library", expect: "platform-web", area: "platform" },

  // ── R8: the modern platform ──
  { prompt: "do I need a fallback for this", expect: "styleguide-baseline", area: "styleguide" },
  { prompt: "how do I declare our browser support floor", expect: "styleguide-baseline", area: "styleguide" },
  { prompt: "feature detection instead of browser sniffing", expect: "styleguide-baseline", area: "styleguide" },
  { prompt: "is this css feature safe to use yet", expect: "styleguide-baseline", area: "styleguide" },
  { prompt: "how should we generate the changelog", expect: "process-changelog", area: "process" },
  { prompt: "should the changelog be built in a git hook", expect: "process-changelog", area: "process" },
  { prompt: "our changelog has drifted from the commits", expect: "process-changelog", area: "process" },
  { prompt: "which commit types belong in a changelog", expect: "process-changelog", area: "process" },
  { prompt: "why does my layout overflow horizontally", expect: "styleguide-css", area: "styleguide" },
  { prompt: "breakpoints for mobile tablet desktop", expect: "styleguide-css", area: "styleguide" },

  // ── Toolchain and devops ──
  { prompt: "prettier or biome for formatting", expect: "toolchain", area: "toolchain" },
  { prompt: "write failing tests first", expect: "devops-testing", area: "devops" },
  { prompt: "multi-stage docker build for node", expect: "devops-docker", area: "devops" },
  { prompt: "conventional commit message with a scope", expect: "styleguide-git", area: "styleguide" },
  { prompt: "vite config for a library build", expect: "toolchain-vite", area: "toolchain" },
  { prompt: "should dependencies use a caret or an exact version", expect: "toolchain-pnpm", area: "toolchain" },
  { prompt: "do I need the packageManager field for corepack", expect: "toolchain-pnpm", area: "toolchain" },
];

/** Nonsense must stay uncertain. A scorer that always answers is worse than one that admits it. */
export const NONSENSE = ["zzzzz qqqqq wwwww xxxxx", "asdf jkl qwerty"];

/**
 * Persona phrasings, English and Italian (personas D.3).
 *
 * A persona request is not a skill request: "act as a security engineer and
 * audit this" wants the security role's lenses and its three documents, not the
 * backend-security skill on its own. The router has to name the role and point
 * at `rule_tool_plan`; which skill it also picks is a secondary matter.
 *
 * @type {Array<{ prompt: string, role: string }>}
 */
export const PERSONAS = [
  { prompt: "act as a security engineer and audit this project", role: "security" },
  { prompt: "agisci come un security engineer con 25 anni di esperienza e fai un audit", role: "security" },
  { prompt: "review this repo as an accessibility expert and plan the fixes", role: "a11y" },
  { prompt: "agisci come un esperto di accessibilita e proponi un piano", role: "a11y" },
  { prompt: "act as a software architect and plan the refactor", role: "architect" },
  { prompt: "agisci come un architetto software e proponi un piano", role: "architect" },
  { prompt: "as a privacy and compliance engineer, audit the telemetry", role: "privacy" },
  { prompt: "agisci come un esperto di privacy e verifica cosa finisce su disco", role: "privacy" },
  { prompt: "as a performance engineer, find what is slow and plan it", role: "performance" },
  { prompt: "agisci come un performance engineer e trova cosa e lento", role: "performance" },
  { prompt: "act as a documentation engineer and audit the docs", role: "docs" },
  { prompt: "agisci come un documentation engineer e controlla la documentazione", role: "docs" },
  { prompt: "act as an AI engineer and review the agent loop", role: "ai" },
  { prompt: "in the role of a security engineer, threat model the transports", role: "security" },
];

/**
 * Prompts that mention a role's subject without asking for the persona. Every
 * one of them has to route as ordinary work: a request for security headers is
 * not a request for a 25-year security engineer's audit.
 *
 * @type {string[]}
 */
export const NOT_PERSONAS = [
  "add security headers to the express app",
  "accessibility of this form: what is missing",
  "the architecture of the cache layer",
  "privacy policy page in astro",
  "performance of the react list, it re-renders",
  "documentation for this module",
  "ai agent with tool calling",
  "how do I make this component accessible",
];

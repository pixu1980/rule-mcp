

/**
 * @module prompts/defs
 *
 * The static prompt definitions and their help examples. Data file: exempt
 * from the size cap. Persona prompts are generated, not listed here.
 */

/** The static prompt definitions (name, description, argument schemas). */
export const PROMPT_DEFS = [
  {
    name: "rule-mcp-handoff",
    description:
      "Produce a compressed context handoff (ADR summary + git context) to resume in a new session, commiting pending work as scoped Conventional Commits first. Usage: /rule-mcp-handoff [options] or /rule-mcp-handoff help - no arguments = quick handoff",
    arguments: [
      {
        name: "options",
        description:
          "Space-separated tokens: handoff | close-session (default: handoff), compress | no-compress (default: compress), full | brief | minimal (default: full), no-diff, no-log, no-context, no-adrs, no-roadmap, no-archive, max=<n> (default: 0), or help. Empty = all defaults. Completed audits/reviews/plans are archived as ADRs by default; no-archive turns that off.",
        required: false,
      },
    ],
  },
  {
    name: "rule-mcp-handon",
    description: "Resume: verify the last handoff against the repository as it is now, archive what finished, and propose the next workstream",
    arguments: [
      {
        name: "options",
        description: "Space-separated: list, file=<path>, no-archive. Default: the newest handoff, swept and verified.",
        required: false,
      },
    ],
  },
  {
    name: "rule-mcp-git",
    description:
      "Audit the feature history and normalize it: Conventional Commit violations, merge commits, and (with --force) merge-commit removal - every rewrite behind a confirmation gate",
    arguments: [
      {
        name: "options",
        description: "Space-separated: --force (enable history-normalization proposals). Default: read-only audit.",
        required: false,
      },
    ],
  },
  {
    name: "rule-mcp-init",
    description: "Prepare a project end to end: git hooks, recorder directory, tokensave, dependency pins, then scaffold the missing config and toolchain",
    arguments: [
      {
        name: "options",
        description: "Space-separated: no-tokensave, no-scaffold. Default: the full init, plus scaffold for a project with no config yet.",
        required: false,
      },
    ],
  },
  {
    name: "rule-mcp-compress",
    description: "Run rule_tool_compress: sole engine for prompt/context preprocessing and prose postprocessing",
    arguments: [
      {
        name: "options",
        description: "Space-separated: both | compression | fingerprint (default: both). Pass text via the chat.",
        required: false,
      },
    ],
  },
  {
    name: "rule-mcp-stats",
    description: "Read local telemetry via rule_tool_stats: calls, cache hits, tokens, latency",
    arguments: [{ name: "options", description: "Reserved. Default: full readout.", required: false }],
  },
  {
    name: "rule-mcp-usage",
    description: "Declare a usage sidecar via rule_tool_usage when no transcript is available",
    arguments: [{ name: "options", description: "Reserved. Default: follow the tool schema in the reply.", required: false }],
  },
  {
    name: "rule-mcp-update",
    description: "Apply an available server update explicitly, and report what changed",
    arguments: [
      {
        name: "options",
        description: "Space-separated: check (report only). Default: apply the update.",
        required: false,
      },
    ],
  },
];

/**
 * Examples shown by the generic `/rule-mcp-* help` message, keyed by prompt name.
 */
export const PROMPT_EXAMPLES = {
  "rule-mcp-area-ai": ["/rule-mcp-area-ai help", "/rule-mcp-area-ai add a web-search tool to the agent"],
  "rule-mcp-area-backend": ["/rule-mcp-area-backend help", "/rule-mcp-area-backend express REST API with zod validation"],
  "rule-mcp-area-data": ["/rule-mcp-area-data help", "/rule-mcp-area-data postgresql schema for the users table"],
  "rule-mcp-area-devops": ["/rule-mcp-area-devops help", "/rule-mcp-area-devops multi-stage docker build for node"],
  "rule-mcp-area-frontend": ["/rule-mcp-area-frontend help", "/rule-mcp-area-frontend react login form with validation"],
  "rule-mcp-area-meta": ["/rule-mcp-area-meta help", "/rule-mcp-area-meta search for the a11y skill"],
  "rule-mcp-area-platform": ["/rule-mcp-area-platform help", "/rule-mcp-area-platform electron desktop app scaffold"],
  "rule-mcp-area-process": ["/rule-mcp-area-process help", "/rule-mcp-area-process run a code review on the pending changes"],
  "rule-mcp-area-skills": ["/rule-mcp-area-skills help", "/rule-mcp-area-skills find a skill for docker"],
  "rule-mcp-area-styleguide": ["/rule-mcp-area-styleguide help", "/rule-mcp-area-styleguide check this HTML for semantics"],
  "rule-mcp-area-toolchain": ["/rule-mcp-area-toolchain help", "/rule-mcp-area-toolchain set up vite + biome"],
  "rule-mcp-area-ui": ["/rule-mcp-area-ui help", "/rule-mcp-area-ui design-system button component"],
  "rule-mcp-handoff": ["/rule-mcp-handoff help", "/rule-mcp-handoff close-session"],
  "rule-mcp-git": ["/rule-mcp-git", "/rule-mcp-git --force"],
};

// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module prompts/defs
 *
 * The static prompt definitions and their help examples. Data file: exempt
 * from the size cap. Persona prompts are generated, not listed here.
 */

/** The static prompt definitions (name, description, argument schemas). */
export const PROMPT_DEFS = [
  {
    name: "pix-handoff",
    description:
      "Produce a compressed context handoff (ADR summary + git context) to resume in a new session, commiting pending work as scoped Conventional Commits first. Usage: /pix-handoff [options] or /pix-handoff help - no arguments = quick handoff",
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
    name: "pix-handon",
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
    name: "pix-git",
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
    name: "pix-init",
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
    name: "pix-compress",
    description: "Run pix_tool_compress: sole engine for prompt/context preprocessing and prose postprocessing",
    arguments: [
      {
        name: "options",
        description: "Space-separated: both | compression | fingerprint (default: both). Pass text via the chat.",
        required: false,
      },
    ],
  },
  {
    name: "pix-stats",
    description: "Read local telemetry via pix_tool_stats: calls, cache hits, tokens, latency",
    arguments: [{ name: "options", description: "Reserved. Default: full readout.", required: false }],
  },
  {
    name: "pix-usage",
    description: "Declare a usage sidecar via pix_tool_usage when no transcript is available",
    arguments: [{ name: "options", description: "Reserved. Default: follow the tool schema in the reply.", required: false }],
  },
  {
    name: "pix-update",
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
 * Examples shown by the generic `/pix-* help` message, keyed by prompt name.
 */
export const PROMPT_EXAMPLES = {
  "pix-area-ai": ["/pix-area-ai help", "/pix-area-ai add a web-search tool to the agent"],
  "pix-area-backend": ["/pix-area-backend help", "/pix-area-backend express REST API with zod validation"],
  "pix-area-data": ["/pix-area-data help", "/pix-area-data postgresql schema for the users table"],
  "pix-area-devops": ["/pix-area-devops help", "/pix-area-devops multi-stage docker build for node"],
  "pix-area-frontend": ["/pix-area-frontend help", "/pix-area-frontend react login form with validation"],
  "pix-area-meta": ["/pix-area-meta help", "/pix-area-meta search for the a11y skill"],
  "pix-area-platform": ["/pix-area-platform help", "/pix-area-platform electron desktop app scaffold"],
  "pix-area-process": ["/pix-area-process help", "/pix-area-process run a code review on the pending changes"],
  "pix-area-skills": ["/pix-area-skills help", "/pix-area-skills find a skill for docker"],
  "pix-area-styleguide": ["/pix-area-styleguide help", "/pix-area-styleguide check this HTML for semantics"],
  "pix-area-toolchain": ["/pix-area-toolchain help", "/pix-area-toolchain set up vite + biome"],
  "pix-area-ui": ["/pix-area-ui help", "/pix-area-ui design-system button component"],
  "pix-handoff": ["/pix-handoff help", "/pix-handoff close-session"],
  "pix-git": ["/pix-git", "/pix-git --force"],
};

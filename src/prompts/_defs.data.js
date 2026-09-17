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
    name: "pix-adr",
    description: "Record an architecture decision: context, decision, alternatives, consequences",
    arguments: [{ name: "decision", description: "The decision to record (free text: what changed and why)", required: true }],
  },
  {
    name: "pix-process-check",
    description: "Validate code against the pix guardrails and fix what fails",
    arguments: [
      {
        name: "target",
        description: "What to check (free text: paths, or the current diff). Default: the current diff.",
        required: false,
      },
    ],
  },
  {
    name: "pix-flight",
    description: "Read the flight recorder: what this server cost, and what to do about it",
    arguments: [
      {
        name: "options",
        description: "Space-separated: export, show <file>, prune, redact. Default: export.",
        required: false,
      },
    ],
  },
  {
    name: "pix-handon",
    description: "Resume: verify the last handoff against the repository as it is now",
    arguments: [
      {
        name: "options",
        description: "Space-separated: list, file=<path>. Default: the newest handoff.",
        required: false,
      },
    ],
  },
  {
    name: "pix-init",
    description: "Prepare a project for pix-galaxy-mcp: the central recorder directory and tokensave",
    arguments: [{ name: "options", description: "Space-separated: no-tokensave. Default: the full init.", required: false }],
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
  "pix-process-check": ["/pix-process-check help", "/pix-process-check the current diff"],
};

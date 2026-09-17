

/** Input schema of the handoff tool. */
import { z } from "zod/v4";

/** Input schema of the rule_tool_process_handoff tool. */
export const HandoffSchema = z.object({
  projectDir: z.string().optional().default(".").describe("Project root directory"),
  mode: z
    .enum(["handoff", "close-session"])
    .optional()
    .default("handoff")
    .describe("handoff: generate context summary. close-session: the same, with the session-close banner."),
  closeout: z
    .boolean()
    .optional()
    .default(true)
    .describe("Archive completed audits/reviews/plans into ADRs and repair the ADR numbering first (default on; false = read-only diagnosis, nothing written)"),
  includeContext: z.boolean().optional().default(true).describe("Include .context/ values"),
  includeAdrs: z.boolean().optional().default(true).describe("Include ADR summaries"),
  includeIdentity: z.boolean().optional().default(true).describe("Include project identity"),
  includeGitDiff: z.boolean().optional().default(true).describe("Include git working tree diff"),
  includeGitLog: z.boolean().optional().default(true).describe("Include recent git log"),
  includeRoadmap: z.boolean().optional().default(true).describe("Include roadmap/docs scan"),
  compress: z.boolean().optional().default(true).describe("Aggressively compress output (default: on)"),
  maxTokens: z.number().optional().default(0).describe("Target max tokens (0 = no limit)"),
  format: z.enum(["full", "brief", "minimal"]).optional().default("full").describe("Output detail level"),
});

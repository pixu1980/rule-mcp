/** Input schema of the ADR tool. */
import { z } from "zod/v4";

/** Input schema of the rule_tool_process_adr tool. */
export const ADRSchema = z.object({
  title: z.string().min(1).describe("ADR title, in English (e.g. 'Use PostgreSQL as the primary database')"),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"]).default("accepted").describe("ADR status"),
  context: z.string().optional().describe("Context: what forcing factors led to this decision"),
  decision: z.string().optional().describe("The decision made and why"),
  consequences: z.string().optional().describe("Consequences: positive and negative outcomes"),
  alternatives: z.array(z.string()).optional().describe("Alternative options considered"),
  tags: z
    .array(z.string())
    .default(["architecture"])
    .describe("Tags for categorization (e.g. database, api, frontend)"),
  projectDir: z.string().optional().default(".").describe("Project root directory"),
});

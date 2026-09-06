import { z } from "zod/v4";

/** Input schema of the rule routing tool. */
export const GalaxySchema = z.object({
  prompt: z.string().describe("User's question about frontend development"),
  framework: z
    .string()
    .optional()
    .describe("Optional framework hint (react, vue, svelte, angular, etc.) to bias routing"),
  path: z.string().optional().describe("Optional project path for auto-detecting framework"),
});

/** The rules rule-mcp-devops owns, in canonical order. */
import { environmentGitignore } from "./_env-gitignore.js";
import { secretDetection } from "./_secret-detection.js";

export const GUARDRAILS = [environmentGitignore, secretDetection];
